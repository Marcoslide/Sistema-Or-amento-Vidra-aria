# Bloco 1 — Evidências no arquivo congelado

Linhas referentes ao `legacy/vidrogestor-congelado.html` (v2, 4.024 linhas).
Verificação byte a byte com a fonte de trabalho: **idênticos** (`cmp` sem diferenças;
mesmo MD5/SHA-256 registrados em `legacy/HASHES.txt`).

## 1. Matriz de funcionalidades com evidência

| Funcionalidade | Função/view no HTML | Linha aprox. | Teste relacionado |
|---|---|---:|---|
| Fluxo unificado orçamento→venda | `buildToOrc` / `persist` / `transformarVenda` | 1820 / 1828 / 2281 | unif, fintest, lote |
| Loja obrigatória no orçamento | select Loja no builder + `validarLojaNovoLancamento` | 1633 / 3165 | auditoria A3/A10, multiloja |
| Multiloja (escopo/isolamento) | `scopeLojas` / `lojaPermitida` / `podeVerOrc` | 3149 / 3151 / 3152 | multiloja |
| Fonte de operações ativas | `lojasAtivas` / `lojasSelecionaveis` | 3162 / 3168 | auditoria A2/A7 |
| Cadastro e edição de lojas | `openLojaForm` / `salvarLoja` + aba lojas | 2821 / 2833 / 2914 | auditoria A1 |
| Inativação e reativação de lojas | `toggleLoja` | 2840 | auditoria A6/A12/A15 |
| Usuários e permissões | `openUsuarioForm`/`salvarUsuario`; `PERMS`/`DB.perfis` | 2841 / 2787 / 2791 | final, regras |
| Situação comercial | `setSituacao` + view `acompanhamento` | 2975 / 1122 | lote, unif |
| Reclamações com status | `RECL_ST` / `reclStatusSet` / views reclam. | 3303 / 3341 | lote, lote2 |
| Visita técnica e Agenda | `salvarVisita` / `VIEWS.agenda` / `agenda-visita` | 1203 / 2385 / 3064 | lote2 |
| Produção e terceirização | `VIEWS.producao` / `salvarTerc` / `producao-det` | 2396 / 2520 | reaudit, lote2 |
| Obras | `VIEWS.obras`/`VIEWS.obra` / `obrasVisiveis` | 2006 / 3289 | lote2 |
| Contas a Receber | `contasReceberVisiveis` / `salvarReceb` / `receberParcela` | 3290 / 1937 / 1954 | fintest, auditoria B1 |
| Contas a Pagar | `cpSalvar` / `cpSituacao` / `cpBaixar` | 2687 / 2540 | fintest |
| Caixa | `caixaSaldo` / `addCaixa` | 623 / 624 | fintest, reaudit, auditoria B2 |
| Análise por Venda | `abrirAnaliseVenda` / views + `margemVenda` | 3852 / 2999 | lote3, auditoria C1 |
| Centro de Custos | `VIEWS["centro-custos"]` / `centrosCustoVisiveis` | 3552 / 3294 | lote3 |
| Custos administrativos | `custosVisiveis` / `DB.custos` | 3288 | lote3 |
| Hora-Homem | `custoMensalMaoObra` / `custoHoraHomem` | 3938 / 3472 | lote3 |
| Hora-Máquina | `custoMensalMaquina` / `custoHoraMaquina` | 3939 / 3469 | lote3 |
| Depreciação | `depMensalBem` / `valorContabilBem` | 3464 / 3466 | lote3 |
| Ponto de Equilíbrio | `peDados` / `pePeriodo` | 3726 / 3714 | lote |
| Contrato | `gerarContrato` | 3199 | unif |
| Termo de entrega | `gerarTermo` | 3206 | unif |
| PDFs (cliente/produção) | `pdfAbrir` / `VIEWS.pdf` | 2304 | unif, printtest |
| Mobile (responsivo) | CSS responsivo + `.cp-tablewrap` global | <head> | mobile |
| PWA | `<link manifest>` / `serviceWorker` / `beforeinstallprompt` | 8 / 4004 / 4013 | mobile |

## 2. O que cada suíte de teste realmente exercita

| Suíte | Qtde | O que testa de fato |
|-------|-----:|---------------------|
| final | 57 | Estrutura de navegação/menu por permissão, cadastros, render de todas as views sem erro, seeds. Mistura checagens de estado com presença de elementos. |
| reaudit | 35 | **Estado real**: gerar venda e iniciar produção **não** movimentam o caixa (compara saldo antes/depois); fluxos de produção. |
| unif | 52 | Fluxo unificado orçamento→venda, PDF, contrato/termo, situação comercial; interação + render. |
| fintest | 12 | **Estado financeiro real**: cria conta a pagar, dá baixa total/parcial, estorno, recebimentos, checando `caixaSaldo`/`cpSituacao`/`orcRecebido` antes e depois. |
| regras | 37 | Regras comerciais: descontos por perfil/vendedor, limites de parcelas, permissões de preço/margem. |
| multiloja | 13 | **Isolamento real por loja**: alterna `CURR_LOJA` e confere que registros de outra loja somem das listagens. |
| mobile | 36 | Responsividade em larguras móveis + manifesto/ícones PWA (majoritariamente estrutural). |
| lote | 47 | Reclamações, multiloja transversal, contrato/foro, financeiro, Ponto de Equilíbrio (com filtros de período). |
| lote2 | 48 | Reclamações completas (ciclo de status), agenda/visita, produção/terceirização, obras. |
| lote3 | 26 | **Cálculo real**: Análise por venda (custo/margem recalculada), Hora-Homem/Hora-Máquina (componentes valor/%), depreciação, remoção da Visão financeira; guard de permissão por chamada direta. |
| **auditoria-funcional** | 23 | **Ação→estado→propagação** no navegador: lojas ativas/inativas transversais, guards por chamada direta, propagação receb→CR→Caixa→PE, custo→margem. |

### Leitura honesta

As 10 suítes originais (363) cobrem bem **cálculo financeiro, isolamento multiloja e
regras**, com várias asserções de estado real (reaudit, fintest, multiloja, lote3).
Porém **não cobriam a propagação do status ativo/inativo de lojas** — por isso a
falha só apareceu na auditoria funcional dedicada. A suíte `auditoria-funcional`
fecha essa lacuna e passa a fazer parte da bateria (386 no total).
