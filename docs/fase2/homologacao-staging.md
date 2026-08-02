# Homologação em STAGING — preparação do commit `eb3ea37`

> Objetivo: comprovar em **banco real** o que já existe (Auth, Cadastros, Comercial)
> **antes** de iniciar o App 4 — Financeiro. **Não** mexer na `main` nem no Supabase de
> produção. Este documento é a fonte da ordem de execução para o ambiente de staging.

## 0. Commit e branch

- Commit aprovado para homologação: **`eb3ea37`** (código) + **`80fee43`** (preparação de staging).
- Branch de desenvolvimento: `claude/orcamentos-vidracarias-esquadrias-jl63nl`.
- Homologação roda na branch **`staging`**. **Não** fazer merge na `main`.

### Equivalência da branch `staging` (Opção C — aprovada)

A `staging` foi atualizada pela **interface do GitHub** com *rebase and merge*, o que gerou
novos SHAs de commit com **conteúdo idêntico**. Decisão: **manter `staging` em `dbda91e`**
(sem force push), oficialmente aprovada por ter árvore idêntica ao `80fee43`.

```text
Commit original preparado para homologação: 80fee43
Commit efetivo da branch staging:           dbda91e
Tree SHA de ambos:                          4bd3dd962dadacccb87c215e25ac0e075b0fa186
Motivo da diferença:                        rebase and merge pela interface do GitHub
Conteúdo:                                   idêntico (git diff 80fee43 dbda91e = vazio)
```

Verificação (reproduzível): `git rev-parse 80fee43^{tree}` == `git rev-parse dbda91e^{tree}`
e `git diff --quiet 80fee43 dbda91e`. A branch `develop` (em `2f08cf2`, App-1) está
desatualizada, mas **não** afeta a homologação — será organizada depois. **Não** alterar
`main` nem `develop` neste momento.

## 1. Ordem completa das migrations (banco vazio → pronto)

Aplicar **nesta ordem exata** no SQL Editor do Supabase de staging (`vidrogestor-staging`),
em um banco **vazio**. Todos os arquivos são idempotentes (`if not exists` / `on conflict`).

| # | Arquivo | O que faz | Depende de |
|---|---------|-----------|------------|
| 1 | `supabase/schema.sql` | Cria as 24 tabelas do modelo multiloja | pgcrypto (padrão no Supabase) |
| 2 | `supabase/rls.sql` | Helpers (`app_org_id`, `app_store_ids`, `app_seller_*`) + políticas RLS | passo 1 |
| 3 | `supabase/migrations/0001_commercial.sql` | Colunas comerciais em `sales`, `sale_status_history`, RPC `fn_transformar_venda` | passos 1 e 2 (usa `app_org_id`) |
| 4 | `supabase/migrations/0002_fix_rls_store_ids.sql` | **Corretiva**: `app_store_ids()` via UNION (corrige "more than one row returned by a subquery" ao salvar venda) | passo 2 |
| 5 | `supabase/migrations/0003_financeiro.sql` | **Financeiro (App 4)**: tabelas de custos + RPCs `fn_receber_parcela`/`fn_estornar_recebimento`/`fn_pagar_conta`/`fn_estornar_pagamento` + RLS | passos 1 e 2 |
| 6 | `supabase/seed-staging.sql` | Seed exclusivo de staging (ver §3) — reexecutar concede as permissões novas | passo 1 |

> Em um banco **novo** (staging recriado do zero), o `rls.sql` já traz `app_store_ids()`
> corrigido; o `0002` é idempotente e apenas reafirma a função — rodar mesmo assim é seguro.
> No banco de staging **já provisionado**, rode o `0002` para aplicar a correção.

Verificação de aplicabilidade em banco vazio (conferida no repositório):
- `schema.sql` cria todas as tabelas usadas depois; não referencia objeto inexistente.
- `rls.sql` só referencia tabelas do passo 1 e cria as funções antes das políticas.
- `0001` usa `app_org_id()` (criado no passo 2) e tabelas do passo 1 → por isso vem depois do RLS.
- `seed-staging.sql` só usa tabelas do passo 1 (não depende do 0001) → pode ser o último.

> **Não** rodar estes scripts no Supabase de produção.

## 2. Scripts exatos (SQL Editor, na ordem)

```text
1) cole e rode:  supabase/schema.sql
2) cole e rode:  supabase/rls.sql
3) cole e rode:  supabase/migrations/0001_commercial.sql
4) cole e rode:  supabase/migrations/0002_fix_rls_store_ids.sql
5) cole e rode:  supabase/migrations/0003_financeiro.sql
6) cole e rode:  supabase/seed-staging.sql
```

> **Staging já provisionado:** para o App 4, rode **`0003_financeiro.sql`** e depois
> **reexecute `seed-staging.sql`** (idempotente) — isso concede as permissões financeiras
> novas aos perfis (admin/financeiro). Nenhum dado é alterado.

Auth (uma vez): **Authentication → Providers → Email** habilitado; desative
"Confirm email" para agilizar. Storage: bucket privado `documentos` (para lotes futuros).

## 3. Seed de staging — o que é criado (`supabase/seed-staging.sql`)

- **1 organização**: Conceito Glass (Staging) — `…0001`.
- **2 lojas**: Loja Mantiqueira (`…a1`) e Loja Lagoa Santa (`…a2`).
- **4 perfis** com permissões: `admin` (todas), `gerente` (loja/edita/aprova desconto/custos/margem),
  `vendedor` (**só as próprias vendas**), `financeiro`.
- **1 vendedor**: "Vendedor Staging" (`…b1`) — usado no *vendedor automático* e no isolamento.
- **1 fornecedor**: Vidros MG Ltda.
- **Famílias**: "Vidro Temperado" (regra `M2`) e "Molduras" (regra `MOLDURA`, mult. 8).
- **Produto comum**: Vidro Temperado Incolor 8mm (`…e1`, `M2`, R$420 / custo R$190).
- **Produto MOLDURA**: Moldura Alumínio Perfil 5cm (`…e2`, `MOLDURA`, perfil **5 cm × mult 8**,
  R$30 / custo R$10) → 40×60 cm = **2,40 m**.
- **1 conta financeira**: Caixa Loja Mantiqueira (padrão).
- **1 operadora**: Cielo (parcelas 1× 2,5% / 2× 3,8%).
- **Gatilho** `on_auth_user_created`: todo novo usuário do Auth ganha um `profile`.

## 4. Usuários de teste (criar no Auth, depois vincular)

Crie em **Authentication → Users** (senha à sua escolha, sem confirmação de e-mail) e
rode novamente o **bloco final** de `seed-staging.sql` (idempotente) para vincular
organização/perfil/lojas:

| E-mail | Perfil | Lojas | Isolamento |
|--------|--------|-------|------------|
| admin@conceitoglass.demo | admin | as duas | vê tudo |
| gerente@conceitoglass.demo | gerente | Mantiqueira + Lagoa Santa | vê as lojas vinculadas |
| vendedor@conceitoglass.demo | vendedor | só Mantiqueira | **vê só as próprias vendas** |
| financeiro@conceitoglass.demo | financeiro | as duas | financeiro |

O vínculo do `vendedor` já liga `profiles.seller_id` ao vendedor `…b1` (necessário para o
isolamento por vendedor e para o *vendedor automático*).

## 5. Variáveis (Preview/Staging no Vercel) — só os NOMES

Configurar em **Preview** (não em Production). Ver `.env.example`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (só servidor; habilita convite/criação de usuário)
- `NEXT_PUBLIC_SUPABASE_BUCKET` = `documentos`
- `NEXT_PUBLIC_APP_ENV` = `staging`

Com variáveis presentes, o app usa **sempre** o banco (sem mock silencioso); falha de
conexão aparece como erro na tela. Sem variáveis, roda em **modo mock declarado** (dev).

## 6. Testes de integração (rodar com o staging conectado)

`tests/integration/staging.test.mjs` (via `npm run test:staging`). **Pulam** (skip) sem as
variáveis — nunca falham por ambiente ausente, nunca inventam dados. Exporte antes:

```bash
export STAGING_SUPABASE_URL="https://<proj>.supabase.co"
export STAGING_SUPABASE_ANON_KEY="<anon key>"
export STAGING_ADMIN_EMAIL="admin@conceitoglass.demo"      STAGING_ADMIN_PASSWORD="..."
export STAGING_GERENTE_EMAIL="gerente@conceitoglass.demo"  STAGING_GERENTE_PASSWORD="..."
export STAGING_VENDEDOR_EMAIL="vendedor@conceitoglass.demo" STAGING_VENDEDOR_PASSWORD="..."
npm run test:staging
```

Cobrem: **login**; **CRUD de cadastro**; **isolamento por loja** (RLS bloqueia loja fora do
escopo); **isolamento por vendedor** (não vê venda alheia); **orçamento + MOLDURA 40×60 =
2,40 m**; **transformação em venda**; **clique duplo idempotente**; **entrada parcial**;
**entrada integral** (sem parcelas); **entrada > total limitada** (saldo nunca negativo);
**geração de parcelas**; **movimento único de Caixa**.

Motor de cálculo (offline, já verde local): `npm run test:calc` → **10/10**.

## 7. Checklist de homologação (marcar na URL de Preview)

- [ ] Migrations 1→4 aplicadas sem erro em banco vazio.
- [ ] 4 usuários criados e vinculados (bloco final do seed).
- [ ] Login de cada perfil funciona; logout funciona.
- [ ] Cadastros carregam do banco (clientes, lojas, produtos, usuários, perfis, contas, operadoras).
- [ ] Produto MOLDURA aparece com perfil 5 cm × mult 8.
- [ ] Novo orçamento: loja obrigatória; vendedor automático (logado como vendedor).
- [ ] MOLDURA 40×60 mostra 2,40 m e total coerente.
- [ ] Salvar e recarregar mantém os dados (persistência real, não localStorage).
- [ ] Transformar em venda: entrada + parcelas; **um** movimento de Caixa; clicar 2× não duplica.
- [ ] Vendedor NÃO vê vendas de outro vendedor; gerente vê só as lojas vinculadas.
- [ ] `npm run test:staging` verde.
- [ ] Acesso pelo celular (PWA instalável) OK.
- [ ] Production **não** foi alterada; `main` intacta.

## 8. Limitações ainda NÃO verificadas (dependem do staging no ar)

- **RLS por empresa/loja/vendedor** e **sincronização entre aparelhos**: o código aplica os
  escopos e valida no servidor, mas os testes de runtime só valem **após** conectar o staging
  (usuários reais, dois aparelhos). Até lá, a garantia é build/lint/typecheck verde + `test:calc`.
- **Convite/criação de usuário**: exige `SUPABASE_SERVICE_ROLE_KEY` no servidor.
- **Numeração por loja** usa `max+1` (ok para staging); sob altíssima concorrência, avaliar
  sequência dedicada no endurecimento pós-homologação.
- **Storage/documentos** e módulos Financeiro/Produção/Obras/Agenda: fora deste escopo (lotes futuros).

## 9. Próximo passo

Após a homologação verde, **então** autorizar o **App 4 — Financeiro**, que será construído
sobre vendas/parcelas/recebimentos/Caixa já comprovados em ambiente real.
