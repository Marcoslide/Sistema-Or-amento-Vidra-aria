-- ============================================================
-- Migration 0009 — ADITIVA: módulo Agenda (paridade V6)
-- Visitas técnicas, instalações e eventos, com vínculo a venda/obra.
-- NÃO destrutiva. NÃO executar em produção.
-- Reversão: drop table agenda_eventos;
-- Rodar após 0001..0008.
-- ============================================================
create table if not exists agenda_eventos (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  store_id uuid references stores(id),
  tipo text not null default 'visita',        -- visita | instalacao | evento
  titulo text,
  profissional text,
  cliente_nome text,
  telefone text,
  endereco text,
  data date not null default current_date,
  hora text,
  status text not null default 'agendada',     -- agendada | concluida | reagendada | cancelada
  sale_id uuid references sales(id),
  obra_id uuid references obras(id),
  obs text,
  created_at timestamptz not null default now()
);
create index if not exists agenda_org_idx on agenda_eventos(organization_id);
create index if not exists agenda_store_idx on agenda_eventos(store_id);
create index if not exists agenda_data_idx on agenda_eventos(data);

alter table agenda_eventos enable row level security;
drop policy if exists agenda_scope on agenda_eventos;
create policy agenda_scope on agenda_eventos
  using (organization_id = app_org_id() and (store_id is null or store_id in (select app_store_ids())))
  with check (organization_id = app_org_id());
