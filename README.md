# VidroGestor — Orçamentos & Obras

Sistema de gestão de **orçamentos e obras para vidraçarias e esquadrias**
(vidros, espelhos, esquadrias de alumínio, box, guarda-corpos, fachadas,
coberturas, portas e janelas). Empresa de referência: **Conceito Glass**.

> **Fase atual: aplicação Next.js + Supabase, migrada por lotes.**
> Autenticação real, cadastros e módulo Comercial já rodam contra o banco.
> O protótipo HTML congelado (fonte de verdade das regras) está em `legacy/`.
> Próximo marco: **homologação em staging** do commit aprovado antes do
> App 4 — Financeiro. Veja [`docs/fase2/homologacao-staging.md`](docs/fase2/homologacao-staging.md).

## O que já está implementado

- **Supabase Auth real** — login/logout, sessão via `@supabase/ssr`, guarda de rotas
  no middleware. Perfis (`profiles`) ligados a `auth.users`; convite/criação de usuário
  via service role.
- **Cadastros migrados** (Supabase, com RLS): Lojas, Usuários, Perfis/Permissões,
  Vendedores, Clientes, Famílias, Fornecedores, Produtos (incl. campos MOLDURA),
  Contas financeiras, Operadoras. CRUD completo + **exclusão segura** (bloqueia se houver
  vínculo e oferece inativar), seleção em massa, validação de permissão **no servidor** e auditoria.
- **Módulo Comercial migrado** (Vendas): um único fluxo do **orçamento** à finalização;
  construtor com ambientes/itens/múltiplas medidas, **vendedor automático**, loja obrigatória,
  descontos/frete/instalação/obs/prazo/condição, **totais e margem ao vivo**; situação + histórico;
  **transformação em venda** transacional e idempotente (entrada + parcelas + **um** movimento de
  Caixa); PDF do cliente com identidade da loja. Regra de cálculo especial **MOLDURA**
  (`(2·L+2·A) + larguraPerfil×mult`; ex. 40×60 cm, perfil 5 cm × 8 = **2,40 m**).
- **Multitenancy + RLS**: isolamento por **empresa / loja / vendedor**
  (`supabase/rls.sql`). `cash_movements.store_id` é obrigatório — **sem fallback de loja padrão (L1)**.
- **PWA**: `manifest.webmanifest`, service worker e página offline (em `web-pwa/` e `public/`).

### Modo mock x banco real (sem mock silencioso)

- **Com** variáveis de ambiente Supabase → o app usa **sempre** o banco. Falha de conexão
  aparece como **erro na tela**; nunca exibe dados fictícios como se fossem reais.
- **Sem** variáveis → **modo mock declarado** (desenvolvimento), com dados fictícios em memória.

## Como rodar

```bash
npm install
# modo mock (sem Supabase): qualquer credencial entra
npm run dev            # http://localhost:3000

# contra o banco: copie .env.example → .env.local e preencha as chaves do Supabase
```

Qualidade e testes:

```bash
npm run typecheck      # tsc --noEmit
npm run lint           # next lint
npm run build          # build de produção
npm run test:calc      # motor de cálculo (offline): 10/10
npm run test:staging   # integração; pula sem STAGING_SUPABASE_* (ver homologação)
```

## Stack

- **Next.js 14** (App Router) + **TypeScript** + **Tailwind** + UI estilo **Shadcn** + **Lucide**
- **Supabase**: PostgreSQL, Auth, Storage, **RLS**; `@supabase/ssr` (browser/server) + service role
- Server Actions (`"use server"`) para validação de permissão/vínculo/auditoria no servidor

## Estrutura

```
src/
├── app/(app)/          # rotas: dashboard, orcamentos (lista, /novo, /[id], /[id]/pdf),
│                       #        clientes, produtos, lojas, vendedores, familias,
│                       #        fornecedores, contas, operadoras, usuarios, perfis, configuracoes
├── components/
│   ├── ui/             # primitivos (button, card, table, dialog, select...)
│   ├── cadastro/       # CadastroView genérico (motor de CRUD dos cadastros)
│   ├── comercial/      # OrcamentoBuilder, TransformarModal
│   └── layout/         # sidebar, topbar, navegação
├── lib/
│   ├── commercial/     # calc.ts (motor de cálculo, incl. MOLDURA) + situacao.ts
│   ├── data/           # leituras client + server actions (RLS-scoped, sem mock silencioso)
│   ├── supabase/       # client/server/admin/env + middleware de sessão
│   └── format.ts, utils.ts, types.ts
supabase/
├── schema.sql          # modelo multiloja (24 tabelas)
├── rls.sql             # helpers + políticas de RLS
├── migrations/0001_commercial.sql   # colunas comerciais + histórico + RPC fn_transformar_venda
├── seed.sql            # seed demo (histórico)
└── seed-staging.sql    # seed exclusivo de homologação
tests/
├── commercial/calc.test.ts          # motor de cálculo (node --test)
└── integration/staging.test.mjs     # integração contra staging (skip sem env)
legacy/                 # protótipo HTML congelado (fonte de verdade das regras)
```

## Limitações atuais

- **RLS por empresa/loja/vendedor** e **sincronização entre aparelhos**: implementados no
  código, mas os testes de runtime só valem **após conectar o staging** (usuários reais).
  Até lá, a garantia é build/lint/typecheck verde + `test:calc`.
- **Financeiro / Produção / Obras / Agenda / Documentos**: ainda **não** migrados (lotes futuros).
  A transformação em venda já gera os lançamentos financeiros mínimos (parcelas/entrada/Caixa).
- **Convite de usuário** exige `SUPABASE_SERVICE_ROLE_KEY` no servidor.
- **Produção**: não liberada. Deploy apenas em **staging** e sob autorização expressa.

## Deploy / homologação

- **MVP paridade V6** (branch `feature/paridade-v6`): migrations, seed, usuário admin e escopo:
  [`docs/fase2/homologacao-mvp-v6.md`](docs/fase2/homologacao-mvp-v6.md).
- Ordem de migrations, seed, usuários de teste e checklist (staging original):
  [`docs/fase2/homologacao-staging.md`](docs/fase2/homologacao-staging.md).
- Guia Vercel + Supabase: [`deploy/DEPLOY-STAGING.md`](deploy/DEPLOY-STAGING.md).
- Organização de branches: `claude/…` (desenvolvimento) → `staging` (homologação) →
  `main` (produção). O Supabase **não** aponta para branch: usa projetos/variáveis/migrations
  separados por ambiente.
