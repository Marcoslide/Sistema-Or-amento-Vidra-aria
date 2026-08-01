# App Next.js — Sub-lote 3: Comercial (Vendas)

Migra o módulo comercial do protótipo V6 para Next.js + Supabase. Um **único fluxo
de Vendas**: nasce como `ORÇAMENTO` e evolui pelo ciclo de vida até `FINALIZADA`.
Nada de Financeiro/Produção/Obras/Agenda/Documentos neste lote (a transformação em
venda gera os lançamentos financeiros mínimos, mas o módulo Financeiro completo é o App 4).

## Branch / deploy

Trabalho na branch de **desenvolvimento** `claude/orcamentos-vidracarias-esquadrias-jl63nl`.
Organização acordada: `claude/...` (dev) → `staging` (homologação) → `main` (produção).
O Supabase **não aponta para branch**: usa projetos/variáveis/migrations separados por ambiente.

## Motor de cálculo (portado 1:1 do V6)

- `src/lib/commercial/calc.ts` — puro (sem React/DOM), reutilizado por UI, PDF e servidor.
  - Regras: `M2`, `ML`, `PERIMETRO`, `UN`/`BARRA`/`CHAPA`/`KIT`, **`MOLDURA`**.
  - `MOLDURA`: consumo = `(2·largura + 2·altura) + (larguraMolduraCm × multiplicador)/100`, em
    metros × quantidade. Ex.: 40×60 cm, perfil 5 cm × 8 = **2,40 m**. Sem largura de perfil = 0.
  - Dinheiro com `r2` (2 casas) no nível do item; no banco, colunas `numeric` (nunca Float).
- `tests/commercial/calc.test.ts` — 10 casos (`node --test`): M2=3 m², UN=5, ML=25,2,
  MOLDURA acrésc 0,40 / 40×60=2,40 / qtd3=7,20 / sem largura=0 / total R$72, calcOrc=230, margem=48.
  Rodar: `npm run test:calc` → **10/10**.

## Migration

`supabase/migrations/0001_commercial.sql` (idempotente):
- Colunas em `sales`: `situacao`, `obs`, `obs_interna`, `prazo_dias`, `condicao (jsonb)`,
  `entrada_prevista`, `custo_prev`, `margem_prev`.
- Tabela `sale_status_history` (org, sale, campo, de, para, usuário, obs) + RLS org-scope.
- **RPC `fn_transformar_venda`** — `SECURITY INVOKER` (roda sob a RLS do usuário),
  **transacional e idempotente**:
  - chave de idempotência repetida → no-op; `venda_gerada` já `true` → no-op (anti clique-duplo);
  - entrada limitada a `[0, total]`; saldo nunca negativo;
  - gera as parcelas (`receivables`), o recebimento da entrada (`receivable_payments`,
    `idempotency_key` único) e **um único** `cash_movements` com `store_id` da venda (sem fallback L1).

## Server actions (validação NO servidor + auditoria)

`src/lib/data/vendas-actions.ts` (`"use server"`):
- `salvarOrcamento(id, orc)` — checa permissão (`vendas.proprias|loja|todas`), **loja obrigatória,
  existente e ativa**, cliente obrigatório; calcula `total/custo_prev/margem_prev` com o **motor**
  (nunca confia em total do cliente); numeração por loja (`max+1`); grava ambientes/itens/medidas;
  **bloqueia edição** de venda já confirmada; auditoria.
- `duplicarOrcamento(id)` — clona cabeçalho + filhos como novo orçamento.
- `mudarSituacao(id, nova, obs?)` — avança o ciclo e registra em `sale_status_history`.
- `excluirOuCancelarVenda(id)` — **exclusão segura**: orçamento sem vínculo é excluído; venda
  confirmada ou com recebimentos é **cancelada (preservada)**, nunca apagada.
- `transformarEmVenda(id, dados)` — chama a RPC com chave de idempotência.

## Leituras (client, RLS-scoped)

`src/lib/data/vendas-core.ts`: `listVendas`, `getVenda` (com ambientes/itens/medidas),
`getHistorico`, opções para o construtor (`listLojasSel/listClientesSel/listVendedoresSel/
listProdutosSel`) e `meuContexto` (vendedor automático + lojas do usuário). Erro **nunca vira mock**:
propaga `ConnectionError` para a tela.

## Rotas / componentes

- `/orcamentos` — **lista de Vendas** com badges de situação, filtros por etapa, busca,
  duplicar e excluir/cancelar (menu de ações).
- `/orcamentos/novo` e `/orcamentos/[id]` — usam `OrcamentoBuilder`
  (`src/components/comercial/orcamento-builder.tsx`): loja obrigatória, cliente, **vendedor
  automático**, ambientes/itens/**múltiplas medidas**, campos MOLDURA, preço/override, desconto por
  item e geral, acréscimo/frete/instalação, obs cliente/interna, prazo, condição; **totais, custo e
  margem em tempo real** pelo mesmo motor; barra de total fixa. Venda confirmada abre em leitura.
- `/orcamentos/[id]` — painel de **situação** (avançar no ciclo), **transformar em venda**
  (`TransformarModal`, idempotente/anti-duplo-clique) e **histórico**.
- `/orcamentos/[id]/pdf` — documento do cliente com **identidade da loja da venda** (nunca mistura
  lojas), itens/quantidades/totais, condições e observações. Custo/margem/memória de cálculo são
  internos — **não** aparecem no PDF do cliente.

## Invariantes / idempotência

- Total, custo e margem calculados **no servidor** com o motor puro.
- Transformação em venda é **transacional** e **idempotente** (RPC + `idempotency_key`).
- Entrada ∈ `[0, total]`; **saldo nunca negativo**; **um** movimento de caixa por entrada.
- `cash_movements.store_id` = loja da venda (sem fallback L1).
- Exclusão segura preserva histórico financeiro (cancela em vez de apagar).

## Qualidade (zero erros)

`npx tsc --noEmit` → 0 · `npm run lint` → 0 · `npm run build` → 0 · `npm run test:calc` → 10/10.
(A pasta `tests/` foi excluída do `tsconfig` do app pois roda via `node --test` com `.ts` explícito.)

## Limitações que dependem do staging (não afirmadas como testadas)

- **RLS por empresa/loja/vendedor** e **sincronização entre aparelhos** exigem o **Supabase de
  homologação no ar** com dois usuários reais. O código aplica os escopos e as validações no
  servidor, mas os testes de runtime **não foram executados** — a verificação atual é
  build/lint/typecheck verde + testes unitários do motor.
- Numeração por loja usa `max+1` (suficiente para staging); sob altíssima concorrência,
  recomenda-se sequência dedicada — a avaliar no endurecimento pós-homologação.

## Confirmação

Módulos fora do Comercial não foram alterados. Sub-lote App 3 concluído.
**Aguardando autorização para o App 4 — Financeiro.**
