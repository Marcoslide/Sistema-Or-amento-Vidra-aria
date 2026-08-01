# Bloco 1 — Arquitetura Alvo (monorepo)

## Estrutura

```
/ (monorepo — npm workspaces + turbo opcional)
├── apps/
│   ├── web/        # Next.js + TypeScript + Tailwind + PWA (frontend)
│   └── api/        # NestJS + TypeScript + Prisma (backend)
├── packages/
│   ├── shared/     # tipos, DTOs, regras/cálculos puros (portados do congelado)
│   ├── validation/ # schemas Zod (compartilhados web+api)
│   ├── ui/         # componentes visuais reaproveitados do protótipo
│   └── document-templates/  # contrato, termo, PDF do cliente
├── legacy/         # protótipo congelado + testes de referência (Bloco 1)
├── docs/           # documentação (fase2/, deploy, runbook, etc.)
├── docker-compose.yml
└── package.json    # workspaces
```

## Stack

- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind + PWA
  (manifest.webmanifest, service-worker, offline.html, ícones). Reaproveita o
  visual e o fluxo do protótipo congelado — **não redesenhar**.
- **Backend:** NestJS + TypeScript + Prisma + PostgreSQL. Módulos por domínio
  (ver matriz). Guards de autenticação e RBAC. Interceptors de tenant e auditoria.
- **Infra opcional (só quando necessário):** Redis (cache/fila), S3-compatível
  (arquivos/documentos), fila para e-mail/notificações.

## Fronteiras e contratos

- `packages/shared` e `packages/validation` são a **única fonte** de tipos e
  regras — web e api importam os mesmos cálculos e schemas. Sem divergência.
- API REST versionada (`/api/v1`), respostas com envelope padrão e paginação.
- Autenticação por JWT (access curto + refresh), sessão no cliente como cache.

## Isolamento multitenant (servidor)

1. Middleware/guard extrai `organizationId` do token.
2. `workspaceId`/`storeId` do contexto (loja selecionada), validados contra
   `UserStore` — usuário só acessa lojas vinculadas.
3. Todo repositório aplica filtro de tenant automaticamente (Prisma extension /
   base repository). Nenhuma query cruza organizações.

## Segurança e conformidade (preparação)

- Hash de senha (argon2), rate limit, CORS restrito, headers seguros (helmet).
- Idempotência (`Idempotency-Key`) + transação em operações financeiras.
- AuditLog imutável para ações sensíveis.
- LGPD: minimização, consentimento para dados de cliente, exportação/exclusão sob
  autorização (§35). Backups e rotina de restore documentados (Bloco 11/12).

## Ambientes

- **development** (Docker local, seed fictício).
- **staging** (deploy-ready, dados de teste) — Bloco 11.
- **production** (deploy-ready, dados reais) — Bloco 12, **somente com
  autorização, credenciais e domínio do usuário** (§35).

## Testes

- Regras/cálculos: testes de unidade em `packages/shared` (portam as 363 asserções).
- API: testes e2e por módulo (auth, tenant, financeiro idempotente).
- Web: smoke/e2e Playwright reaproveitando os fluxos do congelado.
