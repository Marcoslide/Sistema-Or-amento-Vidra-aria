-- ============================================================
-- VidroGestor — Seed de STAGING (demo). Execute após schema.sql + rls.sql.
-- NÃO usar em produção com dados reais.
-- ============================================================

-- ---------- Catálogo de permissões (espelha o protótipo) ----------
insert into permissions(key,descricao) values
 ('vendas.proprias','Ver vendas próprias'),('vendas.loja','Ver vendas da loja'),('vendas.todas','Ver todas as vendas'),
 ('vendas.editar','Editar venda'),('vendas.cancelar','Cancelar venda'),('vendas.alterar_vendedor','Alterar vendedor'),('vendas.aprovar_desconto','Aprovar desconto'),
 ('fin.ver_valores','Ver valores'),('fin.ver_custos','Ver custos'),('fin.ver_margem','Ver margem'),
 ('fin.contas_pagar','Contas a pagar'),('fin.contas_receber','Contas a receber'),('fin.baixar','Baixar títulos'),('fin.estornar','Estornar'),('fin.caixa','Caixa'),
 ('prod.ver','Ver produção'),('prod.concluir','Concluir produção'),('obras.ver','Ver obras'),('obras.finalizar','Finalizar obra'),
 ('adm.usuarios','Gerenciar usuários'),('adm.config','Configurar regras'),('adm.multiloja','Visão multiloja'),
 ('fin.excluir_contas','Excluir contas'),('fin.excluir_operadoras','Excluir operadoras'),('cad.excluir_vendedores','Excluir vendedores'),
 ('fin.excluir_custos','Excluir custos'),('fin.excluir_mao_obra','Excluir mão de obra'),('fin.excluir_maquinas','Excluir máquinas'),
 ('fin.excluir_bens','Excluir bens'),('fin.excluir_centros_custo','Excluir centros de custo'),
 ('adm.excluir_lojas','Excluir lojas'),('adm.excluir_usuarios','Excluir usuários'),('adm.excluir_perfis','Excluir perfis')
on conflict (key) do nothing;

-- ---------- Organização + lojas demo (Conceito Glass) ----------
insert into organizations(id,nome,cnpj) values
 ('00000000-0000-0000-0000-000000000001','Conceito Glass','29.881.345/0001-83')
on conflict (id) do nothing;

insert into stores(id,organization_id,nome,tipo,cidade,uf,ativo) values
 ('00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-000000000001','Loja Mantiqueira','loja','Belo Horizonte','MG',true),
 ('00000000-0000-0000-0000-0000000000a2','00000000-0000-0000-0000-000000000001','Loja São João Batista','loja','São João Batista','MG',true),
 ('00000000-0000-0000-0000-0000000000a3','00000000-0000-0000-0000-000000000001','Loja Lagoa Santa','loja','Lagoa Santa','MG',true),
 ('00000000-0000-0000-0000-0000000000af','00000000-0000-0000-0000-000000000001','Fábrica / Produção','fabrica','Vespasiano','MG',true)
on conflict (id) do nothing;

-- ---------- Perfis (roles) + permissões ----------
insert into roles(id,organization_id,nome) values
 ('admin','00000000-0000-0000-0000-000000000001','Administrador geral'),
 ('gerente','00000000-0000-0000-0000-000000000001','Gerente'),
 ('vendedor','00000000-0000-0000-0000-000000000001','Vendedor'),
 ('financeiro','00000000-0000-0000-0000-000000000001','Financeiro')
on conflict do nothing;

-- admin: todas as permissões
insert into role_permissions(organization_id,role_id,permission_key)
 select '00000000-0000-0000-0000-000000000001','admin',key from permissions on conflict do nothing;
-- gerente
insert into role_permissions(organization_id,role_id,permission_key) values
 ('00000000-0000-0000-0000-000000000001','gerente','vendas.loja'),
 ('00000000-0000-0000-0000-000000000001','gerente','vendas.editar'),
 ('00000000-0000-0000-0000-000000000001','gerente','vendas.aprovar_desconto'),
 ('00000000-0000-0000-0000-000000000001','gerente','fin.ver_valores'),
 ('00000000-0000-0000-0000-000000000001','gerente','fin.ver_custos'),
 ('00000000-0000-0000-0000-000000000001','gerente','fin.ver_margem'),
 ('00000000-0000-0000-0000-000000000001','gerente','prod.ver'),('00000000-0000-0000-0000-000000000001','gerente','obras.ver')
on conflict do nothing;
-- vendedor (isolamento: só as próprias vendas)
insert into role_permissions(organization_id,role_id,permission_key) values
 ('00000000-0000-0000-0000-000000000001','vendedor','vendas.proprias'),
 ('00000000-0000-0000-0000-000000000001','vendedor','vendas.editar'),
 ('00000000-0000-0000-0000-000000000001','vendedor','fin.ver_valores'),
 ('00000000-0000-0000-0000-000000000001','vendedor','prod.ver')
on conflict do nothing;
-- financeiro
insert into role_permissions(organization_id,role_id,permission_key) values
 ('00000000-0000-0000-0000-000000000001','financeiro','fin.ver_valores'),
 ('00000000-0000-0000-0000-000000000001','financeiro','fin.contas_pagar'),
 ('00000000-0000-0000-0000-000000000001','financeiro','fin.contas_receber'),
 ('00000000-0000-0000-0000-000000000001','financeiro','fin.baixar'),
 ('00000000-0000-0000-0000-000000000001','financeiro','fin.estornar'),
 ('00000000-0000-0000-0000-000000000001','financeiro','fin.caixa')
on conflict do nothing;

-- ============================================================
-- USUÁRIOS DEMO: crie primeiro em Authentication → Users (Supabase),
-- depois rode este bloco trocando os e-mails pelos criados. Ex.:
--
-- update profiles set organization_id='00000000-0000-0000-0000-000000000001',
--   nome='Administrador', role_id='admin', status='ATIVO'
--   where id = (select id from auth.users where email='admin@conceitoglass.demo');
-- insert into user_stores(user_id,store_id)
--   select (select id from auth.users where email='admin@conceitoglass.demo'), id from stores
--   where organization_id='00000000-0000-0000-0000-000000000001'
--   on conflict do nothing;
--
-- Vendedor (isolamento): role_id='vendedor', vincular só à Loja Mantiqueira.
-- Gerente: role_id='gerente', vincular às lojas autorizadas.
-- ============================================================

-- gatilho: novo auth.user cria profile automaticamente (sem org até ser vinculado)
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  insert into profiles(id,email,nome) values (new.id,new.email,coalesce(new.raw_user_meta_data->>'nome',''))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();
