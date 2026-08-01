# Bloco 1 — Matriz de Funcionalidades → Destino Fase 2

Legenda de status: **OK** = presente e testado no congelado. Todos preservados (§2).
"Módulo API" = módulo NestJS de destino. "Rota web" = rota Next.js de destino.

## Dashboard e navegação

| Funcionalidade | Status | Módulo API | Rota web | Bloco |
|---|---|---|---|---|
| Dashboard (indicadores, atalhos) | OK | `dashboard` (agregações) | `/dashboard` | 5-8 |
| Router/menu por permissão e loja | OK | `auth`/`rbac` | layout + guards | 3 |

## Cadastros

| Funcionalidade | Status | Módulo API | Rota web | Bloco |
|---|---|---|---|---|
| Clientes (+CEP autofill) | OK | `clientes` | `/clientes` | 4 |
| Produtos | OK | `produtos` | `/produtos` | 4 |
| Famílias / Tipos | OK | `familias` | `/familias` | 4 |
| Fornecedores | OK | `fornecedores` | `/fornecedores` | 4 |
| Vendedores | OK | `vendedores` | `/vendedores` | 4 |
| Contas de recebimento | OK | `contas-fin` | `/contas` | 4 |
| Operadoras de cartão | OK | `operadoras` | `/operadoras` | 4 |
| Lojas (multiloja, editável) | OK | `stores` | `/lojas` | 3 |
| Usuários (editável) | OK | `users` | `/usuarios` | 3 |
| Perfis e permissões | OK | `rbac` | `/perfis` | 3 |
| Configurações da empresa (logo, foro BH/MG, rodapé) | OK | `settings` | `/configuracoes` | 4 |

## Comercial

| Funcionalidade | Status | Módulo API | Rota web | Bloco |
|---|---|---|---|---|
| Orçamento (cliente→obra→ambientes→produtos→medidas→cálculo) | OK | `orcamentos` | `/orcamentos` | 5 |
| Cálculo automático (m²/unidade/ml/perímetro) | OK | `orcamentos` (pricing) | — | 5 |
| Descontos, condições, pagamentos | OK | `orcamentos` | — | 5 |
| Seleção de loja ao abrir orçamento | OK | `orcamentos` | — | 5 |
| Transformação orçamento → venda | OK | `vendas` | `/vendas` | 5 |
| Situação comercial / acompanhamento | OK | `vendas` | `/acompanhamento` | 5 |
| PDF do cliente (nome, ambiente, valor) | OK | `document-templates` | `/orcamentos/:id/pdf` | 9 |
| Contrato e Termo (foro BH/MG) | OK | `document-templates` | — | 9 |

## Operacional

| Funcionalidade | Status | Módulo API | Rota web | Bloco |
|---|---|---|---|---|
| Produção (processos, status) | OK | `producao` | `/producao` | 7 |
| Terceirização | OK | `producao` | `/producao` | 7 |
| Obras (diários, fotos) | OK | `obras` | `/obras` | 7 |
| Agenda / Visita técnica | OK | `agenda` | `/agenda` | 7 |
| Reclamações (ciclo de status, atendimentos) | OK | `reclamacoes` | `/reclamacoes` | 7 |

## Financeiro

| Funcionalidade | Status | Módulo API | Rota web | Bloco |
|---|---|---|---|---|
| Contas a receber (títulos, baixa total/parcial, estorno) | OK | `financeiro` | `/contas-receber` | 6 |
| Contas a pagar (situações, baixa, estorno) | OK | `financeiro` | `/contas-pagar` | 6 |
| Caixa (movimentos, saldo, conciliação) | OK | `financeiro` | `/caixa` | 6 |
| Idempotência + transação em baixas/estornos | novo | `financeiro` | — | 6 |
| Análise por venda (custo/margem/lucro) | OK | `financeiro`/`custos` | `/analise-venda` | 8 |

## Custos e Ponto de Equilíbrio

| Funcionalidade | Status | Módulo API | Rota web | Bloco |
|---|---|---|---|---|
| Centro de custos (rateio, base) | OK | `custos` | `/centro-custos` | 8 |
| Custos diretos por venda (participaMargem) | OK | `custos` | `/analise-venda` | 8 |
| Hora-Homem (salário + componentes valor/%) | OK | `custos` | `/centro-custos` | 8 |
| Hora-Máquina (aquisição, manutenção, energia) | OK | `custos` | `/centro-custos` | 8 |
| Depreciação de bens | OK | `custos` | `/centro-custos` | 8 |
| Ponto de equilíbrio gerencial (falta/ritmo/meta/projeção) | OK | `custos` | `/ponto-equilibrio` | 8 |

## Transversais

| Funcionalidade | Status | Módulo API | Rota web | Bloco |
|---|---|---|---|---|
| Multiloja (isolamento em todas as telas) | OK | todos (tenant guard) | — | 3 |
| Auditoria (log de ações) | OK | `audit` | — | 3-6 |
| Documentos/imagens | OK | `arquivos` (S3) | — | 9 |
| PWA instalável / mobile | OK | web (manifest+SW) | — | 10 |
| Filtros, rascunhos, cache | OK | web (localStorage) | — | 10 |
