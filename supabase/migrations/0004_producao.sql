-- ============================================================
-- Migration 0004 — PRODUÇÃO (App 5)
-- Ordens de produção, itens, etapas configuráveis, terceirizações e apontamentos.
-- RPCs: iniciar produção (idempotente, 1 OP por venda) e concluir (guarda de conclusão).
-- Rodar após 0001/0002/0003. Idempotente. NÃO executar em produção.
-- org/loja obrigatórios, sem fallback. RLS org+loja.
-- ============================================================

-- ---------- Ordem de produção ----------
create table if not exists production_orders (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  store_id uuid not null references stores(id),
  numero bigint,
  sale_id uuid references sales(id) on delete set null,
  cliente_nome text,
  responsavel text,
  prioridade text default 'normal',        -- baixa | normal | alta | urgente
  prazo date,
  status text not null default 'AGUARDANDO', -- AGUARDANDO | EM_PRODUCAO | CONCLUIDA
  obs text, origem text default 'venda',
  created_by uuid, created_at timestamptz not null default now(),
  concluida_at timestamptz,
  unique (sale_id)                          -- 1 OP por venda (anti-duplicação)
);
create index if not exists idx_po_org_store on production_orders(organization_id, store_id);
create index if not exists idx_po_status on production_orders(organization_id, status);

-- ---------- Itens da OP ----------
create table if not exists production_order_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  order_id uuid not null references production_orders(id) on delete cascade,
  product_id uuid references products(id),
  descricao text, quantidade numeric(12,3) default 1,
  largura numeric(12,3), altura numeric(12,3), unidade text default 'cm', regra text,
  vidro text, espelho text, acabamento text, imagem_url text, arquivo_url text,
  status text default 'PENDENTE', tempo_previsto_min integer default 0, tempo_realizado_min integer default 0,
  funcionario text
);
create index if not exists idx_poi_order on production_order_items(order_id);

-- ---------- Etapas configuráveis (instância por OP) ----------
create table if not exists production_stages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  order_id uuid not null references production_orders(id) on delete cascade,
  nome text not null, ordem integer default 0,
  aplicavel boolean not null default true,
  status text not null default 'PENDENTE',  -- PENDENTE | ANDAMENTO | CONCLUIDA
  updated_by uuid, updated_at timestamptz
);
create index if not exists idx_ps_order on production_stages(order_id);

-- ---------- Terceirizações ----------
create table if not exists production_outsourcing (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  order_id uuid not null references production_orders(id) on delete cascade,
  fornecedor text, servico text, data_envio date, previsao date,
  status text default 'ENVIADO', recebido boolean default false, conferido boolean default false,
  responsavel text, obs text,
  created_at timestamptz not null default now()
);
create index if not exists idx_pout_order on production_outsourcing(order_id);

-- ---------- Apontamentos ----------
create table if not exists production_time_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  order_id uuid not null references production_orders(id) on delete cascade,
  item_id uuid references production_order_items(id) on delete set null,
  etapa text, funcionario text, inicio timestamptz, fim timestamptz,
  duracao_min integer default 0, quantidade numeric(12,3) default 0, obs text,
  created_by uuid, created_at timestamptz not null default now()
);
create index if not exists idx_pte_order on production_time_entries(order_id);

-- histórico de status/etapa
create table if not exists production_status_history (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  order_id uuid not null references production_orders(id) on delete cascade,
  escopo text, alvo text, de text, para text, user_id uuid, created_at timestamptz not null default now()
);

-- ---------- Permissões de produção ----------
insert into permissions(key,descricao) values
 ('prod.iniciar','Iniciar produção'),('prod.apontar','Apontar produção'),
 ('prod.terceirizar','Gerenciar terceirizações'),('prod.conferir','Conferência'),('prod.expedir','Expedição')
on conflict (key) do nothing;

-- ---------- RLS (org + loja via a OP) ----------
alter table production_orders enable row level security;
drop policy if exists po_scope on production_orders;
create policy po_scope on production_orders
  using (organization_id = app_org_id() and store_id in (select app_store_ids()))
  with check (organization_id = app_org_id() and store_id in (select app_store_ids()));

do $$ declare t text; begin
  foreach t in array array['production_order_items','production_stages','production_outsourcing','production_time_entries','production_status_history']
  loop
    execute format('alter table %I enable row level security;', t);
    execute format('drop policy if exists %I on %I;', t||'_scope', t);
    execute format($f$create policy %I on %I
       using (exists (select 1 from production_orders o where o.id = order_id and o.organization_id = app_org_id() and o.store_id in (select app_store_ids())))
       with check (exists (select 1 from production_orders o where o.id = order_id and o.organization_id = app_org_id()));$f$, t||'_scope', t);
  end loop;
end $$;

-- ============================================================
-- RPC: iniciar produção a partir de uma venda — IDEMPOTENTE (1 OP por venda).
-- Cria a OP + etapas padrão + itens a partir dos itens da venda. Loja = loja da venda.
-- ============================================================
create or replace function fn_iniciar_producao(p_sale_id uuid, p_etapas text[] default null)
returns jsonb language plpgsql security invoker as $$
declare
  v_sale sales%rowtype; v_order_id uuid; v_num bigint; i int;
  v_etapas text[] := coalesce(p_etapas, array['separacao','corte','lapidacao','tempera','laminacao','furacao','pintura','esquadria','montagem','conferencia','embalagem','expedicao']);
  r record;
begin
  select * into v_sale from sales where id = p_sale_id for update;
  if not found then raise exception 'Venda não encontrada'; end if;
  -- idempotência: já existe OP para a venda -> retorna a existente
  select id into v_order_id from production_orders where sale_id = p_sale_id;
  if v_order_id is not null then
    return jsonb_build_object('ok', true, 'already', true, 'order_id', v_order_id);
  end if;
  if not v_sale.venda_gerada then raise exception 'Só é possível produzir venda confirmada'; end if;

  select coalesce(max(numero),1000)+1 into v_num from production_orders where organization_id = v_sale.organization_id and store_id = v_sale.store_id;
  insert into production_orders(organization_id, store_id, numero, sale_id, cliente_nome, status, origem, created_by)
    values (v_sale.organization_id, v_sale.store_id, v_num, p_sale_id, v_sale.cliente_nome, 'EM_PRODUCAO', 'venda', auth.uid())
    returning id into v_order_id;

  -- etapas padrão
  for i in 1 .. array_length(v_etapas,1) loop
    insert into production_stages(organization_id, order_id, nome, ordem) values (v_sale.organization_id, v_order_id, v_etapas[i], i);
  end loop;

  -- itens a partir dos itens da venda
  for r in
    select it.product_id, it.regra, m.l, m.a, m.q, m.unit
    from sale_items it join sale_environments e on e.id = it.environment_id
    left join lateral (select l, a, q, unit from sale_measures where item_id = it.id limit 1) m on true
    where e.sale_id = p_sale_id
  loop
    insert into production_order_items(organization_id, order_id, product_id, regra, largura, altura, unidade, quantidade)
      values (v_sale.organization_id, v_order_id, r.product_id, r.regra, r.l, r.a, coalesce(r.unit,'cm'), coalesce(r.q,1));
  end loop;

  update sales set status = 'PRODUCAO', situacao = 'PRODUCAO', updated_at = now() where id = p_sale_id;
  insert into production_status_history(organization_id, order_id, escopo, alvo, de, para, user_id)
    values (v_sale.organization_id, v_order_id, 'ordem', 'status', 'AGUARDANDO', 'EM_PRODUCAO', auth.uid());
  return jsonb_build_object('ok', true, 'order_id', v_order_id, 'numero', v_num);
end $$;

-- ============================================================
-- RPC: concluir produção — GUARDA DE CONCLUSÃO.
-- Só conclui se: nenhuma etapa aplicável pendente/andamento E toda terceirização recebida+conferida.
-- ============================================================
create or replace function fn_concluir_producao(p_order_id uuid)
returns jsonb language plpgsql security invoker as $$
declare v_org uuid; v_pend int; v_terc int;
begin
  select organization_id into v_org from production_orders where id = p_order_id for update;
  if v_org is null then raise exception 'OP não encontrada'; end if;
  select count(*) into v_pend from production_stages where order_id = p_order_id and aplicavel = true and status <> 'CONCLUIDA';
  if v_pend > 0 then raise exception 'Existem etapas pendentes ou em andamento (%).', v_pend; end if;
  select count(*) into v_terc from production_outsourcing where order_id = p_order_id and (recebido = false or conferido = false);
  if v_terc > 0 then raise exception 'Existem terceirizações não recebidas/conferidas (%).', v_terc; end if;

  update production_orders set status = 'CONCLUIDA', concluida_at = now() where id = p_order_id;
  insert into production_status_history(organization_id, order_id, escopo, alvo, de, para, user_id)
    values (v_org, p_order_id, 'ordem', 'status', 'EM_PRODUCAO', 'CONCLUIDA', auth.uid());
  update sales s set status = 'EXECUCAO', situacao = 'EXECUCAO', updated_at = now()
    from production_orders o where o.id = p_order_id and s.id = o.sale_id;
  return jsonb_build_object('ok', true, 'order_id', p_order_id);
end $$;
