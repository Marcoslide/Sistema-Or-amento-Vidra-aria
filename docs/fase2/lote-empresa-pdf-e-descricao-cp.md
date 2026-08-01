# Lote — Dados da empresa nos documentos + Descrição no Contas a Pagar

Duas melhorias cirúrgicas, sem alterar cálculos nem a estrutura comercial dos documentos.

## A. Divergência de hash (resolvida)

O arquivo `vidrogestorstandalone (5).html` baixado é **byte-idêntico** ao
`legacy/vidrogestor-standalone.html` (MD5 `c1d494b9…`, SHA-256 `7db528b4…`, 580.023 bytes).
A única diferença para o congelado v3 é a linha `<link rel="manifest">` (removida no
standalone para abrir por `file://` no celular). **Fonte oficial = o arquivo
`vidrogestor-congelado-vN.html`** (com manifest), nunca o standalone.

## B. Dados da empresa nos PDFs (componente central)

- Cabeçalho central `pdfHead(o,titulo)` (usado por PDF do cliente, ordem de produção,
  contrato e termo) agora exibe **logo, nome fantasia, razão social, CNPJ, IE,
  endereço completo, telefone, WhatsApp, e-mail e site**.
- Helper `enderecoEmpresaTexto(empresa)` monta o endereço em linhas limpas
  (sem vírgula/hífen/barra sobrando quando um campo falta).
- `empresaDoc(o)`: fonte de identidade do documento — usa o bloco fiscal da loja
  quando existir (completo), senão a empresa; **nunca mistura** campos de operações
  diferentes. (Perfil fiscal por loja fica disponível no registro da loja; o formulário
  dedicado por loja é item da Fase 2/backend — hoje usa os dados da empresa.)
- Rodapé central `pdfFooter(o,tipoDoc)` em todos os documentos: empresa, CNPJ,
  telefone, e-mail e identificação do documento — **sem repetir o endereço** do cabeçalho.
- Configurações → Empresa ganhou endereço estruturado (CEP com **autofill via ViaCEP**,
  logradouro, número, complemento, bairro, cidade, UF) + inscrição municipal e site.
- Validação `validarDadosEmpresa()` reforça a checagem antes de emitir contrato
  (razão/fantasia, CNPJ, endereço, cidade/UF, telefone ou e-mail) com atalho para
  Configurações.

## C. Contas a Pagar — Descrição da despesa

- Novo campo **Descrição da despesa** (obrigatório), separado do **Fornecedor**
  (agora **opcional**). Ex.: "Aluguel" / Fornecedor "BH Imóveis"; ou "Combustível" sem fornecedor.
- Listagem passa a mostrar **Descrição** (principal) + **Fornecedor**; a busca localiza
  por descrição **ou** fornecedor.
- Caixa: o lançamento do pagamento usa a **descrição** como título (com o fornecedor
  entre parênteses quando houver).
- CP gerado por reclamação usa descrição "Assistência técnica — reclamação #N".
- PDFs/relatórios mostram a descrição como identificação principal, sem "Fornecedor: -".

## Testes

- `auditoria-funcional.js` Grupo F (7 testes): endereço completo, sem pontuação
  sobrando, cabeçalho com endereço/WhatsApp/e-mail/CNPJ, rodapé sem repetir endereço,
  validação de empresa, CP exige descrição e fornecedor opcional, busca por ambos.
- `fintest.js`/`final.js` atualizados para o novo campo obrigatório e para o endereço
  estruturado (contrato real de formulário mudou).
- **Bateria: 421/421** (363 regressão + 33 auditoria funcional + 25 MOLDURA), 0 erro JS.

## Congelamento

`legacy/vidrogestor-congelado-v4.html` (= `vidrogestor-congelado.html`)
- MD5 `647495bdc9e8dc7884bb6c9fd9e03ffa`
- SHA-256 `49e4d4a19a039fe1705a81038c12ab64d13a613c41c213cfb368fcecb8c6a4b2`
- 585.084 bytes · 4.114 linhas

## Nota para a Fase 2 (modelagem)

O contrato real deste HTML identifica a regra de cálculo pelo campo **`regra`**
(valor `"MOLDURA"`), não `codigoRegra`. O Prisma deve modelar o campo como `regra`
(ou mapear explicitamente), preservando o valor `"MOLDURA"`.

## Veredito

```
DADOS DA EMPRESA NOS DOCUMENTOS + DESCRIÇÃO NO CONTAS A PAGAR IMPLEMENTADOS SEM REGRESSÃO
```

Backend não iniciado.
