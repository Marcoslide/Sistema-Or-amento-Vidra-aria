# App Next.js — Sub-lote 1: Fundação (Supabase + Auth + PWA)

Início da construção do **app real** por lotes (opção escolhida). Sem publicar.
Build verificado: `npm run build` **compila com sucesso** (Next.js 14).

## Entregue

- **Integração Supabase**
  - `src/lib/supabase/env.ts` — leitura das variáveis + `hasSupabaseEnv()` (build funciona sem env).
  - `src/lib/supabase/client.ts` — cliente para o navegador (`@supabase/ssr`).
  - `src/lib/supabase/server.ts` — cliente para Server Components (cookies de sessão).
  - `src/middleware.ts` — renova a sessão e **protege as rotas** (redireciona p/ `/login` sem usuário).
- **Autenticação real**
  - `src/app/login/page.tsx` — login por e-mail/senha via Supabase (visual preservado).
  - `src/app/(app)/layout.tsx` — guard de sessão no servidor.
  - `src/components/layout/topbar.tsx` — "Sair" faz `signOut()` real.
- **Primeira tela ligada ao banco**
  - `src/lib/data/clientes.ts` — `listarClientes()`/`criarCliente()` (usa `customers` no Supabase;
    cai no mock quando não há env, para dev/preview).
  - `src/app/(app)/clientes/page.tsx` — passa a ler do Supabase quando configurado.
- **PWA no app**
  - `public/manifest.webmanifest`, `public/service-worker.js`, `public/offline.html`, `public/icons/`.
  - `src/components/pwa-register.tsx` — registra o SW (https/localhost).
  - `src/app/layout.tsx` — `manifest`, `theme-color`, `appleWebApp` (iOS).
- Dependências: `@supabase/supabase-js`, `@supabase/ssr`.

## Comportamento sem Supabase configurado

Sem `NEXT_PUBLIC_SUPABASE_URL/ANON_KEY`, o app **não bloqueia** (build/preview seguem):
o guard e o login apenas avisam que o ambiente não está configurado, e a tela de
clientes usa dados mock. Com as variáveis definidas (staging), passa a exigir login e
a ler/gravar no Supabase com **RLS** (isolamento por empresa/loja/vendedor).

## Próximos sub-lotes do app

1. **Cadastros** — produtos, fornecedores, famílias, vendedores, contas, operadoras (Supabase).
2. **Comercial** — orçamento → venda, itens/medidas, cálculo (incl. MOLDURA), PDF.
3. **Financeiro** — recebimentos (idempotentes), contas a pagar, caixa.
4. **Operacional** — produção, obras, reclamações, agenda.
5. **Documentos/arquivos** — Storage do Supabase.
6. **Multiloja/RBAC na UI** ligado às políticas do banco.

## Verificação

`npm run build` — compilação e checagem de tipos **OK**. Deploy do staging continua
dependendo das suas contas Supabase/Vercel (ver `deploy/DEPLOY-STAGING.md`).
