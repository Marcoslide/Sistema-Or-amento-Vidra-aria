-- ============================================================
-- VidroGestor — Schema Supabase/PostgreSQL (staging)
-- Multitenancy: organização → loja; isolamento por empresa/loja/vendedor.
-- Fonte oficial de dados (substitui memória/localStorage do protótipo).
-- Execute na ordem: schema.sql → rls.sql → seed.sql
-- ============================================================

create extension if not exists "pgcrypto";

-- ---------- Estrutura organizacional ----------
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cnpj text,
  created_at timestamptz not null default now()
);

create table if not exists stores ( -- lojas / operações
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  nome text not null,
  tipo text default 'loja',
  cnpj text, cidade text, uf text, resp text,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_stores_org on stores(organization_id);

create table if not exists roles ( -- perfis
  id text not null,               -- 'admin','gerente','vendedor','financeiro',...
  organization_id uuid not null references organizations(id) on delete cascade,
  nome text not null,
  ativo boolean not null default true,
  primary key (organization_id, id)
);

create table if not exists permissions ( -- catálogo de permissões
  key text primary key,           -- 'vendas.todas','fin.excluir_contas',...
  descricao text
);

create table if not exists role_permissions (
  organization_id uuid not null references organizations(id) on delete cascade,
  role_id text not null,
  permission_key text not null references permissions(key) on delete cascade,
  primary key (organization_id, role_id, permission_key)
);

-- profiles: espelha auth.users (id = auth.uid())
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references organizations(id) on delete set null,
  nome text not null default '',
  email text,
  role_id text,                   -- perfil principal
  seller_id uuid,                 -- vínculo com vendedor (para isolamento por vendedor)
  status text not null default 'ATIVO',
  created_at timestamptz not null default now()
);
create index if not exists idx_profiles_org on profiles(organization_id);

-- vínculo usuário ↔ loja (multiloja)
create table if not exists user_stores (
  user_id uuid not null references profiles(id) on delete cascade,
  store_id uuid not null references stores(id) on delete cascade,
  primary key (user_id, store_id)
);

-- ---------- Cadastros ----------
create table if not exists sellers ( -- vendedores
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  nome text not null, email text, tel text,
  desc_max numeric(6,2) default 0, meta numeric(14,2) default 0, comissao numeric(6,2) default 0,
  ativo boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists product_families (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  nome text not null, codigo text, regra text default 'UN', unidade text default 'un',
  multiplicador_padrao numeric(8,2) default 8,   -- Moldura
  ativo boolean not null default true
);

create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  nome text not null, razao text, doc text, categoria text,
  ativo boolean not null default true
);

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  store_id uuid references stores(id) on delete set null,
  nome text not null, doc text, email text, tel text,
  cep text, logradouro text, numero text, complemento text, bairro text, cidade text, uf text,
  ativo boolean not null default true,
  created_by uuid, created_at timestamptz not null default now(), updated_at timestamptz
);
create index if not exists idx_customers_org on customers(organization_id);

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  descricao text not null, codigo text, familia text, fornecedor text,
  regra text not null default 'UN',              -- M2/ML/UN/PERIMETRO/MOLDURA... (contrato: campo "regra")
  preco numeric(14,2) not null default 0, custo_base numeric(14,2) default 0,
  largura_moldura_cm numeric(8,2) default 0, multiplicador_corte numeric(8,2) default 8,
  ativo boolean not null default true
);
create index if not exists idx_products_org on products(organization_id);

create table if not exists financial_accounts ( -- contas financeiras
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  store_id uuid references stores(id) on delete set null,
  nome text not null, tipo text, banco text, agencia text, numero text, digito text,
  titular text, doc text, saldo_inicial numeric(14,2) default 0, data_saldo date,
  aceita_entrada boolean default true, aceita_saida boolean default true, padrao boolean default false,
  obs text,
  ativo boolean not null default true
);

create table if not exists card_operators ( -- operadoras
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  store_id uuid references stores(id) on delete set null,
  nome text not null, conta text, tipo text default 'ambos', bandeiras text, prazo text,
  parcelas jsonb default '[]'::jsonb, antecipacao boolean default false, taxa_antecip numeric(6,2) default 0,
  obs text,
  ativo boolean not null default true
);

-- ---------- Comercial (Orçamento = status inicial de Sale) ----------
create table if not exists sales (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  store_id uuid not null references stores(id),     -- loja da venda
  production_store_id uuid references stores(id),    -- operação de produção
  execution_store_id uuid references stores(id),     -- operação de execução
  numero bigint,                                     -- número por loja/organização
  cliente_id uuid references customers(id),
  cliente_nome text, seller_id uuid references sellers(id), vend_nome text,
  status text not null default 'ORCAMENTO',          -- ORCAMENTO→VENDA_CONFIRMADA→PRODUCAO→EXECUCAO→FINALIZADA
  venda_gerada boolean not null default false,
  desc_pct numeric(6,2) default 0, acrescimo numeric(14,2) default 0, frete numeric(14,2) default 0, instalacao numeric(14,2) default 0,
  total numeric(14,2) default 0,
  created_by uuid, created_at timestamptz not null default now(), updated_by uuid, updated_at timestamptz
);
create index if not exists idx_sales_org_store on sales(organization_id, store_id);
create index if not exists idx_sales_seller on sales(seller_id);

create table if not exists sale_environments ( -- ambientes
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references sales(id) on delete cascade,
  nome text not null
);
create table if not exists sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references sales(id) on delete cascade,
  environment_id uuid references sale_environments(id) on delete cascade,
  product_id uuid references products(id),
  regra text not null default 'UN', desc_pct numeric(6,2) default 0, preco_override numeric(14,2)
);
create table if not exists sale_measures ( -- medidas
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references sale_items(id) on delete cascade,
  l numeric(12,3) default 0, a numeric(12,3) default 0, q integer default 1, unit text default 'cm'
);

-- ---------- Financeiro ----------
create table if not exists receivables ( -- contas a receber (parcelas/títulos)
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  store_id uuid not null references stores(id),
  sale_id uuid references sales(id) on delete cascade,
  descricao text, valor numeric(14,2) not null default 0, vencimento date, status text default 'ABERTO',
  created_at timestamptz not null default now()
);
create table if not exists receivable_payments ( -- recebimentos (baixas)
  id uuid primary key default gen_random_uuid(),
  receivable_id uuid references receivables(id) on delete cascade,
  sale_id uuid references sales(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  store_id uuid not null references stores(id),
  valor numeric(14,2) not null, forma text, conta text, operadora text,
  estornado boolean not null default false,
  idempotency_key text unique,           -- idempotência (anti clique-duplo)
  created_by uuid, created_at timestamptz not null default now()
);
create table if not exists payables ( -- contas a pagar
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  store_id uuid not null references stores(id),
  descricao text not null,               -- descrição da despesa (obrigatória)
  fornecedor text,                       -- opcional
  categoria text, category_id uuid, valor numeric(14,2) not null default 0, emissao date, competencia date, vencimento date,
  forma text, conta_fin text, ocorrencia text default 'Única', cancelada boolean default false,
  created_by uuid, created_at timestamptz not null default now()
);
create table if not exists payable_payments (
  id uuid primary key default gen_random_uuid(),
  payable_id uuid references payables(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  store_id uuid not null references stores(id),
  valor numeric(14,2) not null, forma text, conta_fin text, estornado boolean not null default false,
  idempotency_key text unique,
  created_by uuid, created_at timestamptz not null default now()
);
create table if not exists cash_movements ( -- caixa (store_id obrigatório: sem fallback L1)
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  store_id uuid not null references stores(id),
  tipo text not null check (tipo in ('entrada','saida')),
  valor numeric(14,2) not null, descricao text, forma text, data date not null default current_date,
  origem_tipo text, origem_id uuid,      -- venda/recebimento/pagamento de origem
  created_by uuid, created_at timestamptz not null default now()
);
create index if not exists idx_cash_org_store on cash_movements(organization_id, store_id);

-- ---------- Auditoria ----------
create table if not exists audit_log (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references organizations(id) on delete cascade,
  store_id uuid, user_id uuid, usuario text,
  modulo text, registro text, acao text, antes jsonb, depois jsonb,
  created_at timestamptz not null default now()
);
