-- ============================================================
-- Migration 0011 — ADITIVA: coluna obs em card_operators e financial_accounts
-- O frontend (cadastros de Operadoras e Contas financeiras) grava/edita "Observações".
-- Corrige os erros: column card_operators.obs does not exist / financial_accounts.obs does not exist.
-- NÃO destrutiva. NÃO executar em produção.
-- Reversão: alter table card_operators drop column obs; alter table financial_accounts drop column obs;
-- Rodar após 0001..0010.
-- ============================================================
alter table card_operators add column if not exists obs text;
alter table financial_accounts add column if not exists obs text;
