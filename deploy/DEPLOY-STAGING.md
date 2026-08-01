# Deploy STAGING — Vercel + Supabase (VidroGestor)

> **Objetivo:** ambiente de homologação compartilhado e persistente — **não** produção,
> **não** dados reais, **não** domínio principal. Só liberar produção com autorização.

## Pré-requisitos (suas contas)

Estes passos exigem **suas credenciais** — eu não as tenho e não as crio (§35):
- Conta Supabase (gratuita serve para staging).
- Conta Vercel conectada ao GitHub `marcoslide/sistema-or-amento-vidra-aria`.

## 1. Criar projeto Supabase (staging)

1. https://supabase.com → New project → nome `vidrogestor-staging`, região Brasil/leste EUA, senha do banco.
2. **SQL Editor** → rode, na ordem:
   - `supabase/schema.sql`
   - `supabase/rls.sql`
   - `supabase/seed.sql`
3. **Authentication → Providers**: habilite **Email** (senha). Desative "Confirm email" para agilizar o staging.
4. **Authentication → Users → Add user**: crie os usuários demo (ver tabela abaixo).
5. Para cada usuário criado, rode no SQL Editor o bloco comentado em `seed.sql`
   (vincula `profiles.organization_id`, `role_id` e `user_stores`).
6. **Storage → New bucket**: `documentos` (privado). As políticas de acesso ficam por
   organização/loja (a definir junto das telas de documentos).
7. **Project Settings → API**: copie `Project URL`, `anon key` e `service_role key`.

### Usuários demo (crie no passo 4)

| E-mail | Perfil | Lojas | Isola |
|--------|--------|-------|-------|
| admin@conceitoglass.demo | admin | todas | vê tudo |
| gerente@conceitoglass.demo | gerente | Mantiqueira | vê a(s) loja(s) autorizada(s) |
| vendedor@conceitoglass.demo | vendedor | Mantiqueira | **vê só as próprias vendas** |
| financeiro@conceitoglass.demo | financeiro | todas | financeiro |

## 2. Configurar o app Next.js

1. Copie `.env.example` → `.env.local` e preencha com os valores do passo 1.7.
2. Copie para o app web:
   - `web-pwa/manifest.webmanifest` → `public/manifest.webmanifest`
   - `web-pwa/service-worker.js` → `public/service-worker.js`
   - `web-pwa/offline.html` → `public/offline.html`
   - `web-pwa/icons/*.png` → `public/icons/` (gere os PNGs conforme `web-pwa/icons/README.md`)
3. `npm install` e `npm run build` (verifique o build local antes de subir).

## 3. Deploy no Vercel (staging)

1. Vercel → New Project → importe o repositório.
2. **Environment Variables**: adicione as do `.env.example` (marque para *Preview/Staging*).
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
     `NEXT_PUBLIC_SUPABASE_BUCKET`, `NEXT_PUBLIC_APP_ENV=staging`.
3. Faça o deploy a partir de uma branch de homologação (ex.: `staging`), **não** `main`.
4. Em **Supabase → Authentication → URL Configuration**, adicione a URL de preview do
   Vercel em *Site URL* e *Redirect URLs*.
5. Acesse a URL `*.vercel.app` gerada — este é o **staging**.

## 4. Teste final (passo 6 do plano)

- Dois usuários em aparelhos diferentes; dado criado por um aparece para o outro (persistência real).
- Vendedor **não** vê vendas alheias (RLS `sales_scope` + `app_seller_only`).
- Gerente vê **somente** as lojas autorizadas (`app_store_ids`).
- Arquivos/fotos permanecem no Storage.
- Fechar e reabrir mantém os dados (banco, não localStorage).
- Instalar como app (Android/desktop) e usar no celular.

## 5. Ainda NÃO pronto para produção

- Migração de UI do protótipo (todas as telas) para o app Next.js — em andamento por lotes.
- Backups automáticos, monitoramento e domínio próprio.
- Revisão jurídica de contrato/termo e políticas LGPD.
- Só liberar produção/dados reais com **autorização expressa**.
