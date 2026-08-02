-- ============================================================
-- Migration 0007 — ADITIVA: categorias financeiras (paridade V6)
-- Catálogo de categorias de receita/despesa por organização, usado no
-- Contas a Pagar/Receber. NÃO destrutiva. NÃO executar em produção.
-- Reversão: drop table financial_categories;
-- Rodar após 0001..0006.
-- ============================================================
create table if not exists financial_categories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  nome text not null,
  tipo text not null default 'despesa',   -- 'receita' | 'despesa'
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists fin_cat_org_idx on financial_categories(organization_id);

alter table financial_categories enable row level security;
drop policy if exists fin_cat_org on financial_categories;
create policy fin_cat_org on financial_categories
  using (organization_id = app_org_id())
  with check (organization_id = app_org_id());

-- Permissão de exclusão definitiva (admin já tem todas). Catálogo global de permissões.
insert into permissions(key,descricao) values ('fin.excluir_categorias','Excluir categorias financeiras')
on conflict (key) do nothing;
