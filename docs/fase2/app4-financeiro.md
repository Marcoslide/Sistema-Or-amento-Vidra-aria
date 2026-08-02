# App 4 — Financeiro

Construído sobre a base comercial já homologada. Branch de desenvolvimento; **`main` e
produção intactas**. Testes de runtime dependem de nova homologação no staging.

## Correções pequenas (junto do lote)
- **Usuário logado real:** o topo/avatar/menu deixaram de exibir "Carla Mendes" fixo — agora
  usam nome, e-mail, perfil e lojas do usuário autenticado (`meuResumo()` + Topbar). Iniciais no avatar.
- **Clientes na listagem:** editar (diálogo), inativar/reativar, **exclusão segura** (bloqueia se
  houver vendas → oferece inativar), busca, filtro por loja e seleção em massa — via `CadastroView`
  (`entity="clientes"`). A **criação homologada** (`/clientes/novo`) foi preservada (`novoHref`).

## Migration
`supabase/migrations/0003_financeiro.sql` (idempotente, após 0001/0002):
- Tabelas: `cost_centers`, `labor_costs` (hora-homem), `machine_costs` (hora-máquina),
  `depreciation_assets`, `sale_extra_costs` (custos por venda) + colunas auxiliares em
  `receivables`/`payables`. RLS org-scope em todas.
- **RPCs transacionais e idempotentes** (`SECURITY INVOKER`, sob a RLS do usuário):
  - `fn_receber_parcela` — recebe parcela; **não** recebe acima do saldo; **um** `cash_movement`
    (entrada); atualiza status ABERTO/PARCIAL/RECEBIDO; idempotente por `idempotency_key`.
  - `fn_estornar_recebimento` — movimento **inverso** (saída) + reabre a parcela; idempotente.
  - `fn_pagar_conta` — paga (parcial/total); **não** acima do saldo; **um** `cash_movement` (saída); idempotente.
  - `fn_estornar_pagamento` — movimento inverso (entrada); idempotente.
- Permissões novas: `fin.centro_custos`, `fin.ponto_equilibrio`, `fin.custos_venda`.

## Módulos entregues (rotas)
1. **Contas a Receber** (`/financeiro/receber`) — parcelas das vendas com valor/recebido/saldo/
   vencimento/status; recebimento parcial/total, múltiplos recebimentos, estorno, idempotência,
   impede over-recebimento e saldo negativo.
2. **Caixa** (`/financeiro/caixa`) — entradas/saídas por loja, totais e saldo; um movimento por
   operação; estorno gera inverso; origem rastreada (venda/recebimento/pagamento/estorno).
3. **Contas a Pagar** (`/financeiro/pagar`) — criar/editar/pagar/pagar parcial/estornar/**exclusão
   segura** (bloqueia com pagamento ativo); descrição obrigatória, fornecedor opcional, loja obrigatória.
4. **Análise financeira por venda** (`/orcamentos/[id]/financeiro`) — tela própria: receita bruta,
   descontos, acréscimos, frete, instalação, receita líquida, custo de produtos, custos extras,
   margem bruta, margem de contribuição, %, **lucro estimado e realizado**; adicionar/remover custos
   extras (com "participa da margem"). Visível só a `fin.ver_custos`/`fin.ver_margem`.
5. **Centro de Custos** (`/centro-custos`) — fixos/variáveis, valor ou %, periodicidade, participa
   rateio, critério de rateio. CRUD + exclusão segura.
6. **Hora-Homem** (`/hora-homem`) e **Hora-Máquina** (`/hora-maquina`) — todos os campos aprovados;
   CRUD + exclusão segura + vínculo a centro de custo.
7. **Depreciação** (`/depreciacao`) — bem, custo, vida útil, residual, acumulada, valor contábil, baixa.
8. **Ponto de Equilíbrio** (`/financeiro/ponto-equilibrio`) — receita vendida/recebida, custos fixos,
   margem de contribuição, receita de equilíbrio, quanto falta/excedeu, % atingido, gráfico de barra,
   filtro por loja/consolidado.

## Motor financeiro puro (testado agora)
`src/lib/financial/calc.ts` — `analiseVenda`, `custoHoraHomem`, `custoHoraMaquina`,
`depreciacaoMensal`/`valorContavel`, `rateio`, `pontoEquilibrio`. Dinheiro com `r2`.
`npm run test:fin` → **6/6**.

## Permissões (servidor + UI + rota)
- **Menu** filtrado por permissão (grupos Financeiro/Custos/Sistema).
- **Guards de rota server-side** (`requirePerm`) em cada página financeira/custos → redirect.
- **Server actions** revalidam permissão e isolam por org/loja (RLS).
- **Vendedor**: sem Caixa, Contas a Pagar/Receber, Centro de Custos, Ponto de Equilíbrio, análise
  financeira; custo/margem ocultos no orçamento. **Produção**: sem valores. **Financeiro**: módulos
  financeiros das lojas vinculadas. **Admin**: total.

## Regras técnicas atendidas
- `numeric` para dinheiro (nunca float); operações críticas via RPC transacional; idempotência por
  chave; **sem fallback de loja**; RLS por organização/loja; auditoria (`audit_log`); erros amigáveis
  na UI e técnicos só no log do servidor (`dbErro`); sem mock silencioso com Supabase configurado.

## Testes
- Offline (verdes): `typecheck` 0 · `lint` 0 · `build` 0 (29 rotas) · `test:calc` 10/10 ·
  **`test:fin` 6/6** · `test:ui` 4/4.
- Integração (`test:staging`, pula sem env): acrescentados casos **10–13** (recebimento parcial/total
  + caixa único, over-recebimento rejeitado, estorno de recebimento com inverso, contas a pagar
  pagamento/over/estorno). Total 13 casos.

## Limitações / itens manuais nesta versão (honestidade)
- **Recorrência e parcelamento automáticos de Contas a Pagar**: os campos existem (ocorrência,
  parcela/total), mas a **geração automática de N lançamentos** ainda é manual (criação avulsa).
- **Recálculo automático** de `custo_hora` (hora-homem/máquina) e `valor_contábil`/depreciação
  acumulada: o **motor existe e está testado**, mas os cadastros gravam o valor informado (não
  recalculam on-the-fly). Sugestão: recalcular no server action num próximo ajuste.
- **Rateio automático** de centro de custos sobre as vendas: função `rateio` pronta e testada, ainda
  **não aplicada** automaticamente na análise por venda.
- **Baixa de bem (ganho/perda)**: campos presentes; fluxo dedicado de baixa não implementado.
- **RLS/RPCs/multiloja**: verificação de runtime exige o **staging no ar** — não foi executada aqui
  (rede bloqueada neste ambiente). Garantia atual: build/lint/typecheck + testes unitários do motor.

## Como atualizar o staging
1. Extensão: atualizar o projeto de staging para o novo commit da branch dev.
2. Supabase de staging: rodar `supabase/migrations/0003_financeiro.sql` e **reexecutar**
   `supabase/seed-staging.sql` (idempotente — concede as permissões novas).
3. Redeploy do Preview e rodar `npm run test:staging` (com as variáveis) + homologar as telas.

## Confirmação
Production/`main` não alteradas. Módulos anteriores preservados.
