# Etapa — Preparação para Vercel + Supabase

Segue a ordem que você definiu. Estado atual honesto de cada passo:

| Passo | O que é | Status |
|------|---------|--------|
| 1 | Checkpoint dos fluxos críticos | **Concluído** — `legacy/tests/checkpoint.js` 16/16, 0 erro JS |
| — | Congelar o último HTML | **Concluído** — v6 (lote de exclusões) |
| 2 | Estrutura real (Next.js/Supabase/Vercel) | **Fundação entregue** (schema+RLS+PWA+config+guia) |
| 3 | Supabase: banco + isolamento | **Schema + RLS + seed entregues** (`supabase/*.sql`) |
| 4 | PWA/mobile | **Assets entregues** (`web-pwa/*`) |
| 5 | Vercel staging | **Guia + config entregues** — requer sua conta |
| 6 | Teste em 2 aparelhos | **Pendente** — depende do staging no ar |
| 7/8 | Produção / dados reais | **Bloqueado** até sua autorização (§35) |

## Checkpoint (passo 1) — 16/16

Login, multiloja, criar/editar cliente, criar produto, orçamento, transformar em venda
(idempotente), recebimento → Contas a Receber → Caixa, Contas a Pagar, Caixa, produção,
obra, documentos (PDF/contrato/termo), Centro de Custos, Ponto de Equilíbrio e exclusões
seguras — todos verdes, sem erros JavaScript. Nenhum erro bloqueante.

## Fundação entregue (sem depender de credenciais)

- **Banco (Supabase/PostgreSQL):** `supabase/schema.sql` — modelo multitenant
  (organização → loja), comercial (Sale com status `ORCAMENTO→…`), financeiro com
  **idempotência** (`idempotency_key`) e `cash_movements.store_id` **NOT NULL** (sem
  fallback L1). `supabase/rls.sql` — **RLS** isolando por **empresa, loja e vendedor**
  (`app_org_id`, `app_store_ids`, `app_seller_only`, `app_has_perm`). `supabase/seed.sql`
  — permissões, perfis, org e lojas demo + gatilho de criação de `profiles`.
- **PWA:** `web-pwa/manifest.webmanifest`, `service-worker.js`, `offline.html`, ícone-fonte.
- **Deploy:** `.env.example`, `vercel.json`, `deploy/DEPLOY-STAGING.md` (passo a passo).

## O que EU não posso fazer (e por quê)

Criar o projeto Supabase, criar o projeto Vercel, configurar as variáveis com chaves
reais e **publicar o staging** exigem **suas contas e credenciais**. Por §35 eu não uso
credenciais não fornecidas nem publico sem autorização. Entrego tudo *deploy-ready* e o
guia; a publicação do staging é o próximo passo assim que você conectar as contas
(ou me fornecer as chaves para prosseguir).

## O que ainda falta para o app real ficar completo

A **migração das telas** do protótipo (v6) para o app Next.js ligado ao Supabase será
feita por lotes (como fizemos com os lotes anteriores): cadastros → comercial →
financeiro → operacional → documentos. A fundação acima é a base dessa migração.
