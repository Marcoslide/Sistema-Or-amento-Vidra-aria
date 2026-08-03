-- ============================================================
-- Migration 0018 — Relacionamento real Contas a Pagar → Categorias financeiras
-- Adiciona payables.category_id (FK) mantendo a coluna legada `categoria` (texto).
-- Backfill: liga por correspondência de nome quando existir. NÃO apaga dados antigos.
-- Aditiva/idempotente. NÃO executar em produção. Rodar após 0007..0017.
-- ============================================================
alter table payables add column if not exists category_id uuid references financial_categories(id) on delete set null;
create index if not exists payables_category_idx on payables(category_id);

-- Backfill por nome (categoria legada -> financial_categories da mesma organização)
update payables p
   set category_id = fc.id
  from financial_categories fc
 where p.category_id is null
   and fc.organization_id = p.organization_id
   and lower(btrim(fc.nome)) = lower(btrim(p.categoria));
