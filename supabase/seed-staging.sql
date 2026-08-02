-- ============================================================
-- VidroGestor — SEED EXCLUSIVO DE STAGING (homologação)
-- Autossuficiente: rode APÓS schema.sql + rls.sql + migrations/0001_commercial.sql.
-- Idempotente (on conflict do nothing). NÃO usar em produção / com dados reais.
--
-- Conteúdo (pedido de homologação):
--   1 organização · 2 lojas · perfis admin/gerente/vendedor/financeiro (+permissões)
--   1 vendedor · famílias · 1 produto comum · 1 produto regra MOLDURA
--   1 conta financeira · 1 operadora · gatilho de novo usuário
--   Usuários (admin/gerente/vendedor/financeiro): criar no Auth e vincular no fim.
-- ============================================================

-- ---------- Catálogo de permissões (global) ----------
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
 ('adm.excluir_lojas','Excluir lojas'),('adm.excluir_usuarios','Excluir usuários'),('adm.excluir_perfis','Excluir perfis'),
 ('cad.excluir_clientes','Excluir clientes'),('cad.excluir_produtos','Excluir produtos'),
 ('cad.excluir_fornecedores','Excluir fornecedores'),('cad.excluir_familias','Excluir famílias')
on conflict (key) do nothing;

-- ---------- Organização ----------
insert into organizations(id,nome,cnpj) values
 ('00000000-0000-0000-0000-000000000001','Conceito Glass (Staging)','29.881.345/0001-83')
on conflict (id) do nothing;

-- ---------- 2 lojas (uma comercial + uma p/ testar isolamento) ----------
insert into stores(id,organization_id,nome,tipo,cnpj,cidade,uf,resp,ativo) values
 ('00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-000000000001','Loja Mantiqueira','loja','29.881.345/0001-83','Belo Horizonte','MG','Administrador',true),
 ('00000000-0000-0000-0000-0000000000a2','00000000-0000-0000-0000-000000000001','Loja Lagoa Santa','loja','29.881.345/0002-64','Lagoa Santa','MG','Gerente',true)
on conflict (id) do nothing;

-- ---------- Perfis (roles) ----------
insert into roles(id,organization_id,nome) values
 ('admin','00000000-0000-0000-0000-000000000001','Administrador geral'),
 ('gerente','00000000-0000-0000-0000-000000000001','Gerente'),
 ('vendedor','00000000-0000-0000-0000-000000000001','Vendedor'),
 ('financeiro','00000000-0000-0000-0000-000000000001','Financeiro')
on conflict do nothing;

-- admin: todas as permissões
insert into role_permissions(organization_id,role_id,permission_key)
 select '00000000-0000-0000-0000-000000000001','admin',key from permissions on conflict do nothing;
-- gerente: vê a loja, edita, aprova desconto, custos/margem, produção/obras
insert into role_permissions(organization_id,role_id,permission_key) values
 ('00000000-0000-0000-0000-000000000001','gerente','vendas.loja'),
 ('00000000-0000-0000-0000-000000000001','gerente','vendas.editar'),
 ('00000000-0000-0000-0000-000000000001','gerente','vendas.aprovar_desconto'),
 ('00000000-0000-0000-0000-000000000001','gerente','fin.ver_valores'),
 ('00000000-0000-0000-0000-000000000001','gerente','fin.ver_custos'),
 ('00000000-0000-0000-0000-000000000001','gerente','fin.ver_margem'),
 ('00000000-0000-0000-0000-000000000001','gerente','prod.ver'),('00000000-0000-0000-0000-000000000001','gerente','obras.ver')
on conflict do nothing;
-- vendedor: SÓ as próprias vendas (isolamento por vendedor)
insert into role_permissions(organization_id,role_id,permission_key) values
 ('00000000-0000-0000-0000-000000000001','vendedor','vendas.proprias'),
 ('00000000-0000-0000-0000-000000000001','vendedor','vendas.editar'),
 ('00000000-0000-0000-0000-000000000001','vendedor','fin.ver_valores'),
 ('00000000-0000-0000-0000-000000000001','vendedor','prod.ver')
on conflict do nothing;
-- financeiro (App 4)
insert into permissions(key,descricao) values
 ('fin.centro_custos','Centro de custos'),('fin.ponto_equilibrio','Ponto de equilíbrio'),('fin.custos_venda','Custos por venda')
on conflict (key) do nothing;
insert into role_permissions(organization_id,role_id,permission_key) values
 ('00000000-0000-0000-0000-000000000001','financeiro','fin.ver_valores'),
 ('00000000-0000-0000-0000-000000000001','financeiro','fin.ver_custos'),
 ('00000000-0000-0000-0000-000000000001','financeiro','fin.ver_margem'),
 ('00000000-0000-0000-0000-000000000001','financeiro','fin.contas_pagar'),
 ('00000000-0000-0000-0000-000000000001','financeiro','fin.contas_receber'),
 ('00000000-0000-0000-0000-000000000001','financeiro','fin.baixar'),
 ('00000000-0000-0000-0000-000000000001','financeiro','fin.estornar'),
 ('00000000-0000-0000-0000-000000000001','financeiro','fin.caixa'),
 ('00000000-0000-0000-0000-000000000001','financeiro','fin.centro_custos'),
 ('00000000-0000-0000-0000-000000000001','financeiro','fin.ponto_equilibrio'),
 ('00000000-0000-0000-0000-000000000001','financeiro','fin.custos_venda')
on conflict do nothing;
-- produção (App 5)
insert into permissions(key,descricao) values
 ('prod.iniciar','Iniciar produção'),('prod.apontar','Apontar produção'),
 ('prod.terceirizar','Gerenciar terceirizações'),('prod.conferir','Conferência'),('prod.expedir','Expedição')
on conflict (key) do nothing;
insert into roles(id,organization_id,nome) values
 ('producao','00000000-0000-0000-0000-000000000001','Produção')
on conflict do nothing;
-- perfil produção: chão de fábrica, SEM valores financeiros
insert into role_permissions(organization_id,role_id,permission_key) values
 ('00000000-0000-0000-0000-000000000001','producao','prod.ver'),
 ('00000000-0000-0000-0000-000000000001','producao','prod.iniciar'),
 ('00000000-0000-0000-0000-000000000001','producao','prod.apontar'),
 ('00000000-0000-0000-0000-000000000001','producao','prod.terceirizar'),
 ('00000000-0000-0000-0000-000000000001','producao','prod.conferir'),
 ('00000000-0000-0000-0000-000000000001','producao','prod.concluir')
on conflict do nothing;
-- gerente também acompanha e conclui produção
insert into role_permissions(organization_id,role_id,permission_key) values
 ('00000000-0000-0000-0000-000000000001','gerente','prod.iniciar'),
 ('00000000-0000-0000-0000-000000000001','gerente','prod.apontar'),
 ('00000000-0000-0000-0000-000000000001','gerente','prod.terceirizar'),
 ('00000000-0000-0000-0000-000000000001','gerente','prod.conferir'),
 ('00000000-0000-0000-0000-000000000001','gerente','prod.concluir')
on conflict do nothing;
-- admin recebe as permissões novas também (idempotente)
insert into role_permissions(organization_id,role_id,permission_key)
 select '00000000-0000-0000-0000-000000000001','admin',key from permissions on conflict do nothing;

-- ---------- Vendedor (para "vendedor automático" e isolamento) ----------
insert into sellers(id,organization_id,nome,email,tel,desc_max,meta,comissao,ativo) values
 ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-000000000001','Vendedor Staging','vendedor@conceitoglass.demo','(31) 90000-0001',10,20000,3,true)
on conflict (id) do nothing;

-- ---------- Fornecedor ----------
insert into suppliers(id,organization_id,nome,razao,doc,categoria,ativo) values
 ('00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-000000000001','Vidros MG Ltda','Vidros MG Comércio Ltda','11.222.333/0001-44','Vidros',true)
on conflict (id) do nothing;

-- ---------- Famílias (uma comum + uma MOLDURA) ----------
insert into product_families(id,organization_id,nome,codigo,regra,unidade,multiplicador_padrao,ativo) values
 ('00000000-0000-0000-0000-0000000000d1','00000000-0000-0000-0000-000000000001','Vidro Temperado','VT','M2','m2',8,true),
 ('00000000-0000-0000-0000-0000000000d2','00000000-0000-0000-0000-000000000001','Molduras','MOL','MOLDURA','m',8,true)
on conflict (id) do nothing;

-- ---------- Produtos ----------
-- comum (regra M2)
insert into products(id,organization_id,descricao,codigo,familia,fornecedor,regra,preco,custo_base,ativo) values
 ('00000000-0000-0000-0000-0000000000e1','00000000-0000-0000-0000-000000000001','Vidro Temperado Incolor 8mm','VT-8','Vidro Temperado','Vidros MG Ltda','M2',420.00,190.00,true)
on conflict (id) do nothing;
-- MOLDURA (largura de perfil 5 cm × multiplicador 8 → 40×60 = 2,40 m)
insert into products(id,organization_id,descricao,codigo,familia,fornecedor,regra,preco,custo_base,largura_moldura_cm,multiplicador_corte,ativo) values
 ('00000000-0000-0000-0000-0000000000e2','00000000-0000-0000-0000-000000000001','Moldura Alumínio Perfil 5cm','MOL-5','Molduras','Vidros MG Ltda','MOLDURA',30.00,10.00,5,8,true)
on conflict (id) do nothing;

-- ---------- Conta financeira ----------
insert into financial_accounts(id,organization_id,store_id,nome,tipo,banco,saldo_inicial,aceita_entrada,aceita_saida,padrao,ativo) values
 ('00000000-0000-0000-0000-0000000000f1','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000a1','Caixa Loja Mantiqueira','caixa',null,0,true,true,true,true)
on conflict (id) do nothing;

-- ---------- Operadora de cartão ----------
insert into card_operators(id,organization_id,store_id,nome,conta,tipo,bandeiras,prazo,parcelas,ativo) values
 ('00000000-0000-0000-0000-000000000f02','00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000a1','Cielo','Caixa Loja Mantiqueira','ambos','Visa, Master','30',
  '[{"parcelas":1,"taxa":2.5},{"parcelas":2,"taxa":3.8}]'::jsonb,true)
on conflict (id) do nothing;

-- ---------- Gatilho: novo auth.user cria profile automaticamente ----------
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

-- ============================================================
-- VÍNCULO DOS USUÁRIOS DE TESTE
-- 1) Em Authentication → Users, crie (senha à sua escolha, sem "confirmar e-mail"):
--      admin@conceitoglass.demo · gerente@conceitoglass.demo
--      vendedor@conceitoglass.demo · financeiro@conceitoglass.demo
-- 2) Rode o bloco abaixo (idempotente) para vincular org/perfil/lojas.
--    O vendedor é ligado ao seller (b1) e SÓ à Loja Mantiqueira (isolamento).
-- ============================================================
do $$
declare
  v_org uuid := '00000000-0000-0000-0000-000000000001';
  v_a1  uuid := '00000000-0000-0000-0000-0000000000a1'; -- Mantiqueira
  v_a2  uuid := '00000000-0000-0000-0000-0000000000a2'; -- Lagoa Santa
  v_sel uuid := '00000000-0000-0000-0000-0000000000b1';
  uid uuid;
begin
  -- ADMIN — todas as lojas
  select id into uid from auth.users where email='admin@conceitoglass.demo';
  if uid is not null then
    update profiles set organization_id=v_org, nome='Administrador', role_id='admin', status='ATIVO' where id=uid;
    insert into user_stores(user_id,store_id) select uid, id from stores where organization_id=v_org on conflict do nothing;
  end if;

  -- GERENTE — as duas lojas (vê as lojas autorizadas)
  select id into uid from auth.users where email='gerente@conceitoglass.demo';
  if uid is not null then
    update profiles set organization_id=v_org, nome='Gerente', role_id='gerente', status='ATIVO' where id=uid;
    insert into user_stores(user_id,store_id) values (uid,v_a1),(uid,v_a2) on conflict do nothing;
  end if;

  -- VENDEDOR — só Mantiqueira + seller (isolamento por vendedor)
  select id into uid from auth.users where email='vendedor@conceitoglass.demo';
  if uid is not null then
    update profiles set organization_id=v_org, nome='Vendedor Staging', role_id='vendedor', seller_id=v_sel, status='ATIVO' where id=uid;
    insert into user_stores(user_id,store_id) values (uid,v_a1) on conflict do nothing;
  end if;

  -- FINANCEIRO — todas as lojas
  select id into uid from auth.users where email='financeiro@conceitoglass.demo';
  if uid is not null then
    update profiles set organization_id=v_org, nome='Financeiro', role_id='financeiro', status='ATIVO' where id=uid;
    insert into user_stores(user_id,store_id) select uid, id from stores where organization_id=v_org on conflict do nothing;
  end if;
end $$;
