# Homologação — MVP (branch `feature/paridade-v6`)

> Objetivo: publicar uma **versão de homologação utilizável** com paridade visual/funcional
> com o contrato **V6** (`legacy/vidrogestor-congelado-v6.html`), preservando todo o backend
> (Supabase, RLS, RPCs, dados). **Não** mexer em `main`, `staging` nem no Supabase de produção.

## 0. Commit e branch

- Branch: **`feature/paridade-v6`**.
- Ver o hash do commit final no fim deste documento (ou `git log -1` na branch).
- Deploy sugerido: Vercel apontando para `feature/paridade-v6` (ambiente de **Preview/Homologação**),
  com as variáveis do **Supabase de homologação** (NÃO o de produção).

## 1. Migrations — ordem exata (banco vazio → pronto)

Aplicar **nesta ordem** no SQL Editor do Supabase de homologação, em banco **vazio**.
Todos os arquivos são idempotentes (`if not exists` / `on conflict`).

| # | Arquivo | O que faz | Depende de |
|---|---------|-----------|------------|
| 1 | `supabase/schema.sql` | Cria o modelo multiloja (organizações, lojas, clientes, produtos, vendas, financeiro, contas, operadoras…) | pgcrypto (padrão no Supabase) |
| 2 | `supabase/rls.sql` | Helpers (`app_org_id`, `app_store_ids`, `app_seller_*`) + políticas RLS por organização/loja/vendedor | passo 1 |
| 3 | `supabase/migrations/0001_commercial.sql` | Colunas comerciais em `sales`/histórico + RPC `fn_transformar_venda` (transformar orçamento em venda, transacional e idempotente) | passos 1 e 2 |
| 4 | `supabase/migrations/0002_fix_rls_store_ids.sql` | Corretiva: `app_store_ids()` via UNION (corrige "more than one row returned by a subquery" ao salvar venda com 2+ lojas) | passo 2 |
| 5 | `supabase/migrations/0003_financeiro.sql` | Financeiro: `sale_extra_costs`, `cost_centers` + RPCs `fn_receber_parcela`/`fn_estornar_recebimento`/`fn_pagar_conta`/`fn_estornar_pagamento` + RLS | passos 1 e 2 |
| 6 | `supabase/migrations/0005_comercial_obra.sql` | Aditiva: `sales.obra_nome`, `sales.obra_endereco` (campo Obra no orçamento e no PDF) | passo 1 |
| 7 | `supabase/seed-staging.sql` | Seed exclusivo de homologação (ver §3) — reexecutar concede permissões novas | passo 1 |

> Não existe `0004` nesta branch: a migration `0004_producao.sql` pertence ao módulo **Produção**
> (branch `feature/app5-producao`), deferido para depois do MVP. A ausência do 0004 **não** afeta
> a aplicação — o Supabase aplica por ordem de nome de arquivo e o 0005 é autossuficiente.

## 2. Como aplicar

No SQL Editor do Supabase de homologação, cole e execute o conteúdo de cada arquivo na
ordem da tabela acima (um de cada vez). Todos são reexecutáveis com segurança.

> **Nunca** rode estes scripts no Supabase de produção.

## 3. Seed de homologação

`supabase/seed-staging.sql` cria (idempotente):

- **1 organização**: Conceito Glass (Staging)
- **2 lojas**: Loja Mantiqueira (BH/MG) e Loja Lagoa Santa (MG) — para testar isolamento multiloja
- **4 perfis**: `admin` (todas as permissões), `gerente`, `vendedor`, `financeiro`
- **1 vendedor** (vinculado à Loja Mantiqueira)
- **Famílias**, **1 produto comum** e **1 produto com regra MOLDURA**
- **1 conta financeira** (Caixa Loja Mantiqueira) e **1 operadora de cartão** (Cielo)
- **Gatilho** `on_auth_user_created`: todo novo usuário do Auth ganha `profile` automaticamente

## 4. Usuário administrador (Auth)

O Supabase Auth **não** é populado por SQL de tabela — crie os usuários no painel e depois
rode o bloco de vínculo (já incluído no fim de `seed-staging.sql`, idempotente):

1. **Authentication → Users → Add user** (sem exigir confirmação de e-mail), crie:
   - `admin@conceitoglass.demo`  ← administrador
   - `gerente@conceitoglass.demo`
   - `vendedor@conceitoglass.demo`
   - `financeiro@conceitoglass.demo`
   - Defina uma senha para cada.
2. Rode novamente o **bloco `do $$ … $$`** do fim de `seed-staging.sql`. Ele vincula cada
   e-mail à organização, ao perfil e às lojas (o admin recebe **todas as lojas**).

> Para usar um e-mail real como admin (ex.: `marcospereirajpjp@gmail.com`): crie-o no Auth e,
> no bloco de vínculo, troque `admin@conceitoglass.demo` pelo e-mail desejado (ou rode um
> `update profiles set organization_id=…, role_id='admin', status='ATIVO' where id=(select id from auth.users where email='seu@email')`
> seguido do `insert into user_stores` para todas as lojas da organização).

## 5. Variáveis de ambiente (deploy de homologação)

```
NEXT_PUBLIC_SUPABASE_URL=https://<projeto-homolog>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key do projeto de homologação>
SUPABASE_SERVICE_ROLE_KEY=<service role do projeto de homologação>
```

Sem essas variáveis o app roda em **modo mock** (sem Supabase). Para homologação real,
configure as três apontando para o projeto de **homologação**.

## 6. Escopo do MVP

**Incluído e funcional:** Login/sessão/RBAC · Dashboard (dados reais) · Vendas (lista/ciclo) ·
Orçamento (criar/editar/duplicar/transformar em venda/PDF, campo Obra, painel Resumo à direita,
regra MOLDURA, multiloja) · Financeiro (Contas a receber/pagar, Caixa, Ponto de equilíbrio,
Análise por venda) · Cadastros com exclusão segura (Clientes, Vendedores, Produtos, Famílias,
Fornecedores, Operadoras, Lojas, Contas, Centro de custos, Hora-homem/máquina, Depreciação) ·
Configurações (hub de cadastros) · Mobile (drawer V6) · PDFs.

**Deferido (sinalizado "Em desenvolvimento", sem rota quebrada):** Obras, Agenda, Reclamações,
Produção completa, Documentos avançados, refinamentos visuais.
