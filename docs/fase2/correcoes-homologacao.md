# Correções da homologação (bloqueadores do staging)

Corrige os 6 bloqueadores encontrados na homologação funcional do staging.
**Financeiro (App 4) NÃO iniciado.** `main`/produção intactas.

## 1. Cliente não salva — CORRIGIDO
- **Causa raiz:** `/clientes/novo` tinha `handleSubmit` **simulado** (mostrava toast
  "(simulado)" e navegava), sem nenhum insert no Supabase.
- **Correção:** formulário agora chama `criarCliente()` (server/RLS-scoped), com `name` em
  todos os campos, validação de nome, estado de `salvando` (anti clique-duplo), exibição de
  erro na tela + toast, e `redirect` para a lista após sucesso. `criarCliente` passou a
  persistir todos os campos de endereço e retorna o id. Sem falha silenciosa.
- **Arquivos:** `src/app/(app)/clientes/novo/page.tsx`, `src/lib/data/clientes.ts`.

## 2. Erro ao salvar orçamento — CORRIGIDO
- **Erro:** `more than one row returned by a subquery used as an expression`.
- **Causa raiz:** `app_store_ids()` (RLS) usava **subquery escalar dentro de um CASE**
  (`then (select id from stores ...)`), que retorna várias linhas quando a org tem mais de
  uma loja. No staging (2 lojas), o `with check` do RLS `sales` disparava o erro ao inserir.
- **Correção:** `app_store_ids()` reescrita para retornar um **conjunto** via `UNION`
  (nunca subquery escalar). Corrigida em `rls.sql` (fonte para banco novo) **e** na migration
  corretiva **`0002_fix_rls_store_ids.sql`** (`create or replace`, idempotente) para o staging
  já provisionado.
- **Tratamento de erro:** `vendas-actions` deixou de vazar o erro bruto do PostgreSQL para a
  UI — `dbErro()` registra o técnico em `console.error` (log do servidor) e devolve mensagem
  amigável; `gravarFilhos` passou a propagar erros (sem falha silenciosa).
- **Arquivos:** `supabase/rls.sql`, `supabase/migrations/0002_fix_rls_store_ids.sql`,
  `src/lib/data/vendas-actions.ts`.

## 3. Permissões quebradas — CORRIGIDO (3 camadas)
- **Causa raiz:** não havia guarda por permissão — só de sessão. As leituras
  (`getUsuariosData`/`getPerfisData`) não checavam permissão; o menu mostrava tudo; o
  orçamento exibia custo/margem para qualquer um.
- **Correção em 3 camadas:**
  1. **Menu:** itens do grupo "Sistema" ganharam `perm` (`adm.usuarios`/`adm.config`); a
     Sidebar e o drawer mobile filtram por `filtrarNav()` conforme as permissões reais
     (`minhasPermissoes()`), carregadas no `AppShell`.
  2. **Rota (servidor):** `layout.tsx` de `/usuarios` (`adm.usuarios`), `/perfis` e
     `/configuracoes` (`adm.config`) usam `requirePerm()` → **redirect** para `/dashboard`
     em acesso por URL direta sem permissão.
  3. **Server actions:** `getUsuariosData`/`getPerfisData` agora **lançam** "Sem permissão"
     se faltar `adm.usuarios`/`adm.config` (defesa em profundidade).
- **Custo/Margem no orçamento:** só aparecem com `fin.ver_custos`/`fin.ver_margem` — o
  vendedor **não vê**. (Observação de hardening: o `custo_base` ainda trafega na leitura de
  produtos via RLS de org; restrição a nível de coluna fica como endurecimento futuro, fora
  do escopo deste lote corretivo.)
- **Arquivos:** `nav-config.ts`, `app-shell.tsx`, `sidebar.tsx`, `mobile-nav.tsx`,
  `lib/data/guard.ts`, `usuarios/layout.tsx`, `perfis/layout.tsx`, `configuracoes/layout.tsx`,
  `usuarios-actions.ts`, `perfis-actions.ts`, `server-ctx.ts`, `orcamento-builder.tsx`,
  `lib/permissions.ts`.

## 4. Mobile sem menu — CORRIGIDO
- **Causa raiz:** a sidebar é `hidden lg:flex` e não havia gatilho no mobile.
- **Correção:** botão **hambúrguer** na Topbar (`lg:hidden`) + **drawer** (`mobile-nav.tsx`)
  com overlay, fechar por botão/ao navegar/ao clicar fora/no Esc, trava de scroll do body,
  `100dvh` e `safe-area-inset-bottom`. Testar em 360/390/414/768 px.
- **Arquivos:** `app-shell.tsx`, `mobile-nav.tsx`, `topbar.tsx`, `layout.tsx`.

## 5. Tabela de Produtos no mobile — CORRIGIDO
- **Causa raiz:** a `Table` era `w-full` dentro de `overflow-x-auto`, então **encolhia** em
  vez de rolar; colunas Preço/Status/Ações ficavam cortadas.
- **Correção:** `min-w-[680px]` na tabela (força a rolagem horizontal, mantendo Ações
  acessíveis) + dica visível no mobile ("← deslize …"). Vale para todos os cadastros
  (CadastroView).
- **Arquivo:** `src/components/cadastro/cadastro-view.tsx`.

## 6. Dashboard em mock — CORRIGIDO (Opção A)
- Banner **"DADOS DE DEMONSTRAÇÃO"** no topo do Dashboard, deixando claro que os números
  são fictícios e que Cadastros/Comercial já usam dados reais. (Migração do Dashboard fica
  para lote próprio, para não ampliar este.)
- Também ajustado o rodapé da sidebar (não afirma mais que "tudo é fictício").
- **Arquivo:** `src/app/(app)/dashboard/page.tsx`, `sidebar.tsx`.

## 7. Testes
- Offline (verdes): `npm run typecheck` → 0 · `npm run lint` → 0 · `npm run build` → 0 ·
  `npm run test:calc` → 10/10 · **`npm run test:ui` → 4/4** (novo: filtro de menu por
  permissão + ocultação de custo/margem).
- Integração (`npm run test:staging`, exige staging conectado): acrescentado o caso
  **4b — regressão do subquery** (admin salva venda em org com 2 lojas). Os testes de rota
  (guards) e o funcional mobile são verificados no navegador da homologação.

## 8. Migration corretiva
- **`supabase/migrations/0002_fix_rls_store_ids.sql`** — nova, idempotente
  (`create or replace`), não destrutiva. Ordem documentada em `homologacao-staging.md`.
  No staging **já provisionado**, basta rodá-la para destravar o salvamento de orçamento.
  **Não** executar em produção.

## Como atualizar o staging
1. Extensão: atualizar **somente** o projeto de staging para o novo commit da branch dev.
2. No Supabase de staging, rodar `supabase/migrations/0002_fix_rls_store_ids.sql`
   (idempotente; não altera dados).
3. Repetir os testes que falharam (cliente, orçamento, permissões, mobile) + `test:staging`.

## Limitações / follow-ups (fora do escopo deste lote)
- Restrição a nível de coluna de `custo_base` na leitura de produtos (hardening).
- Migração do Dashboard para dados reais.
- Testes Playwright locais exigem app + Supabase acessíveis (rede bloqueada neste ambiente).
