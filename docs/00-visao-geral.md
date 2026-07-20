# Documento 00 — Visão Geral do Projeto

## Nome do Projeto
**Sistema de Gestão de Orçamentos e Obras para Vidraçarias e Esquadrias**

## Objetivo
Sistema web moderno, rápido e intuitivo, **especializado** em empresas que
trabalham com vidros, espelhos, esquadrias de alumínio, box de banheiro,
guarda-corpos, fechamentos de sacada, fachadas, coberturas, portas e janelas —
e a instalação desses produtos.

O sistema **não é** um ERP, um financeiro completo ou um CRM. Ele resolve um
único problema: **gerenciar todo o ciclo de um orçamento até a conclusão da
obra** de forma simples, organizada e profissional.

## Princípios
1. **Simplicidade** — sempre a solução mais simples.
2. **Velocidade** — montar um orçamento em poucos minutos, reduzindo cliques.
3. **Especialização** — decisões pensadas na rotina de uma vidraçaria.
4. **Organização** — informação bem estruturada, aparência profissional.
5. **Crescimento** — arquitetura que evolui sem reescrita.

## Fluxo principal
```
Cliente → Orçamento → Envio do PDF → Aprovação → Recebimento da Entrada →
Liberação → Produção → Execução da Obra → Finalização → Garantia
```

## Status do orçamento (acompanhamento)
`Orçamento · Aprovado · Em Produção · Executando · Finalizado · Retorno ·
Reclamação · Cancelado` — o orçamento é o **mesmo registro** durante todo o
processo.

## Escopo da primeira versão (MVP)
Login · Vendedores · Clientes (com obras) · Produtos (com regra de cálculo) ·
Contas de Recebimento · Operadoras de Cartão · **Orçamentos** (módulo central) ·
Acompanhamento.

### Regras de cálculo de produto
`M²` (largura × altura) · `Unidade` · `Metro linear` · `Perímetro` (2L + 2A).

## O que NÃO entra na v1
Estoque, compras, financeiro completo, contas a pagar, fluxo de caixa, NF-e,
plano de corte, otimização de chapas, app mobile, integração bancária,
integração com WhatsApp, CRM e IA. (Podem existir em versões futuras.)

## Interface
Organização, elegância, velocidade e simplicidade. Inspiração: Linear, Stripe,
Notion, Vercel. Bastante espaço em branco, poucos botões e campos por tela.

## Tecnologias
- **Frontend:** Next.js · Tailwind CSS · Shadcn UI · Lucide Icons
- **Backend (fase 2):** NestJS
- **Banco:** PostgreSQL · **ORM:** Prisma

---

## Estratégia de entrega

### Fase 1 — Protótipo navegável (ESTE repositório)
Protótipo de **alta fidelidade**, todas as telas da v1, dados **fictícios em
memória**, layout profissional, navegação completa. Objetivo: validar fluxo,
layout, organização e experiência **antes** de investir no backend.

Decisão de arquitetura combinada: os dados são mockados, **porém** a camada de
dados é isolada (`types → mock → repositories → services`). Nenhum dado mockado
vive dentro de componentes. Na fase 2, cada serviço passa a chamar a API NestJS
com a **mesma assinatura pública** — as telas não são reescritas.

### Fase 2 — Backend
Implementar NestJS + Prisma + PostgreSQL seguindo o contrato de tipos em
`src/lib/types.ts` e as regras de cálculo em `src/lib/calculations.ts`
(idênticas ao front, para consistência).

## Telas entregues nesta fase
Login · Dashboard · Clientes (lista + cadastro) · Produtos (lista + cadastro) ·
**Orçamentos (lista + cadastro completo + acompanhamento)** · Preview do PDF ·
Vendedores · Contas de Recebimento · Operadoras · Configurações.
