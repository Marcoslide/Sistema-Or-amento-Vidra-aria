# VidroGestor — Fase 2: Plano de Estabilização, Backend Real, Banco, PWA e Publicação

Empresa: **Conceito Glass**. Produto: **VidroGestor** — gestão de orçamentos,
vendas, produção, obras e financeiro para vidraçarias e esquadrias.

> **Estado honesto do projeto:** protótipo funcional completo (arquivo único HTML,
> dados em memória) validado por 363 testes automatizados. A Fase 2 transforma-o em
> aplicação real, multiusuário, com backend, banco PostgreSQL, autenticação, PWA e
> preparação para publicação. **Nada aqui é "pronto para produção" até estar
> efetivamente publicado e testado em staging/produção.**

## Princípios (imutáveis nesta fase)

1. **Preservar integralmente** todas as funcionalidades do protótipo (§2). Nada é
   removido ou alterado silenciosamente.
2. **PostgreSQL passa a ser a fonte oficial de dados.** localStorage/IndexedDB
   ficam apenas como sessão, preferências, cache, rascunhos e offline limitado.
3. **RBAC verificado no servidor** — não apenas botões escondidos.
4. **Transações + idempotência** em toda operação financeira.
5. **Execução em blocos com checkpoints** (§33). Cada bloco termina com veredito
   `APROVADO PARA O PRÓXIMO BLOCO` ou `NÃO APROVADO — CORREÇÕES NECESSÁRIAS`.
6. **Pontos de parada obrigatórios (§35):** alterar regra de negócio aprovada,
   apagar dados, mudar contrato/termo legal, mudar fórmula financeira, tocar em
   produção, migração destrutiva, contratar serviço pago, registrar domínio, usar
   credenciais não fornecidas, publicar dados reais, substituir funcionalidade.

## Fronteira de responsabilidade (transparência)

- **Eu construo** todo o código: monorepo, backend, frontend, schema, migrations,
  seeds, testes, Docker, PWA e documentação — e faço commit no repositório.
- **Cabe ao usuário** (Blocos 11–12): contratar hospedagem/banco gerenciado,
  registrar domínio, fornecer credenciais e autorizar a publicação de dados reais.
  Entrego tudo *deploy-ready* + guias, e **paro** antes de tocar produção (§35).

## Blocos

| Bloco | Escopo | Status |
|------|--------|--------|
| 1 | Congelamento + auditoria + matriz + regressões + plano de migração + arquitetura | **em andamento** |
| 2 | Monorepo + Prisma schema + PostgreSQL + migrations + seed | pendente |
| 3 | Autenticação + multiloja + RBAC (servidor) | pendente |
| 4 | Cadastros | pendente |
| 5 | Comercial (orçamento → venda) | pendente |
| 6 | Financeiro (transações + idempotência) | pendente |
| 7 | Operacional (produção, terceirização, obras, agenda, reclamações) | pendente |
| 8 | Custos, Hora-Homem, Hora-Máquina, depreciação, Ponto de Equilíbrio | pendente |
| 9 | Arquivos e documentos (S3-compatível, contrato, termo, PDFs) | pendente |
| 10 | Mobile / PWA instalável | pendente |
| 11 | Staging (deploy-ready + docs) — **pausa §35** | pendente |
| 12 | Produção (deploy-ready + docs) — **pausa §35** | pendente |

## Artefatos do Bloco 1

- `legacy/vidrogestor-congelado.html` — cópia congelada do protótipo autoritativo.
- `legacy/HASHES.txt` — nome, tamanho e hashes (MD5 + SHA-256).
- `legacy/tests/*.js` — as 10 suítes Playwright (363 testes).
- `docs/fase2/bloco1-auditoria.md` — auditoria + relatório de regressões.
- `docs/fase2/bloco1-matriz-funcionalidades.md` — matriz módulo → destino Fase 2.
- `docs/fase2/bloco1-plano-migracao.md` — mapa coleções em memória → entidades Prisma.
- `docs/fase2/bloco1-arquitetura.md` — arquitetura alvo (monorepo).
