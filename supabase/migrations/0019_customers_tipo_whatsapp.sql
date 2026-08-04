-- ============================================================
-- Migration 0019 — ADITIVA: customers ganha tipo (PF/PJ) e whatsapp
-- Necessário para o cadastro rápido de cliente dentro do orçamento (paridade V6).
-- NÃO destrutiva. NÃO executar em produção. Rodar após 0001..0018.
-- Reversão: alter table customers drop column tipo; drop column whatsapp;
-- ============================================================
alter table customers add column if not exists tipo text default 'PF';   -- PF | PJ
alter table customers add column if not exists whatsapp text;
