-- ============================================================
-- Migration 0010 — ADITIVA: módulo Reclamações / pós-venda (paridade V6)
-- Registro e acompanhamento de reclamações com histórico de status.
-- NÃO destrutiva. NÃO executar em produção.
-- Reversão: drop table reclamacao_historico; drop table reclamacoes;
-- Rodar após 0001..0009.
-- ============================================================
create table if not exists reclamacoes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  store_id uuid references stores(id),
  sale_id uuid references sales(id),
  obra_id uuid references obras(id),
  cliente_nome text,
  motivo text not null,
  descricao text,
  prioridade text not null default 'media',   -- baixa | media | alta
  responsavel text,
  status text not null default 'pendente',    -- pendente | em_atendimento | aguardando_cliente | aguardando_material | aguardando_visita | resolvida | reaberta
  custo numeric(14,2) not null default 0,
  reaberta boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists recl_org_idx on reclamacoes(organization_id);
create index if not exists recl_store_idx on reclamacoes(store_id);

create table if not exists reclamacao_historico (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  reclamacao_id uuid not null references reclamacoes(id) on delete cascade,
  de text,
  para text,
  obs text,
  created_at timestamptz not null default now()
);
create index if not exists recl_hist_idx on reclamacao_historico(reclamacao_id);

alter table reclamacoes enable row level security;
alter table reclamacao_historico enable row level security;

drop policy if exists recl_scope on reclamacoes;
create policy recl_scope on reclamacoes
  using (organization_id = app_org_id() and (store_id is null or store_id in (select app_store_ids())))
  with check (organization_id = app_org_id());

drop policy if exists recl_hist_scope on reclamacao_historico;
create policy recl_hist_scope on reclamacao_historico
  using (organization_id = app_org_id()) with check (organization_id = app_org_id());
