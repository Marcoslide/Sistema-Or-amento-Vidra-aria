# Fechamento da Fase 1 — Versão oficial para a modelagem da Fase 2

Arquivo de referência único: **`legacy/vidrogestor-congelado-v3.html`**
(cópia idêntica em `legacy/vidrogestor-congelado.html`).

- MD5 `5a92ab172b47cf7e48727ccaf140d82c`
- SHA-256 `cc6611b02d229ab9e4d7b1131db24fc627a85649fce1b79d180fc007b2ff02e3`
- 580.072 bytes · 4.068 linhas

## Verificação para a Fase 2 — presente na v3

- [x] Fluxo atual de Vendas (Orçamento é **status inicial** da mesma entidade — não é
      entidade/aba separada que faz o pedido "sumir")
- [x] Produção (processos, terceirização)
- [x] Obras (diário, fotos, checklist, termo)
- [x] Reclamações (ciclo de status)
- [x] Situação comercial
- [x] Agenda / visita técnica
- [x] Multiloja (isolamento + lojas ativas/inativas transversais)
- [x] Usuários
- [x] Permissões (RBAC no cliente; será replicado no servidor na Fase 2)
- [x] Centro de Custos
- [x] Hora-Homem
- [x] Hora-Máquina
- [x] Depreciação
- [x] Ponto de Equilíbrio (gerencial)
- [x] Análise por Venda
- [x] Contrato
- [x] Termo de Entrega
- [x] PDFs (cliente e produção)
- [x] Regra especial da família **Moldura**
- [x] Movimentos financeiros sem fallback silencioso de loja

Esta versão v3 é a **única fonte** para modelar banco e backend na Fase 2.

## Bateria de testes (reprodutível)

```bash
export NODE_PATH=$(pwd)/node_modules
cd legacy/tests
for t in final reaudit unif fintest regras multiloja mobile lote lote2 lote3 auditoria-funcional moldura; do node $t.js; done
```

Resultado: **414/414** (363 regressão + 26 auditoria funcional + 25 MOLDURA), 0 erro JS.
Mobile validado em 360/390/768; PWA: manifest + service worker (instalável em
localhost/HTTPS; não por `file://` — documentado).

## Veredito

```
VERSÃO FINAL CONGELADA (V3) — APTA PARA MODELAGEM DA FASE 2
```

Prisma, PostgreSQL, NestJS, Next.js, migrations, seed e backend **não** foram
iniciados. Aguardando autorização expressa para o Bloco 2.
