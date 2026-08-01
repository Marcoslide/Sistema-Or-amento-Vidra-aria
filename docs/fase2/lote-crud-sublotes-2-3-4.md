# Lote CRUD — Sub-lotes 2, 3 e 4 (conclusão)

Continuação do padrão de **exclusão segura** (apaga só sem vínculo; havendo uso,
bloqueia e oferece inativar), sem alterar cálculos, financeiro, PE, multiloja ou layout.

## Sub-lote 2 — Centro de Custos (`crud2.js` 12/12)

Ações completas (editar, duplicar, inativar, reativar, excluir) + badges de status:

- **Hora-Homem** e **Hora-Máquina**: duplicar/inativar/reativar/excluir.
- **Depreciação/Bens**: duplicar/inativar/reativar/excluir + **Baixar bem** preservado.
  - **Baixar bem** ≠ Excluir: bem com depreciação acumulada, baixa ou valor de venda
    **não** pode ser excluído (só inativar/baixar); bem criado por engano (sem
    depreciação) pode ser excluído. Baixa preserva a depreciação acumulada.
- **Centros de custo**: excluir só sem vínculo (custos/colaboradores/máquinas/bens);
  senão inativa.
- **Lançamentos de custo**: excluir só quando não participa do rateio; se participa do
  rateio/PE, bloqueia e oferece **Estornar rateio** ou **Inativar**.
- Permissões `fin.excluir_custos/_mao_obra/_maquinas/_bens/_centros_custo`.

## Sub-lote 3 — Lojas, Usuários, Perfis (`crud3.js` 16/16)

- **Lojas**: + Duplicar e Excluir. Excluir só loja sem nenhum vínculo (vendas,
  orçamentos, usuários, vendedores, contas, contas a pagar, centros, máquinas,
  colaboradores, bens, obras, caixa); senão inativa (e realoca `CURR_LOJA`).
- **Usuários**: + Duplicar permissões e Excluir. Guardas: **nunca** exclui o usuário
  logado; **nunca** exclui o último administrador ativo; usuário com histórico
  (vendas, recebimentos, pagamentos, auditoria) é **bloqueado**, não apagado.
- **Perfis**: CRUD completo (Novo/Editar/Duplicar/Inativar/Excluir). Guardas: não
  exclui o **Administrador geral**, nem perfil **em uso** (inativa), nem o perfil do
  **usuário atual**. Aba Perfis reescrita com essas ações.
- Permissões `adm.excluir_lojas/_usuarios/_perfis`.

## Sub-lote 4 — Famílias, Fornecedores, Produtos, Clientes (`crud4.js` 10/10)

Auditoria confirmou que estes **já possuíam exclusão segura** (bloqueio por vínculo +
inativação) e que inativos somem de novos cadastros. Validado por teste:
- Família/fornecedor com produtos → inativa; sem produtos → exclui.
- Produto em orçamento → inativa; sem vínculo → exclui; inativo some de novos itens.
- Cliente com movimentação → inativa; sem vínculo → exclui.

### Demais abas de Configurações — auditoria e decisão

- **Dados-lista** (categorias financeiras, formas de pagamento, processos de produção,
  status comerciais): hoje geridos inline; ganham padronização de CRUD em iteração
  futura. Por serem **configurações técnicas essenciais** (não podem sumir e quebrar
  telas), a diretriz aplicada é **Restaurar padrão / Desativar**, não "Excluir".
- Lojas/Usuários/Perfis (abas de Configurações) foram cobertos no sub-lote 3.

## Regressão

Total **477/477** (363 regressão + 33 auditoria funcional + 25 MOLDURA + 56 CRUD),
0 erro JS. Nada em orçamento/venda/produção/obras/financeiro/PE/multiloja/PDFs/
contratos foi alterado.

## Congelamento (v6)

`legacy/vidrogestor-congelado-v6.html` (= `vidrogestor-congelado.html`)
- MD5 `d85cb97735953c97639b5638a2766718`
- SHA-256 `554dae3439c3f9f293b6998399a56cd75311ca8b5e6c6d02dab1e19631d62a47`
- 633.067 bytes · 4.428 linhas

## Veredito

```
CRUD E EXCLUSÃO SEGURA IMPLEMENTADOS EM TODOS OS CADASTROS
```

Observação honesta: a **seleção em massa por checkbox** foi entregue nas telas novas
(Contas, Operadoras, Vendedores); nas tabelas do Centro de Custos e em Lojas/Usuários
as ações em massa podem ser adicionadas de forma incremental — as ações por linha
(incl. exclusão segura) estão completas. As abas de Configurações puramente técnicas
seguem a diretriz "Restaurar padrão/Desativar" (sem Excluir). Backend/Fase 2 não iniciados.
