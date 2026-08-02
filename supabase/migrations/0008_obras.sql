-- ============================================================
-- Migration 0008 — ADITIVA: módulo Obras (paridade V6)
-- Acompanhamento operacional de obras/instalações (sem valores financeiros na tela).
-- A venda continua visível em Vendas mesmo após virar obra.
-- NÃO destrutiva. NÃO executar em produção.
-- Reversão: drop table obra_diario; drop table obra_checklist; drop table obras;
-- Rodar após 0001..0007.
-- ============================================================
create table if not exists obras (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  store_id uuid references stores(id),
  customer_id uuid references customers(id),
  sale_id uuid references sales(id),
  nome text not null,
  endereco text,
  status text not null default 'aguardando',   -- aguardando | execucao | concluida
  responsavel text,
  progresso integer not null default 0,
  prazo date,
  created_at timestamptz not null default now()
);
create index if not exists obras_org_idx on obras(organization_id);
create index if not exists obras_store_idx on obras(store_id);
create index if not exists obras_sale_idx on obras(sale_id);

create table if not exists obra_checklist (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  obra_id uuid not null references obras(id) on delete cascade,
  texto text not null,
  feito boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists obra_check_obra_idx on obra_checklist(obra_id);

create table if not exists obra_diario (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  obra_id uuid not null references obras(id) on delete cascade,
  data date not null default current_date,
  texto text not null,
  foto_url text,
  created_at timestamptz not null default now()
);
create index if not exists obra_diario_obra_idx on obra_diario(obra_id);

-- RLS por organização + loja (espelha o padrão de supabase/rls.sql)
alter table obras enable row level security;
alter table obra_checklist enable row level security;
alter table obra_diario enable row level security;

drop policy if exists obras_scope on obras;
create policy obras_scope on obras
  using (organization_id = app_org_id() and (store_id is null or store_id in (select app_store_ids())))
  with check (organization_id = app_org_id());

drop policy if exists obra_check_scope on obra_checklist;
create policy obra_check_scope on obra_checklist
  using (organization_id = app_org_id()) with check (organization_id = app_org_id());

drop policy if exists obra_diario_scope on obra_diario;
create policy obra_diario_scope on obra_diario
  using (organization_id = app_org_id()) with check (organization_id = app_org_id());
