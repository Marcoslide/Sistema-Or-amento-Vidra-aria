import { test } from "node:test";
import assert from "node:assert/strict";
import { dentroPeriodo } from "../../src/lib/periodo.ts";

const AGORA = new Date(2026, 7, 10, 15, 0, 0); // 10/08/2026 (mês 0-based)

test("sem período: sempre dentro", () => assert.equal(dentroPeriodo("2020-01-01T00:00:00Z", "", AGORA), true));
test("hoje: mesma data = dentro", () => assert.equal(dentroPeriodo(new Date(2026, 7, 10, 8, 0).toISOString(), "hoje", AGORA), true));
test("hoje: data diferente = fora", () => assert.equal(dentroPeriodo(new Date(2026, 7, 9, 8, 0).toISOString(), "hoje", AGORA), false));
test("7dias: 3 dias atrás = dentro", () => assert.equal(dentroPeriodo(new Date(2026, 7, 7).toISOString(), "7dias", AGORA), true));
test("7dias: 10 dias atrás = fora", () => assert.equal(dentroPeriodo(new Date(2026, 6, 31).toISOString(), "7dias", AGORA), false));
test("mes: mesmo mês = dentro", () => assert.equal(dentroPeriodo(new Date(2026, 7, 1).toISOString(), "mes", AGORA), true));
test("mes: mês diferente = fora", () => assert.equal(dentroPeriodo(new Date(2026, 6, 30).toISOString(), "mes", AGORA), false));
test("mes_anterior: julho = dentro (ago é o mês atual)", () => assert.equal(dentroPeriodo(new Date(2026, 6, 15).toISOString(), "mes_anterior", AGORA), true));
test("mes_anterior: agosto = fora", () => assert.equal(dentroPeriodo(new Date(2026, 7, 1).toISOString(), "mes_anterior", AGORA), false));
