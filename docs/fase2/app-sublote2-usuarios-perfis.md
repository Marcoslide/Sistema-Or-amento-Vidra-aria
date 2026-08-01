# App Next.js — Sub-lote 2 (fechamento): Usuários + Perfis/Permissões

Conclui o Sub-lote App 2 (Cadastros). Nada de Comercial/Financeiro/Produção/Obras/
Agenda/Documentos/deploy neste lote.

## Confirmação de branch/commit (pedido)

`git ls-remote` confirma que **`1062fab`** está no GitHub como **HEAD** da branch
**`claude/orcamentos-vidracarias-esquadrias-jl63nl`**. É essa a branch a conectar no
Vercel/Supabase — não `main`/protótipo antigo. Este lote adiciona novo commit sobre ela.

## Rotas criadas

- `/usuarios` — `src/app/(app)/usuarios/page.tsx`
- `/perfis` — `src/app/(app)/perfis/page.tsx`
- Menu: grupo "Sistema" ganhou Usuários e Perfis e permissões.

## Server actions (validação NO servidor + auditoria)

- `src/lib/data/server-ctx.ts` — `getCtx`, `ctxHasPerm`, `ctxAudit` (compartilhado).
- `src/lib/supabase/admin.ts` — cliente **service role** (apenas servidor) p/ criar/excluir
  conta de auth; `hasServiceRole()` desabilita com mensagem clara quando ausente.
- `src/lib/data/perfis-actions.ts` — `getPerfisData`, `perfilSalvar`, `perfilDuplicar`,
  `perfilSetAtivo`, `perfilExcluir`, `perfilTogglePerm`.
- `src/lib/data/usuarios-actions.ts` — `getUsuariosData`, `usuarioSalvar`,
  `usuarioSetStatus`, `usuarioConvidar`, `usuarioExcluir`.

## Requisitos atendidos

**Usuários**
- Reais no **Supabase Auth** (profiles ligado a `auth.users`; convite via admin API).
- Vínculo com **uma ou mais lojas** (`user_stores`, sincronizado ao salvar).
- Status **ativo / pendente / bloqueado**.
- **Convite/criação controlada** (`inviteUserByEmail`) — exige `SUPABASE_SERVICE_ROLE_KEY`.
- Edição de **nome, perfil, vendedor e lojas**.
- **Não exclui** usuário com histórico (vendas/auditoria/recebimentos → bloqueia e oferece bloquear).
- **Não exclui** o usuário logado; **não exclui** o último administrador ativo.
- Não permite bloquear a si mesmo.

**Perfis/Permissões**
- **Matriz completa** de permissões por perfil (checkbox por permissão).
- **Duplicar** perfil (copia permissões).
- **Impede exclusão** de perfil **em uso** (inativa) e do **Administrador**; e do perfil do usuário atual.
- Admin sempre com todas as permissões (bloqueado na UI).

Todas as ações: **permissão checada no servidor** (`adm.usuarios`/`adm.config`/
`adm.excluir_usuarios`/`adm.excluir_perfis`), com **auditoria** (`audit_log`).

## Tabelas / RLS

Sem alteração de schema (já previstos em `supabase/schema.sql`): `profiles`,
`user_stores`, `roles`, `role_permissions`, `permissions`. RLS de `rls.sql` já cobre:
org-scope em roles/role_permissions/profiles e `user_stores` validando o profile na org.
Seed de permissões completado no lote anterior.

## Sem mock silencioso

Usuários e Perfis leem sempre do Supabase (via server actions). Falha aparece como
erro na tela; não há fallback para dados fictícios.

## Qualidade (zero erros)

`npx tsc --noEmit` → 0 · `npm run build` → 0 · `npm run lint` → 0.

## Limitações que dependem do staging

- **Convite/criação de usuário** só funciona com `SUPABASE_SERVICE_ROLE_KEY` no
  servidor (a UI avisa quando ausente). Edição/status/lojas/perfis já funcionam sem ela.
- **Testes de runtime** (dois usuários, RLS bloqueando acesso indevido, persistência,
  isolamento vendedor/loja) exigem o **staging Supabase no ar** (contas do usuário).
  Código pronto; verificação atual = build/lint/typecheck verdes.

## Confirmação

Módulos fora de Cadastros **não foram alterados**. Sub-lote App 2 concluído.
Aguardando autorização para o **App 3**.
