# Bloco 1 — Veredito

## Checklist de saída

- [x] HTML autoritativo congelado em `legacy/vidrogestor-congelado.html` (v2).
  - MD5 `ff0ddf50f9accd41d1febec985d1749e`
  - SHA-256 `8ff18e1bdde56fbd558343056b46049ce3155f9585a53fd2664ce8c815555057`
  - 574.495 bytes · 4.024 linhas · `legacy/HASHES.txt` com histórico v1→v2.
- [x] Confirmação **byte a byte** entre o congelado e a fonte de trabalho (`cmp`: idênticos).
- [x] Todas as funcionalidades confirmadas presentes (matriz + evidências no arquivo).
- [x] **Auditoria funcional real** executada no navegador (ação → estado → propagação),
  não apenas verificação de texto/função.
- [x] 6 falhas de *lojas ativas/inativas* encontradas, **corrigidas** e **retestadas**;
  evidência do estado que falhava preservada (`bloco1-auditoria-funcional.md`).
- [x] Regressão: 363/363 · Auditoria funcional: 23/23 · **386/386 total, 0 erro JS**.
- [x] Matriz de funcionalidades, plano de migração e arquitetura alvo documentados.
- [x] Nenhuma fórmula financeira, contrato ou dado real alterado (§2/§35).
- [x] Bloco 2 **não** iniciado (sem Prisma/monorepo/banco/seed/código novo).

## Critérios de aprovação do checkpoint

- [x] Funcionalidades críticas com teste funcional real.
- [x] Lojas ativas/inativas funcionando transversalmente (selects, guards, `CURR_LOJA`).
- [x] Nenhuma ação proibida funciona por chamada direta (guards de loja e de permissão).
- [x] Nenhum registro financeiro divergente (recebimento/estorno/caixa/PE conferidos).
- [x] Todas as falhas encontradas corrigidas e retestadas.

## Limitações honestas ainda em aberto

- `addCaixa` mantém fallback `lojaId="L1"` de último recurso (não atingido nos fluxos
  testados) → backend tornará `storeId` obrigatório/não-nulo.
- Filtro dedicado "Incluir operações inativas" no histórico é melhoria de UI planejada.
- Mobile/PWA validados em navegador; instalação real de PWA exige HTTPS/localhost
  (não funciona por `file://` — documentado).

## Veredito

```
PROTÓTIPO FUNCIONALMENTE AUDITADO — APTO PARA MODELAGEM
```

Aguardando **autorização expressa** para iniciar o Bloco 2 (Prisma, PostgreSQL,
migrations, seed). Nenhum ponto de parada §35 foi cruzado; nenhuma alteração de
regra de negócio, fórmula ou dado real foi feita.
