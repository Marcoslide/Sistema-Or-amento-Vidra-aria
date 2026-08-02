# App 5 — Produção (branch isolada)

Implementado na branch **`feature/app5-producao`** (a partir de `a2fedda`). **Nada promovido**:
não toca `main`, `staging`, Supabase nem deploy. Base operacional de Produção.

## Migration
`supabase/migrations/0004_producao.sql` (idempotente, após 0001/0002/0003):
- Tabelas: `production_orders` (OP; **`unique(sale_id)`** = 1 OP por venda), `production_order_items`,
  `production_stages` (etapas **configuráveis** por OP, com `aplicavel`), `production_outsourcing`
  (terceirizações), `production_time_entries` (apontamentos), `production_status_history`.
- **RLS org + loja** (via a OP) em todas as tabelas; org/loja obrigatórios, sem fallback.
- Permissões: `prod.iniciar`, `prod.apontar`, `prod.terceirizar`, `prod.conferir`, `prod.expedir`.
- **RPCs transacionais**:
  - `fn_iniciar_producao(sale_id, etapas[])` — **idempotente** (1 OP por venda; 2ª chamada
    retorna a existente); só de **venda confirmada**; cria etapas padrão + itens a partir da venda;
    move a venda para `PRODUCAO`.
  - `fn_concluir_producao(order_id)` — **guarda de conclusão**: só conclui se nenhuma etapa
    aplicável estiver pendente/andamento **e** todas as terceirizações estiverem recebidas+conferidas;
    move a venda para `EXECUCAO`.

## Motor puro (testado agora)
`src/lib/production/calc.ts` — `progressoEtapas` (N/A **fora** do denominador; andamento não conta
como concluída) e `podeConcluir` (100% + terceirizações ok). `npm run test:producao` → **6/6**.

## Rotas / páginas
- `/producao` — **fila + dashboard** (aguardando, em andamento, atrasadas, concluídas,
  terceirizações pendentes), filtros e busca, barra de progresso por OP.
- `/producao/[id]` — OP: status + progresso + **concluir** (com guarda), **etapas configuráveis**
  (avançar Pendente→Andamento→Concluída, marcar N/A), itens, **terceirizações** (criar/receber/
  conferir), **apontamentos** (funcionário/etapa/duração/quantidade), link para a venda.
- `/producao/[id]/pdf` — **Ordem de Produção sem valores comerciais** (cliente, itens, medidas,
  quantidade, especificações, consumo/perímetro de moldura, etapas, terceirizações, obs).
- **Iniciar produção** a partir da venda confirmada (`/orcamentos/[id]` → botão) chama a RPC.

## Fluxo
`Venda confirmada → Produção iniciada (EM_PRODUCAO) → Produção concluída (guarda) → venda em EXECUCAO`.
Obras **não** implementadas neste lote (conforme escopo).

## Permissões (servidor + UI + rota)
- Menu "Produção" e rota `/producao` gated por `prod.ver` (guard server-side `requirePerm`).
- Cada ação revalida no servidor (`prod.iniciar`/`apontar`/`terceirizar`/`conferir`/`concluir`).
- Perfil **produção** (novo, no seed): chão de fábrica **sem valores financeiros**. **Vendedor**
  continua sem custo/margem/financeiro. Isolamento por org/loja via RLS.

## Testes
- Offline (verdes): `typecheck` 0 · `lint` 0 · `build` 0 (30 rotas) · `test:calc` 10 · `test:fin` 6 ·
  `test:ui` 4 · **`test:producao` 6**.
- Integração (`tests/integration/producao.test.mjs`, pula sem env; incluído em `test:staging`):
  iniciar uma vez + **idempotência/não duplica**, só de venda confirmada, **guarda de conclusão**
  (etapa pendente e terceirização bloqueiam; conclui só com tudo ok).

## Limitações / itens futuros (honestidade)
- **QR Code e etiquetas** (Módulos 6/7 do pedido): **não** implementados neste lote — ficam para o
  próximo (a base de OP/itens/status já suporta gerar).
- **Apontamento por item** (início/fim automáticos) é simplificado (duração/quantidade informadas).
- **Itens da OP**: campos vidro/espelho/acabamento/imagem/arquivo existem no schema; edição fina por
  item na UI é básica (herda medidas da venda).
- **Runtime (RLS/RPCs/idempotência/multiloja)**: verificação exige **staging no ar** — não executada
  aqui (rede bloqueada). Garantia atual: build/lint/typecheck + testes unitários do motor.

## Como homologar no futuro (não agora)
1. Após o Financeiro promovido, mesclar `feature/app5-producao` em `staging` (merge, sem force).
2. Aplicar `supabase/migrations/0004_producao.sql` e reexecutar `seed-staging.sql` (permissões).
3. `npm run test:staging` (com env) + homologação funcional das telas de Produção.

## Confirmação
`main`/produção/Supabase/deploy **não** tocados. Branch pronta e testada para revisão.
