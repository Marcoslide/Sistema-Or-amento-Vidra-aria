# Spec — Cadastro de Produtos & Orçamentos / Transformar em Venda

> Documento gerado a partir do código real do sistema **VidroGestor** (branch `feature/paridade-v6`, commit `8aa6229`). Objetivo: servir de referência para replicar **copy, regras de negócio, funcionalidades e layout** destes dois módulos em outro sistema. Tudo abaixo reflete o comportamento efetivamente implementado — não há suposições nem regras "inventadas".

---

## 1. Modelo de dados (tabelas envolvidas)

```sql
products (
  id, organization_id,
  descricao text not null,
  codigo text,
  familia text,              -- nome da família (texto, não FK)
  fornecedor text,           -- nome do fornecedor (texto, não FK)
  regra text not null default 'UN',   -- M2 | ML | PERIMETRO | UN | BARRA | CHAPA | KIT | MOLDURA
  preco numeric(14,2) not null default 0,
  custo_base numeric(14,2) default 0,
  largura_moldura_cm numeric(8,2) default 0,   -- só usado quando regra = MOLDURA
  multiplicador_corte numeric(8,2) default 8,  -- só usado quando regra = MOLDURA
  ativo boolean not null default true
)

sales (                       -- "venda" = registro único que nasce como orçamento
  id, organization_id, store_id,
  production_store_id, execution_store_id,
  numero bigint,               -- sequencial por loja/organização, começa em 1001
  cliente_id, cliente_nome, seller_id, vend_nome,
  obra_nome, obra_endereco,
  status text default 'ORCAMENTO',      -- espelho legado
  situacao text default 'ORCAMENTO',    -- campo de verdade da máquina de estados
  venda_gerada boolean default false,   -- true assim que "transformada em venda"
  desc_pct, acrescimo, frete, instalacao,
  obs, obs_interna, prazo_dias, condicao,
  total, custo_prev, margem_prev,
  created_by, created_at, updated_by, updated_at
)

sale_environments (id, sale_id, nome)                       -- "ambientes" (ex.: Sala, Cozinha)
sale_items (id, sale_id, environment_id, product_id, regra, desc_pct numeric(6,2), preco_override numeric(14,2))
sale_measures (id, item_id, l numeric, a numeric, q integer default 1, unit text default 'cm')  -- medidas do item

sale_status_history (id, sale_id, campo, de, para, obs, user_id, created_at)  -- auditoria de mudança de situação
```

---

## 2. Módulo: Cadastro de Produtos

### 2.1 Copy / textos exatos

| Elemento | Texto |
|---|---|
| Título da página | **Produtos** |
| Descrição (subtítulo) | *"Cadastre a família antes do produto (a regra de cálculo pertence à família). Produto usado em vendas não pode ser excluído — apenas inativado."* |
| Botão criar | **+ Novo** |
| Placeholder busca | **Buscar...** |
| Colunas da tabela | Produto · Família · Regra · Preço · Status · Ações |
| Diálogo criar/editar | **Novo — Produtos** / **Editar — Produtos** |
| Botões diálogo | **Cancelar** / **Salvar** |
| Chip de status | **Ativo** (verde) / **Inativo** (cinza) |
| Menu de ações por linha | Editar · Duplicar · Inativar / Reativar · Excluir |
| Diálogo de exclusão bloqueada | Título: **"Não é possível excluir"**. Corpo: *"Este cadastro possui utilização no sistema e não pode ser apagado:"* + lista de vínculos (`N <label>`) + *"Para preservar o histórico, o cadastro pode ser **inativado**."* Botões: **Fechar** / **Inativar cadastro** |
| Barra de seleção em massa | **"N selecionado(s)"** + botões **Inativar / Reativar / Excluir / Limpar** |

### 2.2 Campos do formulário (ordem exata)

| Campo | Tipo | Obrigatório | Observações |
|---|---|---|---|
| Descrição | texto | sim | ocupa linha inteira (2 colunas) |
| Código | texto | não | SKU/código interno livre |
| Família | select (`product_families.nome`) | não | lista dinâmica das famílias ativas |
| Fornecedor | select (`suppliers.nome`) | não | lista dinâmica dos fornecedores ativos |
| Regra de cálculo | select, ver tabela 2.3 | não (default `UN`) | define como a quantidade é calculada no orçamento |
| Preço de venda (por unidade da regra) | número | não | preço unitário na unidade da regra escolhida |
| Custo base | número | não | usado para calcular custo/margem prevista |
| Largura da moldura (cm) | número | **só aparece se regra = MOLDURA** | largura do perfil de alumínio/PVC |
| Multiplicador técnico de corte | número (default 8) | **só aparece se regra = MOLDURA** | fator de acréscimo de corte da moldura |
| Ativo | checkbox | — | soft-delete (inativo não aparece nas seleções de orçamento) |

Valores default de um produto novo: `regra: "UN"`, `multiplicador_corte: 8`, `preco: 0`, `custo_base: 0`, `ativo: true`.

### 2.3 As 8 regras de cálculo (`regra`)

| Valor | Rótulo exibido | Unidade de venda |
|---|---|---|
| `M2` | Metro quadrado (m²) | m² |
| `ML` | Metro linear (m) | m |
| `PERIMETRO` | Perímetro (m) | m |
| `UN` | Unidade (peça) | un |
| `BARRA` | Barra | un |
| `CHAPA` | Chapa | un |
| `KIT` | Kit | un |
| `MOLDURA` | Moldura (metro linear) | ver regra especial abaixo |

### 2.4 Comportamento funcional (CRUD genérico "CadastroView")

Produtos usa um componente de cadastro genérico reaproveitado em quase todas as telas de cadastro do sistema (clientes, fornecedores, vendedores, contas, etc). Comportamentos padrão:

- **Busca**: filtra em tempo real por `descricao`, `codigo`, `familia` (client-side, case-insensitive, "contains").
- **Seleção em massa**: checkbox por linha → aparece barra de ações (Inativar/Reativar/Excluir/Limpar).
- **Duplicar**: cria uma cópia do registro.
- **Exclusão segura ("safe delete")**: ao tentar excluir, o backend verifica se o registro tem vínculo real em outra parte do sistema (ex.: produto usado em algum item de venda). Se houver vínculo, a exclusão é **bloqueada** e o sistema oferece **inativar** em vez de apagar — nunca perde histórico. Sem vínculo, exclui de fato.
- **Inativar/Reativar**: toggle de `ativo`, não afeta histórico.
- **Diálogo de criar/editar**: grid 2 colunas, campos condicionais (`showWhen`) aparecem/somem dinamicamente (ex.: campos de moldura só quando regra = MOLDURA).
- Produtos inativos não aparecem nos selects de produto do orçamento (`listProdutosSel` filtra `ativo=true`).

### 2.5 Layout / classes visuais (V6)

- Cabeçalho de página: título (`v6-page-title`) + descrição (`v6-page-desc`) + botão primário à direita (`v6-btn v6-btn-primary`).
- Cartão contêiner: `v6-card`.
- Barra de busca: `v6-search` (ícone de lupa + input).
- Tabela: `v6-tbl`, com coluna de checkbox (36px), colunas dinâmicas, coluna Status (chip) e coluna Ações (dropdown com ícone "⋯").
- Chip "Ativo": fundo verde claro `#dcfce7`, texto `#15803d`, borda `#86efac`. Chip "Inativo": estilo neutro (`v6-chip`).
- Diálogo modal: `max-w-2xl`, grid responsivo (1 coluna mobile, 2 colunas desktop), altura máxima com scroll (`max-h-[60vh] overflow-y-auto`).
- Botões do diálogo: secundário com borda (`v6-btn`), primário sólido (`v6-btn v6-btn-primary`), perigo com fundo vermelho claro (para "Excluir").

---

## 3. Módulo: Orçamentos / Transformar em Venda

### 3.1 Conceito central

**Não existem duas entidades separadas "orçamento" e "venda".** Existe um único registro em `sales` que percorre uma máquina de estados (campo `situacao`). "Orçamento" é apenas o estado inicial. "Transformar em venda" é a ação que confirma o orçamento, gera a entrada/parcelas financeiras e trava a edição comercial.

### 3.2 Máquina de estados (`situacao`)

```
ORCAMENTO → VENDA_CONFIRMADA → PRODUCAO → PRONTO_EXECUCAO → EXECUCAO → FINALIZADA
                    ↓                ↓            ↓             ↓
                CANCELADO       CANCELADO    CANCELADO     CANCELADO
```

| Situação | Rótulo exibido | Cor do badge |
|---|---|---|
| `ORCAMENTO` | Orçamento | neutro |
| `VENDA_CONFIRMADA` | Venda confirmada | padrão |
| `PRODUCAO` | Em produção | amarelo/aviso |
| `PRONTO_EXECUCAO` | Pronto para execução | padrão |
| `EXECUCAO` | Em execução | amarelo/aviso |
| `FINALIZADA` | Finalizada | verde/sucesso |
| `CANCELADO` | Cancelada | vermelho/destrutivo |

**Regras de transição (críticas — não simplificar):**

1. `VENDA_CONFIRMADA → PRODUCAO`: permitido manualmente. Ao acontecer, o sistema **cria de fato uma Ordem de Produção** (não é só trocar o texto do status) — chama uma rotina transacional que cria a OP + suas etapas + itens de produção, e só então marca `situacao = PRODUCAO`.
2. `PRODUCAO → PRONTO_EXECUCAO`: **NUNCA é uma transição manual.** Só ocorre automaticamente quando a Ordem de Produção é concluída (todas as etapas aplicáveis concluídas + terceirizações recebidas/conferidas). A tela de venda **não oferece** botão para isso enquanto em `PRODUCAO` — a única ação manual disponível nesse estado é "Cancelar".
3. `PRONTO_EXECUCAO → EXECUCAO`: manual, mas o backend **valida de novo** que existe uma Ordem de Produção com status `CONCLUIDA` antes de liberar; se houver etapas pendentes ou terceirizações não recebidas/conferidas, a transição é bloqueada com mensagem detalhando exatamente o que falta (ex.: *"Produção não concluída — não é possível liberar para execução. Pendências: 2 etapa(s) não concluída(s)."*).
4. `EXECUCAO → FINALIZADA`: manual.
5. Qualquer estado ativo → `CANCELADO`: manual, disponível como opção de cancelamento.
6. Clicar duas vezes na mesma transição é **idempotente** (não duplica, não gera erro): se a situação já é a solicitada, retorna sucesso sem fazer nada.
7. Ao entrar em `EXECUCAO`, o sistema cria automaticamente **uma Obra** vinculada à venda (se ainda não existir uma) — nome `"Obra — <cliente>"`, status `execucao`, progresso `0`.
8. Toda mudança de situação grava uma linha em histórico (`sale_status_history`): campo, valor anterior, valor novo, usuário, observação opcional, timestamp.

### 3.3 Motor de cálculo comercial (regras de quantidade e preço)

Módulo puro (sem UI), usado tanto no client quanto no servidor, para garantir que o valor calculado na tela seja idêntico ao valor persistido no banco.

**Conceitos de entrada:**
- Uma **medida** tem: largura (`l`), altura (`a`), quantidade (`q`, inteiro ≥ 0), unidade (`cm` | `mm` | `m`, padrão `cm`).
- Toda medida é convertida internamente para metros antes de calcular (`mm/1000`, `cm/100`, `m` direto).
- Um **item** tem: produto (opcional — pode ser avulso), `regra`, `desc_pct` (desconto % do item), `preco_override` (sobrepõe o preço do produto), lista de medidas.

**Fórmula de quantidade faturável por medida, conforme a regra:**

| Regra | Fórmula (por medida) |
|---|---|
| `M2` | `largura(m) × altura(m) × q` |
| `ML` | `largura(m) × q` |
| `PERIMETRO` | `(2×largura + 2×altura)(m) × q` |
| `MOLDURA` | `[(2×largura + 2×altura) + acréscimo_técnico](m) × q` — ver 3.4 |
| `UN` / `BARRA` / `CHAPA` / `KIT` | `q` (não usa largura/altura) |

**Total do item:**
```
preço = preco_override, se informado, senão o preço do produto
quantidade = soma das quantidades de todas as medidas do item
bruto = quantidade × preço
desconto = bruto × (desc_pct / 100)
total do item = bruto − desconto
```

**Total do orçamento:**
```
subtotal = soma do total de todos os itens
desconto geral = subtotal × (desc_pct geral / 100)
total = subtotal − desconto geral + acréscimo + frete + instalação
```

**Custo e margem previstos (visíveis só a quem tem permissão financeira):**
```
custo previsto = soma( quantidade_item × custo_base_do_produto )
lucro previsto = total do orçamento − custo previsto (− custos extras, se houver)
margem % = lucro / receita × 100  (0 se receita = 0)
```

Todos os valores monetários são arredondados para 2 casas decimais em cada etapa (nunca ponto-flutuante cru).

### 3.4 Regra especial MOLDURA (a mais delicada — não simplificar)

A regra MOLDURA modela o consumo de perfil de alumínio/PVC ao redor de um vidro/painel, incluindo a perda técnica do corte em 45°.

- **Acréscimo técnico de corte** = `(largura_da_moldura_cm × multiplicador_corte) / 100` metros. Se a largura da moldura não estiver cadastrada no produto (`largura_moldura_cm = 0`), o acréscimo é 0 **e a quantidade calculada é 0** (bloqueia cálculo sem dado).
- **Quantidade interna (usada para preço/custo)** = perímetro (2×largura + 2×altura, em metros) **+ acréscimo técnico**, multiplicado pela quantidade de peças. Essa é a métrica que efetivamente multiplica o preço unitário.
- **Quantidade exibida ao cliente (na "via do cliente" / PDF)** = **NUNCA o metro linear interno.** Para MOLDURA, mostra apenas o número de peças/quadros (`q`, ex.: "3 un"). É uma regra de negócio aprovada explicitamente: o cliente não deve ver "5,40 m" quando comprou "1 janela" — ele vê "1 un" ou "3 un", conforme a quantidade de peças informada. As demais regras (M2, ML, etc.) mostram a métrica comercial normal (ex.: "3,00 m²") tanto internamente quanto na via do cliente.
- Exemplo real (dos testes automatizados do sistema): moldura com perfil de 5 cm e multiplicador 8 → acréscimo = 0,40 m. Um vão de 40×60 cm, 1 peça → quantidade interna = 2,40 m (perímetro 2,00 m + acréscimo 0,40 m). Um vão de 100×150 cm, 1 peça → quantidade interna ≈ 5,40 m, mas a via do cliente mostra **"1"** (1 unidade/quadro), não "5,40".
- Texto de ajuda exibido no builder quando o item é MOLDURA: *"Moldura: perfil `<largura>` cm × mult `<multiplicador>` — consumo = perímetro + acréscimo de corte."*
- Uma "memória de cálculo" textual (uso interno, nunca no PDF do cliente) é exibida ao lado de cada medida, ex.: `"perím 2.00 m + acrésc 0.40 m × 1 = 2.40 m"`.

### 3.5 Layout do construtor de orçamento (Orçamento Builder)

Grid responsivo de 2 colunas no desktop: coluna principal (flexível) + coluna lateral fixa de 340px com painel de resumo `sticky` (acompanha o scroll). Em telas menores, empilha em 1 coluna.

**Cabeçalho da página**: título dinâmico — `"Novo orçamento"` (criação) ou `"Orçamento #<numero>"` (edição). Descrição: *"Cliente, ambientes, itens e condições comerciais."* (ou aviso de bloqueio, ver abaixo). Botões: **Voltar** e **Salvar orçamento** (topo, atalho equivalente ao "Salvar rascunho" do resumo).

**Coluna principal** (desabilitada inteira via `<fieldset disabled>` quando a venda já foi confirmada):

1. **Card "Cabeçalho comercial"** (grid 3 colunas):
   - **Loja da venda \*** — select obrigatório.
   - **Cliente \*** — select de clientes cadastrados; se nada selecionado, mostra input de texto livre "Nome do cliente (avulso)" (permite orçamento sem cadastro prévio). Link **"+ Novo cliente"** abre modal de cadastro rápido (ver 3.6) sem perder os dados já preenchidos no formulário.
   - **Vendedor** — select opcional; pré-preenchido automaticamente com o vendedor vinculado ao usuário logado, se houver, e apenas em criação nova (nunca sobrescreve edição existente).
   - **Obra** — texto livre, nome da obra (opcional).
   - **Endereço da obra** — texto livre (opcional, ocupa 2 colunas).
   - Loja também é pré-selecionada automaticamente se o usuário só tem acesso a uma única loja.

2. **Cards "Ambientes"** (um card por ambiente, lista dinâmica):
   - Nome do ambiente (input editável, default "Ambiente").
   - Botão **+ Item** (adiciona item ao ambiente) e botão de lixeira para remover o ambiente (desabilitado se for o único).
   - Para cada **item** dentro do ambiente, uma linha de card interno com:
     - **Produto** — select (mostra `descrição (REGRA)`).
     - **Regra** — campo somente leitura, herdado do produto escolhido (tooltip: "Definida pelo produto").
     - **Preço un.** — número, placeholder = preço do produto; se preenchido, sobrepõe o preço do produto só para este item.
     - **Desc %** — desconto percentual do item.
     - **Total item** — valor calculado, exibido em destaque à direita.
     - Botão de lixeira para remover o item (desabilitado se for o único item do ambiente).
     - Se regra = MOLDURA: texto de ajuda explicando o consumo (ver 3.4).
     - **Medidas** (uma ou mais linhas por item, ocultas para regras UN/BARRA/CHAPA/KIT que não precisam de medida): Largura, Altura (só para M2/MOLDURA/PERIMETRO), Unidade (cm/mm/m), Quantidade, e um texto de memória de cálculo ao lado. Botão **+ medida** para adicionar mais uma linha de medida ao mesmo item (múltiplas aberturas iguais no mesmo ambiente).
   - Botão **"+ Adicionar ambiente"** ao final da lista.

3. **Card "Condições comerciais"** (grid 2 colunas): Desconto geral (%), Acréscimo (R$), Frete (R$), Instalação (R$), Prazo (dias), Condição de pagamento (texto livre, ex.: "30% entrada + 2×").

4. **Card "Observações"**: Observações (cliente) — textarea, visível no documento do cliente. Observações internas — textarea, uso interno apenas.

**Coluna lateral — Card "Resumo"** (fixo/sticky):
- Contadores: `"N ambiente(s) · N item(ns) · N medida(s)"`.
- Linhas: Subtotal, Desconto (negativo), Acréscimo/Frete/Instalação (só aparecem se > 0).
- **Total** em destaque (fonte grande, cor primária).
- Se o usuário tem permissão financeira: linhas extras "Custo prev." e "Margem" (com cor verde se positiva, vermelha se negativa) — **vendedor comum não vê essas duas linhas**.
- Dois botões de ação (somem quando a venda já está confirmada):
  - **"Gerar orçamento / transformar"** (botão primário) — salva e redireciona para a tela do orçamento com o modal de transformação em venda já aberto.
  - **"Salvar rascunho"** (botão secundário, com ícone de cópia) — salva sem avançar de estado.

**Aviso de bloqueio** (quando `venda_gerada = true`): banner amarelo no topo — *"Esta venda já foi confirmada. Edições de orçamento estão bloqueadas para preservar o histórico financeiro."* Toda a coluna principal fica somente leitura.

### 3.6 Cadastro rápido de cliente (modal dentro do orçamento)

Título: **"Cadastro rápido de cliente"**. Campos (grid 2 colunas):
- Tipo (select: Pessoa física / Pessoa jurídica)
- CPF ou CNPJ (rótulo muda conforme o tipo)
- Nome / Razão social * (obrigatório, ocupa 2 colunas)
- Telefone
- WhatsApp
- E-mail (ocupa 2 colunas)
- CEP
- Endereço
- Cidade
- UF (máx. 2 caracteres)

Botões: **Cancelar** / **Salvar e selecionar**. Ao salvar com sucesso, o novo cliente é automaticamente selecionado no formulário do orçamento (sem perder o restante dos dados já preenchidos) e passa a existir também na base de clientes.

### 3.7 Modal "Transformar em venda"

Título: **"Transformar em venda"**. Conteúdo:
- Bloco de destaque: **"Total da venda: R$ X"**.
- **Entrada (R$)** — número.
- **Forma** — select: Dinheiro, Pix, Cartão, Boleto, Transferência.
- **Parcelas do saldo** — número inteiro, mínimo 1.
- **Saldo a parcelar** — campo somente leitura, calculado como `max(0, total − min(entrada, total))` (a entrada nunca pode exceder o total; se exceder, é limitada ao total).
- Texto explicativo: *"Gera um único movimento de caixa para a entrada e as parcelas do saldo. A operação é idempotente: cliques repetidos não duplicam o lançamento."*
- Botões: **Cancelar** / **Confirmar venda** (mostra "Processando..." e fica desabilitado durante a chamada).
- **Idempotência**: um identificador único é gerado na primeira tentativa e reaproveitado em reenvios (garante que clique duplo ou timeout de rede não gere lançamento duplicado).

### 3.8 O que acontece ao "transformar em venda" (regras de negócio no banco)

Processo transacional único (RPC), executado de uma vez:
1. Marca a venda como `venda_gerada = true` e situação `VENDA_CONFIRMADA`.
2. Gera os títulos de recebíveis (parcelas) referentes ao **saldo** (total − entrada), distribuídos conforme o número de parcelas informado.
3. Se houver entrada > 0, registra imediatamente a baixa da entrada como um recebimento (gera **um único movimento de caixa**).
4. Toda a operação é protegida por uma chave de idempotência: reenviar a mesma operação (mesmo `idem`) não duplica nada — retorna o resultado já processado.
5. A partir daqui a venda não pode mais ser editada como orçamento (ver bloqueio em 3.5) — qualquer alteração comercial passa a ser feita só por meio da máquina de estados (produção, execução) ou por operações financeiras (recebimento de parcela, estorno), nunca reabrindo os itens/ambientes.

### 3.9 Regras de exclusão/cancelamento de um orçamento/venda

- Se a venda **não** foi transformada em venda (`venda_gerada = false`) e **não** tem nenhum recebível gerado: **exclusão física** é permitida (apaga ambientes/itens/medidas em cascata).
- Se a venda já foi confirmada (`venda_gerada = true`) **ou** já existe pelo menos um recebível vinculado: a exclusão é **bloqueada** e convertida automaticamente em **cancelamento** (`situacao = CANCELADO`) — nunca apaga um registro com rastro financeiro. O histórico registra o motivo: *"Cancelamento (venda com vínculo)"*.
- Ao listar, o botão de ação mostra **"Cancelar venda"** quando já é venda gerada, ou **"Excluir"** quando ainda é rascunho de orçamento — com confirmação (`confirm()`) diferenciada: *"Cancelar esta venda? (preserva histórico)"* vs. *"Excluir este orçamento?"*.

### 3.10 Duplicar orçamento

Copia loja, cliente, vendedor, obra, condições comerciais, observações e toda a árvore de ambientes/itens/medidas para um **novo** registro (novo número sequencial), sempre como orçamento novo (nunca herda `situacao`/`venda_gerada`). O nome do cliente recebe o sufixo `" (cópia)"`.

### 3.11 Numeração

Número sequencial por **loja + organização**, começando em 1001 (`max(numero existente) + 1`, ou `1001` se ainda não houver nenhum).

### 3.12 Permissões

- Criar/editar orçamento requer pelo menos uma das permissões: `vendas.proprias`, `vendas.loja` ou `vendas.todas`.
- Transformar em venda requer `vendas.editar`, `vendas.todas`, `vendas.loja` ou `vendas.proprias`.
- Ver **Custo previsto** e **Margem** no resumo requer, respectivamente, `fin.ver_custos` e `fin.ver_margem` — um vendedor comum tipicamente não enxerga essas duas linhas mesmo estando na mesma tela.
- Toda ação de venda/loja é sempre restrita à `organization_id` do usuário logado (isolamento multi-tenant); a loja precisa existir e estar ativa (`stores.ativo = true`) para receber novos lançamentos.

### 3.13 Tela de listagem (Vendas / Orçamentos)

- Título: **Vendas**. Descrição: *"Registro único do ciclo comercial: orçamento → venda → produção → execução → finalização."*
- Botão **"+ Novo orçamento"**.
- 6 cards de indicadores no topo: Orçamentos, Aguardando produção, Em produção, Prontos p/ execução, Finalizados (contagens) + Saldo a receber (soma monetária).
- Abas horizontais por situação (chips clicáveis, com contagem): Todos, Orçamentos, Vendas confirmadas, Em produção, Prontos para execução, Em execução, Finalizados, Cancelados.
- Filtros: busca (número, cliente, obra, vendedor), select de vendedor, select de status financeiro (A receber / Parcial / Recebido), select de período, select de ordenação (Mais recentes, Mais antigos, Maior valor, Menor valor). Ordenação e período **persistem durante a sessão do navegador** (sessionStorage), sem precisar de F5.
- Colunas da tabela: Nº · Cliente/Obra · Loja · Vendedor · Situação · Total · Recebido · Saldo · Financeiro · Ações (Abrir, Duplicar, Excluir/Cancelar).
- Status financeiro por linha, calculado como: `"Recebido"` se saldo ≤ 0; `"Parcial"` se já recebeu algo mas ainda tem saldo; `"A receber"` se nada recebido ainda; `"—"` se ainda é orçamento (não gerado como venda).

---

## 4. Resumo das regras "não óbvias" a preservar na réplica

1. Orçamento e venda são **o mesmo registro** em ciclo de vida único, não tabelas separadas.
2. MOLDURA calcula internamente em metro linear com acréscimo técnico de corte, mas **mostra ao cliente apenas a quantidade de peças**, nunca o metro linear.
3. `PRODUCAO → PRONTO_EXECUCAO` nunca é manual — só via conclusão real da ordem de produção.
4. "Em produção" precisa **criar de fato** a Ordem de Produção (etapas, itens), não apenas mudar um texto de status.
5. Toda exclusão de venda com vínculo financeiro vira cancelamento, nunca apaga.
6. Transformar em venda é transacional + idempotente (chave única evita duplicidade em duplo clique/retry de rede).
7. Preço unitário pode ser sobrescrito por item (`preco_override`), sem alterar o cadastro do produto.
8. Cliente pode ser avulso (texto livre) sem cadastro prévio, ou cadastrado rapidamente sem sair do orçamento.
9. Vendedor e loja são pré-preenchidos automaticamente conforme o contexto do usuário logado (evita passos manuais redundantes), mas só em novos lançamentos.
10. Custo e margem são informações sensíveis, ocultas por permissão — não é apenas uma questão de layout, é controle de acesso a dado financeiro.
