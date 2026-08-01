# Lote CRUD — Sub-lote 1: Exclusão segura + Contas, Operadoras, Vendedores

Escopo escolhido: começar pelas telas que estavam **"em desenvolvimento"**.
Não altera orçamento, vendas, produção, obras, financeiro, cálculos, PE, PDFs,
contratos, multiloja nem layout.

## Infraestrutura reutilizável (base para os próximos sub-lotes)

- `excluirSeguro({perm,tipoLabel,nome,vinc,onExcluir,onInativar})` — modal único:
  se há vínculos, **bloqueia** e oferece **inativar**; se não há, confirma **exclusão
  definitiva**. Valida permissão internamente (não depende do botão estar oculto).
- Contadores de vínculo: `vinculosConta`, `vinculosOperadora`, `vinculosVendedor`.
- `crudMassBar(scope,…)` + ações em massa (inativar/reativar/excluir; a exclusão em
  massa apaga só os sem vínculo e inativa os vinculados, reportando o resumo).
- Permissões `fin.excluir_contas`, `fin.excluir_operadoras`, `cad.excluir_vendedores`
  criadas e concedidas a admin/admin_loja (e financeiro para contas/operadoras).
- Toda ação registra auditoria (criar/editar/duplicar/inativar/reativar/excluir).

## Contas financeiras (antes: "Nova conta • em desenvolvimento")

CRUD real com campos: nome, tipo, banco, agência, número, dígito, titular, CPF/CNPJ,
loja, saldo inicial, data do saldo, aceita entradas/saídas, conta padrão, ativo, obs.
Ações: criar, editar, duplicar, inativar, reativar, excluir, exclusão em massa.
**Exclusão bloqueada** quando há recebimentos, pagamentos, operadora vinculada ou
loja usando a conta → só inativação.

## Operadoras de cartão (antes: "Nova operadora • em desenvolvimento")

CRUD com: nome, loja, conta de recebimento, tipo (crédito/débito/ambos), bandeiras,
prazo, parcelas e taxas (`1:2.2, 3:4.5`), antecipação, taxa de antecipação, ativo, obs.
**Exclusão bloqueada** quando há recebimentos vinculados → só inativação.

## Vendedores (antes: "Novo vendedor • em desenvolvimento")

CRUD com: nome, e-mail, telefone, usuário vinculado, lojas de atuação, limite de
desconto, meta, comissão, ativo, obs. **Exclusão bloqueada** quando há vendas ou
usuário vinculado → só inativação.

## Testes (`legacy/tests/crud.js`) — 18/18 PASS

Placeholders removidos; migração de modelo (id); criar/editar/duplicar/inativar/
reativar; excluir sem vínculo (definitivo); bloqueio + inativação com vínculo
(conta "Banco Inter", operadora "Stone", vendedor "Carla"); guard de permissão por
chamada direta; exclusão em massa; render das 3 telas.

## Regressão

Total **439/439** (363 regressão + 33 auditoria funcional + 25 MOLDURA + 18 CRUD),
0 erro JS.

## Congelamento (v5)

`legacy/vidrogestor-congelado-v5.html` (= `vidrogestor-congelado.html`)
- MD5 `00e3d68ee2ef14956d41c6fa681957b4`
- SHA-256 `95ad5e16f755c7d6f1c8c415e8bc0655a123845f3673de9c170f4e398d9e7c97`
- 614.333 bytes · 4.304 linhas

## Ainda pendente (próximos sub-lotes do lote de CRUD)

- Sub-lote 2: exclusão segura + editar/duplicar/inativar/reativar em Hora-Homem,
  Hora-Máquina, Depreciação/Bens (com "Baixar bem"), Centros de Custos e Lançamentos
  de Custos (estorno de rateio).
- Sub-lote 3: exclusão segura com guardas críticas em Lojas (excluir vazia),
  Usuários (não apagar logado / último admin) e Perfis (não apagar em uso / admin).
- Sub-lote 4: padronização das demais abas de Configurações + famílias/fornecedores/
  produtos/clientes.

## Veredito (parcial — sub-lote 1)

```
CRUD E EXCLUSÃO SEGURA IMPLEMENTADOS EM CONTAS, OPERADORAS E VENDEDORES (SUB-LOTE 1)
```

Backend/Fase 2 não iniciados.
