# Relatório de Diferenças — v2 → v3 (congelamento final da Fase 1)

| Versão | Arquivo | Bytes | Linhas | MD5 |
|--------|---------|------:|------:|-----|
| v2 | `legacy/vidrogestor-congelado-v2.html` | 574.495 | 4.024 | `ff0ddf50f9accd41d1febec985d1749e` |
| v3 | `legacy/vidrogestor-congelado-v3.html` | 580.072 | 4.068 | `5a92ab172b47cf7e48727ccaf140d82c` |

SHA-256 v3: `cc6611b02d229ab9e4d7b1131db24fc627a85649fce1b79d180fc007b2ff02e3`

## Funcionalidades novas

- **Regra de cálculo MOLDURA** (família Molduras): consumo por quadro
  `(2×largura + 2×altura) + (largura da moldura × multiplicador)`, em metros × quantidade.
  Presente e testada em orçamento, venda, análise por venda, custo previsto, margem,
  ordem de produção e PDF de produção; alimenta Centro de Custos e Ponto de Equilíbrio
  pelos mesmos custos/margens. Campos no produto (`larguraMolduraCm`, `multiplicadorCorte`)
  e na família (`multiplicadorPadrao`), com auto-preenchimento. Produto demo `p13`.
  PDF do cliente **inalterado** (sem memória técnica).

## Correções / bugs eliminados

- **Fallback de loja "L1" eliminado dos movimentos financeiros e operacionais:**
  - `addCaixa` ganhou parâmetro explícito `lojaId` e passou a **derivar a loja da
    origem** (venda do pedido → `CURR_LOJA`) e a **bloquear** quando indeterminável, com a
    mensagem *"Não foi possível determinar a operação responsável por este movimento
    financeiro."* — nunca mais cria movimento em L1 silenciosamente.
  - Pagamento/estorno de contas a pagar passam a informar a **loja da conta** ao caixa.
  - `_lojaDefault` (novo orçamento) usa a **primeira loja ativa permitida**, sem "L1".
  - Literais `lojaId:"L1"` removidos de `cpSalvar` (série e avulsa) — a loja vem do
    formulário validado (`validarLojaNovoLancamento`).
  - CP gerado por reclamação deriva a loja da **venda de origem**, sem "L1".
  - Backfill de seed de vendas deixou de usar `||"L1"` (usa mapeamento por vendedor).

## Regressões encontradas (durante este lote) e corrigidas

- Ao remover o fallback, o **seed** quebrou porque `seedReceb` rodava antes de as vendas
  demo receberem `lojaId` (e antes de `DB.lojas` existir). **Corrigido**: as vendas demo
  passam a receber a loja logo após a criação, antes dos recebimentos seed.
- A suíte `fintest` fazia um estorno manual chamando `addCaixa` sem loja (contrato
  antigo). **Atualizada** para informar a loja da conta, espelhando o app.

## Melhorias

- Auditoria funcional ampliada com o **Grupo E** (eliminação do L1): bloqueio sem
  origem, recebimento herdando a loja da venda, pagamento herdando a loja da conta.
- Nova suíte `moldura.js` (25 testes) incorporada à bateria.

## Ocorrências de "L1" remanescentes (todas legítimas)

- **Id real da loja** `L1` ("Loja Mantiqueira") no cadastro de lojas.
- **Dados de demonstração** (seed): arrays de acesso de usuários, contas a pagar demo,
  custos/mão de obra/bens demo e o mapa de vinculação demo por vendedor.
- **Nenhum** padrão de fallback de runtime: `||"L1"`, `?? "L1"`, `DB.lojas[0]`,
  `scopeLojas()[0]`, `lojaPadrao`, `defaultStore` — confirmado por varredura.

## Bateria de testes (v3)

| Suíte | Resultado |
|-------|-----------|
| Regressão (10 suítes) | 363/363 |
| Auditoria funcional (com Grupo E) | 26/26 |
| MOLDURA | 25/25 |
| **Total** | **414/414 · 0 erro JS** |
