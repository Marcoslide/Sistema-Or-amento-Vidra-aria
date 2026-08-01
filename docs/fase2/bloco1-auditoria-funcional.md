# Bloco 1 — Auditoria Funcional Real (executada no navegador)

> Checkpoint obrigatório antes do Bloco 2. Diferente da auditoria estática, aqui
> **cada teste executa a ação no navegador e verifica a alteração de estado e a
> propagação entre telas** — não conta como PASS a mera existência de texto/função.

Harness: `legacy/tests/auditoria-funcional.js` (Playwright + Chromium headless).
Cada item registra: função exercida, ação, resultado esperado, resultado encontrado, PASS/FAIL.

## 1. Resultado consolidado

| Rodada | Arquivo | Auditoria funcional | Regressão (10 suítes) | Erros JS |
|--------|---------|---------------------|-----------------------|----------|
| Antes das correções | congelado v1 | **17/23 PASS · 6 FAIL** | 363/363 | 0 |
| Depois das correções | congelado v2 | **23/23 PASS · 0 FAIL** | 363/363 | 0 |

Total pós-correção: **386/386** (363 regressão + 23 auditoria funcional).

## 2. Falhas encontradas (evidência preservada — §8)

Todas no módulo **Lojas ativas/inativas**, que existia parcialmente (CRUD + badge)
mas **não propagava** o status `ativo` para o resto do sistema.

| ID | Ação executada | Esperado | Encontrado (v1) | Causa raiz |
|----|----------------|----------|-----------------|------------|
| A7 | Inativar loja e ler `lojasSelecionaveis()` | loja ausente | **ainda presente** | `scopeLojas`/`lojasSelecionaveis` não filtravam `ativo` |
| A8 | Abrir Novo Orçamento (DOM do select) | option ausente | **ainda no DOM** | idem (select monta de `lojasSelecionaveis`) |
| A9 | Abrir Nova Conta a Pagar (DOM `#cp-loja`) | option ausente | **ainda no DOM** | idem |
| A10 | Chamada direta `buildToOrc`+`persist` com loja inativa | bloquear | **permitiu salvar** | não havia guard de loja no lançamento |
| A11 | Chamada direta `cpSalvar` com loja inativa | bloquear | **permitiu salvar** | idem |
| A12 | Inativar a loja selecionada no topo | `CURR_LOJA` realocado | **manteve a inativa** | `toggleLoja` não mexia em `CURR_LOJA` |

## 3. Correções aplicadas (mínimas, cirúrgicas)

- **Fonte única de operações**: novas funções `lojasAtivas()`,
  `usuarioPodeAcessarLoja()`, `lojasAtivasPermitidas()`, `lojasVisiveisHistorico()`.
- `lojasSelecionaveis()` passou a retornar **apenas lojas ativas e permitidas** →
  corrige todos os selects de novos lançamentos e o seletor global (A7/A8/A9).
  A **visibilidade de histórico** continua por `scopeLojas` (inclui inativas), então
  registros antigos de lojas inativas permanecem visíveis (§4.3).
- **Guard de lançamento** `validarLojaNovoLancamento(lojaId)` (lança erro se loja
  inexistente/inativa/sem acesso), aplicado no `persist` de novo orçamento e no
  `cpSalvar` de nova conta a pagar (A10/A11). Callers tratam o bloqueio sem erro de UI.
- `toggleLoja` **realoca `CURR_LOJA`** quando a loja inativada estava selecionada
  (vai para "Todas" no multiloja, ou única permitida, senão vazio) e re-renderiza o
  seletor global (A12).

## 4. O que passou com verificação de estado real (não superficial)

| ID | Verificação real |
|----|------------------|
| A1–A6, A13–A15 | Criar/editar loja, badge Ativa/Inativa, histórico preservado, reativar sem duplicar e mantendo o mesmo id |
| B1 | Recebimento de R$100 → `orcRecebido` 800 → 900 |
| B2 | Mesmo recebimento → `caixaSaldo` 45.840 → 45.940 |
| B3 | Propaga ao Ponto de Equilíbrio (`peDados().receita` > 0) |
| B4 | Estorno reverte caixa **e** recebido pelo mesmo valor |
| C1 | Custo direto de R$250 → lucro cai exatamente 250 (`margemVenda`) |
| C2 | Custo com `participaMargem:false` não entra no custo |
| D1 | Vendedor chamando `abrirAnaliseVenda` por chamada direta → **bloqueado** |
| D2 | Vendedor chamando `openLojaForm` por chamada direta → **bloqueado** |

## 5. Limitações honestas ainda em aberto (para o backend / próximos lotes)

- **`addCaixa` tem fallback `lojaId="L1"`** como último recurso quando não há venda,
  `CURR_LOJA` nem loja do usuário. Não é atingido nos fluxos testados, mas o backend
  deve tornar `storeId` **obrigatório e não-nulo** (sem fallback silencioso).
- **Checkbox "Incluir operações inativas"** nas telas de histórico: hoje o histórico
  de loja inativa aparece sob "Todas as operações"; um filtro dedicado com badge
  "Inativa" é melhoria de UI planejada (não bloqueia o checkpoint).
- **Auditoria funcional é uma amostra dirigida** aos fluxos críticos e à falha
  relatada; a cobertura exaustiva de todos os cadastros/documentos/mobile/PWA
  continuará como parte dos blocos de implementação da Fase 2.

## 6. Veredito

Ver `docs/fase2/bloco1-veredito.md` (atualizado).
