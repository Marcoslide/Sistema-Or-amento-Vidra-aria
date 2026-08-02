-- ============================================================
-- Migration 0005 — ADITIVA: campo Obra no orçamento/venda (paridade V6)
-- A V6 vincula uma "Obra" ao cliente dentro do orçamento. Adiciona colunas ao
-- registro de venda. NÃO destrutiva (apenas add column if not exists).
-- Reversão: alter table sales drop column obra_nome; drop column obra_endereco;
-- Rodar após 0001..0004. NÃO executar em produção.
-- ============================================================
alter table sales add column if not exists obra_nome text;
alter table sales add column if not exists obra_endereco text;
