# Bloco 1 — Plano de Migração (memória → PostgreSQL/Prisma)

Mapeia as coleções do objeto `DB` (protótipo) para entidades relacionais. A fonte
oficial passa a ser o PostgreSQL; localStorage vira apenas cache/rascunho/offline.

## 1. Multitenancy (novo — base de tudo)

```
Organization (1) ─── (N) Workspace (1) ─── (N) Store
     │                                        │
     └── (N) User ── (N) UserStore ──────────┘
User (N) ── (1) Role ── (N) RolePermission ── (N) Permission
```

- **Organization** — empresa/tenant raiz (ex.: Conceito Glass).
- **Workspace** — agrupamento lógico dentro da organização (ex.: matriz + filiais).
- **Store** — loja (equivale a `DB.lojas`).
- **User** — usuário com login real (equivale a `DB.usuarios`, com senha/hash).
- **UserStore** — vínculo N:N usuário↔loja (equivale a `usuario.lojas[]`).
- **Role** — perfil (equivale a `DB.perfis`).
- **Permission / RolePermission** — permissões (as chaves `fin.*`, `vendas.*`, etc.).

**Todo registro operacional recebe:** `organizationId`, `workspaceId`, `storeId`,
`createdBy`, `createdAt`, `updatedBy`, `updatedAt`. IDs de negócio por loja:
`storeSaleId`, `storeProductionId`, `storeExecutionId` (sequência por loja).

## 2. Mapa coleção `DB` → entidade Prisma

| Coleção em memória | Entidade Prisma | Observações |
|---|---|---|
| `DB.config.empresa` | `OrganizationSettings` | logo, CNPJ, foro BH/MG, rodapé, garantia |
| `DB.config.{regras,pagamentos,producao,financeiro,documentos,centroCusto}` | `Settings` (JSON versionado) | configurações por organização |
| `DB.lojas` | `Store` | multiloja |
| `DB.usuarios` | `User` (+ `UserStore`) | senha com hash (argon2/bcrypt) |
| `DB.perfis` | `Role` (+ `RolePermission`) | matriz de permissões |
| (chaves de permissão) | `Permission` | seed fixo a partir do congelado |
| `DB.vendedores` | `SalesRep` | |
| `DB.clientes` (`cliById`) | `Customer` | +endereço/CEP |
| `DB.produtos` (`prodById`) | `Product` | unidade de cálculo, preço |
| `DB.familias`, `DB.tipos` | `ProductFamily`, `ProductType` | |
| `DB.fornecedores` | `Supplier` | |
| `DB.contas` | `FinancialAccount` | contas de recebimento |
| `DB.operadoras` | `CardOperator` | taxas/prazos |
| `DB.orcamentos` (`orcByN`) | `Quote` | status ORCAMENTO/venda |
| orçamento.ambientes | `QuoteRoom` | ambiente |
| ambiente.itens | `QuoteItem` | produto no ambiente |
| item.medidas | `QuoteItemMeasure` | múltiplas medidas |
| orçamento.pagamentos/condições | `QuotePayment` / `PaymentTerm` | |
| orçamento (vendaGerada) | `Sale` | transformação em venda |
| orçamento.parcelas | `Receivable` (título) | contas a receber |
| orçamento.recebimentos | `ReceivablePayment` | baixas (idempotentes) |
| `DB.contasPagar` | `Payable` | +`PayablePayment` para baixas |
| `DB.caixa` (`saldoInicial`,`movimentos`) | `CashRegister` / `CashMovement` | conciliação |
| `DB.categoriasFin` | `FinancialCategory` | |
| `DB.obras` | `Project` (obra) | +`ProjectDiary`, `ProjectPhoto` |
| produção (orçamento.producao) | `Production` / `ProductionProcess` | processos/status |
| terceirização | `Outsourcing` | |
| agenda / visita técnica | `AgendaEvent` / `TechnicalVisit` | |
| `DB.conferencias` | `Inspection` | |
| reclamações | `Complaint` / `ComplaintUpdate` | ciclo `RECL_ST` |
| `DB.centrosCusto` | `CostCenter` | |
| `DB.custos` | `Cost` | +`CostAllocation` (rateio) |
| custosExtras por venda | `SaleDirectCost` | `participaMargem` |
| `DB.maoObra` | `Labor` (+`LaborComponent`) | valor/percentual |
| `DB.maquinas` | `Machine` (+`MachineComponent`) | manutenção/energia |
| `DB.bens` | `Asset` | depreciação |
| `DB.pontoEq` | `BreakEvenConfig` | lucroDesejado, limiares |
| análises por venda | derivado (query) | não persiste; calculado |
| `DB.docs` | `Document` (S3) | contrato/termo/PDF/imagens |
| `DB.auditoria` | `AuditLog` | ação, ator, antes/depois |

## 3. Regras e cálculos (portados 1:1 para `packages/shared`)

Funções puras extraídas do congelado, sem alterar fórmulas (§35):
`calcOrc`, `orcRecebido`, `orcSaldoF`, `orcTotalF`, `custoProdutosVenda`,
`custoExtrasVenda`, `rateioVenda`, `margemVenda`, `custoMensalMaoObra`,
`custoHoraHomem`, `custoMensalMaquina`, `custoHoraMaquina`, `depMensalMaquina`,
`depMensalBem`/`depAcumuladaBem`/`valorContabilBem`, `peDados`, `pePeriodo`,
situações de contas (`cpSituacao`), etc. **Os testes atuais viram testes de
regressão do pacote compartilhado** — qualquer divergência de fórmula reprova.

## 4. Estratégia de migração de dados (controlada, §35)

1. Seed de **desenvolvimento** com os dados fictícios do congelado (Conceito Glass,
   clientes/produtos/orçamentos demo) — Bloco 2.
2. **Não** importar dados reais sem autorização explícita e migração revisada.
3. Migrations Prisma versionadas; nenhuma migração destrutiva sem aprovação (§35).
4. Backups antes de qualquer carga real (Bloco 11/12).

## 5. Persistência local (contingência/cache)

Permitido no cliente: token de sessão, preferências de UI, filtros, rascunho de
orçamento não enviado, cache de leitura e fila offline limitada. **Nunca** como
fonte de verdade — o servidor reconcilia ao reconectar.
