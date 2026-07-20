# VidroGestor — Orçamentos & Obras

Sistema de gestão de **orçamentos e obras para vidraçarias e esquadrias**.
Especializado no segmento de vidros, espelhos, esquadrias de alumínio, box,
guarda-corpos, fachadas, coberturas, portas e janelas.

> **Fase atual: protótipo navegável de alta fidelidade.** Todas as telas da v1,
> com dados fictícios em memória e layout profissional, para validar fluxo,
> layout e experiência antes de implementar o backend. Veja
> [`docs/00-visao-geral.md`](docs/00-visao-geral.md).

## Como rodar

```bash
npm install
npm run dev
# abra http://localhost:3000  (redireciona para /login — qualquer credencial entra)
```

Build de produção:

```bash
npm run build && npm start
```

## Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** + componentes estilo **Shadcn UI** (em `src/components/ui`)
- **Lucide** (ícones)

## Telas

Login · Dashboard · Orçamentos (lista, **cadastro completo**, acompanhamento e
**preview do PDF**) · Clientes (lista + cadastro) · Produtos (lista + cadastro) ·
Vendedores · Contas de Recebimento · Operadoras de Cartão · Configurações.

O **módulo de Orçamento** é o coração do sistema: cliente → obra → ambientes →
produtos → múltiplas medidas → **cálculo automático** (m², unidade, metro
linear, perímetro) → descontos → pagamentos → resumo financeiro → PDF.

## Arquitetura (preparada para o backend)

A camada de dados é **isolada** para que a fase 2 (NestJS + Prisma + PostgreSQL)
não exija reescrever telas — basta trocar a implementação dos serviços por
chamadas HTTP:

```
src/
├── app/                        # rotas (App Router)
│   ├── login/
│   └── (app)/                  # shell com sidebar + topbar
│       ├── dashboard/
│       ├── orcamentos/         # lista, /novo, /[id], /[id]/pdf
│       ├── clientes/  produtos/
│       ├── vendedores/  contas/  operadoras/
│       └── configuracoes/
├── components/
│   ├── ui/                     # primitivos (button, card, table, dialog...)
│   └── layout/                 # sidebar, topbar, navegação
├── lib/
│   ├── types.ts                # contrato de domínio (o backend implementa)
│   ├── calculations.ts         # regras de cálculo (idênticas ao backend)
│   ├── format.ts               # moeda, número, data (pt-BR)
│   └── utils.ts
└── data/
    ├── mock/                   # dados fictícios (só aqui)
    ├── repositories/           # InMemoryRepository → futuro HttpRepository
    └── services/               # API pública consumida pelas telas
```

**Regra de ouro:** as telas importam **apenas** de `data/services` — nunca dos
mocks diretamente. Trocar mock por API é uma mudança local nos serviços.

## Próximos passos (fase 2)

1. Backend NestJS com módulos espelhando `data/services`.
2. Prisma + PostgreSQL a partir de `src/lib/types.ts`.
3. Autenticação real e escopo de vendedor (cada vendedor vê só as próprias vendas).
4. Geração de PDF no servidor.
