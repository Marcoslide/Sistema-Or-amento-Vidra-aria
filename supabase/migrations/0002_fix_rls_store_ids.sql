-- ============================================================
-- Migration 0002 — CORRETIVA: app_store_ids()
-- Causa raiz do erro "more than one row returned by a subquery used as an expression"
-- ao salvar orçamento: a versão anterior usava subquery ESCALAR dentro de um CASE
-- (`then (select id from stores ...)`), que retorna várias linhas quando a org tem
-- mais de uma loja — exatamente o caso do staging (2 lojas) com admin/vendas.todas.
--
-- Correção: retornar um CONJUNTO (setof) via UNION. `create or replace` é idempotente
-- e não destrói dados. Rodar no Supabase de staging APÓS schema/rls/0001.
-- NÃO executar em produção.
-- ============================================================
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
