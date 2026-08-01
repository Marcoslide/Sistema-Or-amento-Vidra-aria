# Bloco 1 — Auditoria e Relatório de Regressões

## 1. Arquivo congelado

| Campo | Valor |
|------|-------|
| Arquivo | `legacy/vidrogestor-congelado.html` |
| Tamanho | 572.622 bytes |
| Linhas | 4.012 |
| MD5 | `6e817e4a919c58393d75bfe4ad7259a9` |
| SHA-256 | `29124a27770c3cf73725e469509cd70e61e2b3584f1bc4758e0b889aa23bc529` |
| Data | 2026-08-01 |

Este é o protótipo **autoritativo** — a versão mais recente e completa, com todas
as correções aprovadas nos lotes anteriores. Não será revertido nem reconstruído
do zero. A Fase 2 reaproveita seu comportamento, cálculos, regras e layout.

Cópia auxiliar `legacy/vidrogestor-standalone.html` (sem `<link rel=manifest>`)
para abrir por `file://` no celular durante testes.

## 2. Bateria de testes automatizados (Playwright headless)

Executada sobre o arquivo congelado, em Chromium. Resultado:

| Suíte | Testes | Resultado |
|-------|-------:|-----------|
| final.js     | 57 | 57/57 PASS · 0 erros JS |
| reaudit.js   | 35 | 35/35 PASS · 0 erros JS |
| unif.js      | 52 | 52/52 PASS · 0 erros JS |
| fintest.js   | 12 | 12/12 PASS · 0 erros JS |
| regras.js    | 37 | 37/37 PASS · 0 erros JS |
| multiloja.js | 13 | 13/13 PASS · 0 erros JS |
| mobile.js    | 36 | 36/36 PASS · 0 erros JS |
| lote.js      | 47 | 47/47 PASS · 0 erros JS |
| lote2.js     | 48 | 48/48 PASS · 0 erros JS |
| lote3.js     | 26 | 26/26 PASS · 0 erros JS |
| **Total**    | **363** | **363/363 PASS · 0 erros JS** |

Como reproduzir:

```bash
export NODE_PATH=$(pwd)/node_modules
cd legacy/tests
for t in final reaudit unif fintest regras multiloja mobile lote lote2 lote3; do node $t.js; done
```

(Requer Chromium em `/opt/pw-browsers/...` e `playwright-core` instalado.)

## 3. Relatório de regressões

**Nenhuma regressão identificada.** As 363 asserções cobrem:

- Navegação/rotas e guards de visão (`podeAcessarView`), menu por permissão.
- Cálculo de orçamento (m², unidade, metro linear, perímetro), descontos, pagamentos.
- Transformação orçamento → venda, parcelas, condições de pagamento.
- Contas a receber / a pagar (situações derivadas, baixa total/parcial, estorno).
- Caixa (entradas/saídas, saldo, conciliação) — sem duplicações; venda e início de
  produção **não** movimentam caixa.
- Centro de custos, rateios (respeita `participaMargem`), análise por venda.
- Ponto de equilíbrio gerencial (quanto falta, ritmo, projeção, margem de segurança).
- Hora-Homem / Hora-Máquina (componentes em valor e percentual), depreciação.
- Reclamações (ciclo de status), multiloja (isolamento por loja em todas as telas).
- PWA/mobile (manifest, ícones, responsividade).

## 4. Observações da auditoria (não são regressões; guiam a Fase 2)

1. **Persistência em memória / localStorage.** O objeto `DB` é reconstruído a cada
   carga; só configurações e alguns cadastros persistem em localStorage. Fase 2
   move a fonte oficial para PostgreSQL (Bloco 2).
2. **RBAC apenas no cliente.** `can(perm)`, `podeAcessarView`, `navVisivel` filtram a
   UI, mas não há verificação de servidor. Fase 2 replica a matriz de permissões em
   guards de backend (Bloco 3).
3. **Sem multiusuário real.** `CURR_USER` é escolhido localmente; não há sessão,
   senha ou token. Fase 2 adiciona autenticação real (Bloco 3).
4. **Multiloja lógico, não isolado no servidor.** Os filtros `*Visiveis()` já
   existem e serão a base do isolamento server-side por `organizationId/workspaceId/storeId`.
5. **Idempotência financeira.** Baixas/estornos são corretos no protótipo, mas sem
   chave de idempotência; Fase 2 adiciona `Idempotency-Key` + transação (Bloco 6).
6. **Documentos/imagens** hoje são data URIs em memória; Fase 2 usa storage
   S3-compatível (Bloco 9).
7. **Scaffold Next.js pré-existente** (`src/`, Jul/20) é parcial e mais antigo que o
   protótipo HTML. Será tratado como referência visual e **substituído** de forma
   controlada por `apps/web` reaproveitando o visual do congelado (não redesenhar).

## Veredito do Bloco 1

Ver `docs/fase2/bloco1-veredito.md`.
