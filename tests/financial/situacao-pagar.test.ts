import { test } from "node:test";
import assert from "node:assert/strict";
import { situacaoConta } from "../../src/lib/financeiro/situacao-pagar.ts";

const HOJE = "2026-08-10";

test("cancelada tem prioridade sobre tudo", () => assert.equal(situacaoConta({ saldo: 100, pago: 0, vencimento: null, cancelada: true }, HOJE), "cancelada"));
test("saldo zero = paga", () => assert.equal(situacaoConta({ saldo: 0, pago: 100, vencimento: HOJE, cancelada: false }, HOJE), "paga"));
test("pago parcial e saldo > 0 = parcial", () => assert.equal(situacaoConta({ saldo: 50, pago: 50, vencimento: "2026-09-01", cancelada: false }, HOJE), "parcial"));
test("sem pagamento e vencimento passado = vencida", () => assert.equal(situacaoConta({ saldo: 100, pago: 0, vencimento: "2026-08-01", cancelada: false }, HOJE), "vencida"));
test("sem pagamento e vence hoje = vence_hoje", () => assert.equal(situacaoConta({ saldo: 100, pago: 0, vencimento: HOJE, cancelada: false }, HOJE), "vence_hoje"));
test("sem pagamento e vencimento futuro = aberta", () => assert.equal(situacaoConta({ saldo: 100, pago: 0, vencimento: "2026-12-01", cancelada: false }, HOJE), "aberta"));
