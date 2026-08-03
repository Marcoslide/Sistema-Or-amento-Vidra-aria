-- ============================================================
-- Migration 0016 — Permissões de Produção operáveis pela interface (paridade V6)
--
-- Problema: as ações de produção checam prod.iniciar/apontar/terceirizar/conferir,
-- mas se o seed foi aplicado ANTES da 0004 (que criou essas keys), o perfil admin
-- ficou sem elas → "Sem permissão" ao avançar etapas.
--
-- Solução (idempotente, self-healing, aditiva — NÃO remove/sobrescreve nada):
--  1) garante o catálogo de permissões de produção;
--  2) RESSINCRONIZA o admin com TODAS as permissões existentes;
--  3) concede as operacionais de produção a Gerente e ao perfil Produção;
--  4) cria o perfil "producao" por organização, se não existir.
-- NÃO executar em produção. Rodar após 0004..0015.
-- ============================================================

-- 1) Catálogo de permissões de produção (idempotente)
insert into permissions(key, descricao) values
  ('prod.ver','Ver produção'),
  ('prod.iniciar','Iniciar produção'),
  ('prod.apontar','Apontar/avançar etapas'),
  ('prod.terceirizar','Gerenciar terceirizações'),
  ('prod.conferir','Conferir terceirizações'),
  ('prod.concluir','Concluir produção')
on conflict (key) do nothing;

-- 2) Admin recebe TODAS as permissões (preenche lacunas de qualquer ordem de aplicação)
insert into role_permissions(organization_id, role_id, permission_key)
  select r.organization_id, r.id, p.key
  from roles r cross join permissions p
  where r.id = 'admin'
on conflict do nothing;

-- 3) Gerente: opera produção (conforme V6)
insert into role_permissions(organization_id, role_id, permission_key)
  select r.organization_id, 'gerente', k.key
  from roles r
  cross join (values ('prod.ver'),('prod.iniciar'),('prod.apontar'),('prod.terceirizar'),('prod.conferir'),('prod.concluir')) as k(key)
  where r.id = 'gerente'
on conflict do nothing;

-- 4) Perfil "producao" por organização (cria se não existir) + concede operação de produção
insert into roles(id, organization_id, nome)
  select 'producao', o.id, 'Produção' from organizations o
on conflict do nothing;

insert into role_permissions(organization_id, role_id, permission_key)
  select o.id, 'producao', k.key
  from organizations o
  cross join (values ('prod.ver'),('prod.iniciar'),('prod.apontar'),('prod.terceirizar'),('prod.conferir'),('prod.concluir')) as k(key)
on conflict do nothing;
