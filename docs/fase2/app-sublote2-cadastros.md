# App Next.js — Sub-lote 2: Cadastros (Supabase)

Migração dos cadastros para o app Next.js ligado ao Supabase. Nada de comercial,
financeiro, produção, obras, documentos ou deploy neste lote.

## Correção pedida — sem mock silencioso

`src/lib/data/mode.ts`: com Supabase configurado, **falha de conexão vira erro
explícito** (`ConnectionError`) exibido na tela — **nunca** dados fictícios. Mock só
em **modo dev declarado** (sem variáveis de ambiente). Aplicado a Clientes e a todos
os novos cadastros.

## Arquitetura (reutilizável, sem "telas pela metade")

- `src/lib/data/cadastro-core.ts` — leituras RLS-scoped com erro estrito.
- `src/lib/data/cadastro-actions.ts` — **server actions** com validação **no servidor**:
  permissão (`role_permissions`), **exclusão segura** (conta vínculos; bloqueia e o app
  oferece inativar), inativar/reativar, duplicar e salvar — tudo com **auditoria**.
- `src/components/cadastro/cadastro-view.tsx` — tela genérica: lista, busca, filtro por
  loja, seleção em massa (inativar/reativar/excluir), form completo, badges de status,
  fluxo de exclusão segura.

## Cadastros migrados (Supabase real)

| Cadastro | Rota | Tabela | Vínculo que bloqueia exclusão |
|----------|------|--------|-------------------------------|
| Lojas | `/lojas` | `stores` | vendas, clientes, contas, CP/CR, caixa, usuários |
| Vendedores | `/vendedores` | `sellers` | vendas |
| Famílias | `/familias` | `product_families` | produtos |
| Fornecedores | `/fornecedores` | `suppliers` | produtos |
| Produtos | `/produtos` | `products` | itens de venda |
| Contas financeiras | `/contas` | `financial_accounts` | recebimentos, pagamentos, operadoras |
| Operadoras | `/operadoras` | `card_operators` | recebimentos |

- **Ordem respeitada:** Famílias antes de Produtos (a regra de cálculo pertence à família).
- **MOLDURA:** o produto persiste `regra=MOLDURA`, `largura_moldura_cm` e
  `multiplicador_corte` (campos aparecem quando a regra é MOLDURA) — prontos para o
  módulo de orçamento (próximo lote).
- **Sem loja padrão silenciosa:** selects de loja vêm de `stores` ativas; `store_id`
  vazio grava `null` (nunca "L1").

## Regras preservadas

Criar, editar, duplicar, inativar, reativar, exclusão segura, seleção em massa, busca,
filtro por loja, permissões (checadas na server action), bloqueio por vínculo e
auditoria. Cada cadastro é **completo** — não foi migrado pela metade.

## Qualidade (zero erros)

- `npx tsc --noEmit` → **0**
- `npm run build` → **0** (19 rotas compiladas)
- `npm run lint` → **0**

## Ainda nesta trilha (continuação do sub-lote de cadastros)

- **Usuários** e **Perfis/Permissões**: acoplados ao Supabase Auth (profiles +
  user_stores + role_permissions) — exigem telas dedicadas (matriz de permissões,
  vínculo de lojas) e serão a continuação imediata.
- **Faixas de parcelas/taxas** da Operadora (jsonb) — editor dedicado junto do financeiro.
- **Testes de runtime** (criar/recarregar/persistir, RLS, dois usuários, isolamento por
  vendedor/loja) exigem o **staging Supabase no ar** — dependem das suas contas
  (ver `deploy/DEPLOY-STAGING.md`). O código está pronto para esses testes assim que o
  ambiente existir.

## Limitações honestas

- Não há como executar os testes de banco/RLS/2-usuários aqui sem uma instância
  Supabase real (credenciais suas). Verificação atual = build/lint/typecheck verdes +
  lógica de exclusão segura já testada no protótipo (v6, 477/477).
- Módulos fora de cadastros **não foram alterados**.
