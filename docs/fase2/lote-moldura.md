# Lote — Regra de cálculo MOLDURA

Correção cirúrgica: nova regra de cálculo `MOLDURA`, vinculada à família **Molduras**,
sem alterar nenhuma outra funcionalidade. Não é backend.

## Fórmula (preservada conforme especificação)

```
Consumo por quadro = (2 × largura) + (2 × altura) + (largura da moldura × multiplicador)
```

em centímetros, convertido para metros, multiplicado pela quantidade de quadros.
O acréscimo técnico é aplicado **individualmente a cada quadro**.

Exemplo oficial (40 × 60 cm, moldura 5 cm, multiplicador 8):

```
Perímetro:        (40×2) + (60×2) = 200 cm = 2,00 m
Acréscimo:        5 × 8 = 40 cm = 0,40 m
Consumo unitário: 200 + 40 = 240 cm = 2,40 m
Valor (R$30/m):   2,40 × 30 = R$ 72,00
```

## O que foi implementado

- `REGRAS.MOLDURA` (código estável `MOLDURA`, sufixo `m`, dimensões largura+altura).
- Funções puras: `molduraMult`, `molduraAcrescimoM`, caso `MOLDURA` em `qtdMedida`,
  `memoMedida` e `memoMolduraDetalhe` (memória "Como foi calculado?").
- `qtdMedida`/`memoMedida` ganharam parâmetro opcional `prod` (produto), propagado nos
  pontos de valor, custo e margem: `totalItem`, `custoProdutoItem`, análise por venda,
  linhas do builder (`medQtd`/`medTotal`) e memórias de produção/contrato/termo.
- Família predefinida **Molduras** (`regra: MOLDURA`, `unidade: m`, `multiplicadorPadrao: 8`);
  campo de multiplicador padrão no cadastro da família.
- Produto: campos `larguraMolduraCm` e `multiplicadorCorte` (exibidos só quando a regra é
  MOLDURA; multiplicador editável apenas por `adm.config`); auto-preenchimento a partir da
  família; validação que **não** assume largura silenciosamente.
- Builder de orçamento: colunas Largura/Altura/Un./Qtd./Consumo/Total para MOLDURA.
- Produto demo `p13` "Moldura preta 5 cm" (R$30/m, custo R$10/m) para uso e teste.
- PDF do cliente **inalterado** (sem memória técnica); via de produção mostra consumo/cálculo.

## Testes (`legacy/tests/moldura.js`) — 25/25 PASS

Cobrem: cálculo básico 40×60, acréscimo, valor R$72, quantidade 3 (7,20 m / R$216),
perfil 3 cm (2,24 m), múltiplas medidas (13,40 m), outras famílias intactas (M2/UN/ML/
PERIMETRO), PDF cliente sem memória técnica, produção com técnico, custo/margem na
análise por venda, validações (sem largura/dim/qtd = 0; multiplicador padrão 8),
família/produto predefinidos e bloqueio de salvar moldura sem largura.

## Regressão

- 10 suítes originais: **363/363**
- Auditoria funcional: **23/23**
- MOLDURA: **25/25**
- **Total 411/411 · 0 regressão · 0 erro JS**

## Congelamento

`legacy/vidrogestor-congelado.html` v3 — 579.613 bytes · 4.062 linhas
- MD5 `ee55cdda36732bfb7bd18194456b518d`
- SHA-256 `5360b41083f5498b0926ad753780c651095d14b2c9fc491bb5bfee02aef31985`

## Veredito

```
REGRA DE MOLDURA IMPLEMENTADA SEM ALTERAR O RESTANTE DO SISTEMA
```

Backend não iniciado neste lote.
