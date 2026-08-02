-- ============================================================
-- VidroGestor — RLS (Row Level Security): isolamento por empresa/loja/vendedor
-- Execute após schema.sql. Requer Supabase Auth (auth.uid()).
-- ============================================================

-- ---------- Helpers (SECURITY DEFINER para ler profiles/user_stores sem recursão) ----------
create or replace function app_org_id() returns uuid
language sql stable security definer set search_path=public as $$
  select organization_id from profiles where id = auth.uid();
$$;

create or replace function app_has_perm(perm text) returns boolean
language sql stable security definer set search_path=public as $$
  select exists (
    select 1 from profiles p
    join role_permissions rp on rp.organization_id = p.organization_id and rp.role_id = p.role_id
    where p.id = auth.uid() and rp.permission_key = perm
  );
$$;

-- lojas que o usuário enxerga: todas da org se multiloja/vendas.todas, senão as vinculadas.
-- IMPORTANTE: retornar um CONJUNTO (setof) via UNION — nunca subquery escalar dentro de CASE,
-- que quebra com "more than one row returned by a subquery" quando a org tem várias lojas.
create or replace function app_store_ids() returns setof uuid
language sql stable security definer set search_path=public as $$
  select id from stores
    where organization_id = app_org_id()
      and (app_has_perm('adm.multiloja') or app_has_perm('vendas.todas'))
  union
  select store_id from user_stores
    where user_id = auth.uid()
      and not (app_has_perm('adm.multiloja') or app_has_perm('vendas.todas'));
$$;

-- vendedor "restrito": vê só as próprias vendas (tem vendas.proprias e NÃO tem loja/todas)
create or replace function app_seller_only() returns boolean
language sql stable security definer set search_path=public as $$
  select app_has_perm('vendas.proprias')
     and not app_has_perm('vendas.loja')
     and not app_has_perm('vendas.todas');
$$;

create or replace function app_seller_id() returns uuid
language sql stable security definer set search_path=public as $$
  select seller_id from profiles where id = auth.uid();
$$;

-- ---------- Habilita RLS ----------
do $$ declare t text; begin
  foreach t in array array[
   'organizations','stores','roles','role_permissions','profiles','user_stores',
   'sellers','product_families','suppliers','customers','products','financial_accounts','card_operators',
   'sales','sale_environments','sale_items','sale_measures',
   'receivables','receivable_payments','payables','payable_payments','cash_movements','audit_log']
  loop execute format('alter table %I enable row level security;', t); end loop;
end $$;

-- ---------- Política padrão por organização ----------
-- Tabelas com organization_id: leitura/escrita apenas dentro da própria organização.
do $$ declare t text; begin
  foreach t in array array[
   'sellers','product_families','suppliers','products','financial_accounts','card_operators',
   'receivables','receivable_payments','payables','payable_payments','cash_movements','audit_log']
  loop
    execute format('drop policy if exists org_all on %I;', t);
    execute format($f$create policy org_all on %I
       using (organization_id = app_org_id())
       with check (organization_id = app_org_id());$f$, t);
  end loop;
end $$;

-- ---------- organizations / profiles / stores / roles ----------
drop policy if exists org_self on organizations;
create policy org_self on organizations using (id = app_org_id());

drop policy if exists prof_self_org on profiles;
create policy prof_self_org on profiles
  using (organization_id = app_org_id())
  with check (organization_id = app_org_id());

drop policy if exists stores_org on stores;
create policy stores_org on stores
  using (organization_id = app_org_id())
  with check (organization_id = app_org_id());

drop policy if exists roles_org on roles;
create policy roles_org on roles using (organization_id = app_org_id()) with check (organization_id = app_org_id());
drop policy if exists rp_org on role_permissions;
create policy rp_org on role_permissions using (organization_id = app_org_id()) with check (organization_id = app_org_id());
drop policy if exists us_org on user_stores;
create policy us_org on user_stores
  using (exists (select 1 from profiles p where p.id = user_id and p.organization_id = app_org_id()))
  with check (exists (select 1 from profiles p where p.id = user_id and p.organization_id = app_org_id()));

-- permissions é catálogo global (somente leitura autenticada)
drop policy if exists perms_read on permissions;
create policy perms_read on permissions for select using (auth.role() = 'authenticated');

-- ---------- Cadastro com store (customers) ----------
drop policy if exists cust_scope on customers;
create policy cust_scope on customers
  using (organization_id = app_org_id() and (store_id is null or store_id in (select app_store_ids())))
  with check (organization_id = app_org_id() and (store_id is null or store_id in (select app_store_ids())));

-- ---------- Comercial: loja + isolamento por vendedor ----------
drop policy if exists sales_scope on sales;
create policy sales_scope on sales
  using (
    organization_id = app_org_id()
    and store_id in (select app_store_ids())
    and (not app_seller_only() or seller_id = app_seller_id() or created_by = auth.uid())
  )
  with check (
    organization_id = app_org_id()
    and store_id in (select app_store_ids())
  );

-- filhos de sale herdam via join
drop policy if exists senv_scope on sale_environments;
create policy senv_scope on sale_environments
  using (exists (select 1 from sales s where s.id = sale_id and s.organization_id = app_org_id() and s.store_id in (select app_store_ids())))
  with check (exists (select 1 from sales s where s.id = sale_id and s.organization_id = app_org_id()));
drop policy if exists sitem_scope on sale_items;
create policy sitem_scope on sale_items
  using (exists (select 1 from sales s where s.id = sale_id and s.organization_id = app_org_id() and s.store_id in (select app_store_ids())))
  with check (exists (select 1 from sales s where s.id = sale_id and s.organization_id = app_org_id()));
drop policy if exists smeas_scope on sale_measures;
create policy smeas_scope on sale_measures
  using (exists (select 1 from sale_items i join sales s on s.id=i.sale_id where i.id = item_id and s.organization_id = app_org_id()))
  with check (exists (select 1 from sale_items i join sales s on s.id=i.sale_id where i.id = item_id and s.organization_id = app_org_id()));

-- ---------- Financeiro store-scoped (reforça store além da org) ----------
do $$ declare t text; begin
  foreach t in array array['receivables','receivable_payments','payables','payable_payments','cash_movements']
  loop
    execute format('drop policy if exists %I on %I;', t||'_store', t);
    execute format($f$create policy %I on %I
       using (organization_id = app_org_id() and store_id in (select app_store_ids()))
       with check (organization_id = app_org_id() and store_id in (select app_store_ids()));$f$, t||'_store', t);
    execute format('drop policy if exists org_all on %I;', t); -- substituída pela store-scoped
  end loop;
end $$;

-- Observações:
--  * Exclusão física deve ser validada na aplicação (vínculos) antes do DELETE;
--    o RLS garante que ninguém apague/edite fora da própria organização/loja.
--  * Recebimentos/pagamentos usam idempotency_key único (anti clique-duplo).
--  * cash_movements.store_id é NOT NULL — nunca "cai" em loja padrão.
