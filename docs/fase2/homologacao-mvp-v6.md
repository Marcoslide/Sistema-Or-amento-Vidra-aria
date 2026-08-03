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
| 1 | `supabase/schema.sql` | Modelo multiloja (organizações, lojas, clientes, produtos, vendas, financeiro, contas, operadoras…) | pgcrypto (padrão no Supabase) |
| 2 | `supabase/rls.sql` | Helpers (`app_org_id`, `app_store_ids`, `app_seller_*`) + políticas RLS por organização/loja/vendedor | passo 1 |
| 3 | `supabase/migrations/0001_commercial.sql` | Colunas comerciais em `sales`/histórico + RPC `fn_transformar_venda` | passos 1 e 2 |
| 4 | `supabase/migrations/0002_fix_rls_store_ids.sql` | Corretiva: `app_store_ids()` via UNION | passo 2 |
| 5 | `supabase/migrations/0003_financeiro.sql` | Financeiro: `sale_extra_costs`, `cost_centers` + RPCs receber/pagar/estorno | passos 1 e 2 |
| 6 | `supabase/migrations/0004_producao.sql` | **Produção**: ordens/processos/etapas/terceirizações + RPCs `fn_iniciar_producao`/`fn_concluir_producao` (bloqueio real) + RLS | passos 1 e 2 |
| 7 | `supabase/migrations/0005_comercial_obra.sql` | Aditiva: `sales.obra_nome`, `sales.obra_endereco` | passo 1 |
| 8 | `supabase/migrations/0006_identidade_empresa.sql` | Aditiva: identidade da empresa (`organizations`) e das lojas (`stores`) — fantasia, razão, IE/IM, endereço, representante, foro, `logo_url` | passo 1 |
| 9 | `supabase/migrations/0007_categorias_financeiras.sql` | `financial_categories` + RLS + permissão | passos 1 e 2 |
| 10 | `supabase/migrations/0008_obras.sql` | `obras`, `obra_checklist`, `obra_diario` + RLS | passos 1 e 2 |
| 11 | `supabase/migrations/0009_agenda.sql` | `agenda_eventos` + RLS | passos 1 e 2 |
| 12 | `supabase/migrations/0010_reclamacoes.sql` | `reclamacoes`, `reclamacao_historico` + RLS | passos 1 e 2 |
| 13 | `supabase/migrations/0011_obs_operadoras_contas.sql` | Coluna `obs` em `card_operators` e `financial_accounts` | passo 1 |
| 14 | `supabase/migrations/0012_pronto_execucao.sql` | Etapa "Pronto para execução": `fn_concluir_producao` libera a venda para a fila (não inicia execução) | passo 6 |
| 15 | `supabase/migrations/0013_identidade_empresa_safenet.sql` | **Rede de segurança**: reafirma (idempotente) todas as colunas de identidade em `organizations`/`stores` + backfill fantasia/razão a partir de `nome` | passo 1 |
| 16 | `supabase/migrations/0014_backfill_custo_hora.sql` | Recalcula `custo_hora` de registros antigos (hora-homem/máquina) sem sobrescrever valor manual | passos 1 e 3 |
| 17 | `supabase/seed-staging.sql` | Seed de homologação (ver §3) — reexecutar concede permissões novas | passo 1 |

> Aplicar por ordem de número de arquivo. Todos idempotentes (`if not exists` / `on conflict` / `create or replace`).
> **IMPORTANTE:** aplicar **TODAS** as migrations 0001→0014 — aplicar só 0011/0012 sobre um banco antigo deixa `organizations` sem as colunas de identidade (a 0013 corrige isso de qualquer forma).

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

**Incluído e funcional:** Login/sessão/RBAC · Dashboard (dados reais, filtro por período e por loja) ·
Vendas (lista/ciclo) · Orçamento (criar/editar/duplicar/transformar em venda/PDF, campo Obra, painel
Resumo à direita, regra MOLDURA, multiloja) · Financeiro (Contas a receber/pagar, Caixa, Ponto de
equilíbrio, Análise por venda, **Categorias financeiras**) · **Produção** (ordens, etapas,
terceirizações, bloqueio real de conclusão) · **Obras** (kanban, diário, checklist, progresso, sem
valores) · **Agenda** (visitas/instalações, reagendamento) · **Reclamações** (fluxo de status +
histórico) · **Documentos** (contrato, termo de entrega, recibo + PDF do cliente, com identidade
configurável da empresa) · **Configurações → Empresa e Lojas** (identidade completa + logomarca) ·
demais cadastros com exclusão segura · Mobile/PWA (drawer V6, manifest, service worker, ícones) · PDFs.

**Pendências conhecidas (não bloqueiam homologação):** restyle visual V6 das telas de Produção
(hoje funcionais no estilo shadcn); aprofundamento do construtor (cadastro rápido de cliente inline,
condição de pagamento/entrada, observação interna, "marcar como enviado"); anexos/fotos e assinatura
digital em Obras/Reclamações; relatório de obra e ordem de produção como documentos imprimíveis
dedicados.
