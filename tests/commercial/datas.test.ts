import { test } from "node:test";
import assert from "node:assert/strict";
import { formatDate, parseDateLocal } from "../../src/lib/format.ts";

// Regressão do bug de fuso: data date-only não pode recuar 1 dia (America/Sao_Paulo, UTC-3).
test("formatDate date-only preserva o dia (10/08/2026)", () => {
  assert.equal(formatDate("2026-08-10"), "10/08/2026");
});
test("formatDate date-only 01 do mês não vira mês anterior", () => {
  assert.equal(formatDate("2026-03-01"), "01/03/2026");
});
test("parseDateLocal não desloca para o dia anterior", () => {
  const d = parseDateLocal("2026-08-10");
  assert.equal(d.getFullYear(), 2026);
  assert.equal(d.getMonth(), 7); // agosto (0-based)
  assert.equal(d.getDate(), 10);
});
