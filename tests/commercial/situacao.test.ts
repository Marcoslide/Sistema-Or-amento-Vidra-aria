import { test } from "node:test";
import assert from "node:assert/strict";
import { SITUACAO_PROXIMAS, SITUACAO_LABEL } from "../../src/lib/commercial/situacao.ts";

// Regra V6: produção → pronto para execução NÃO é avanço manual.
// Só a conclusão da produção (fn_concluir_producao, que valida etapas/terceirizações) libera.
test("PRODUCAO não oferece avanço manual para PRONTO_EXECUCAO", () => {
  assert.ok(!SITUACAO_PROXIMAS["PRODUCAO"].includes("PRONTO_EXECUCAO"));
});
test("PRODUCAO manual só permite CANCELADO", () => {
  assert.deepEqual(SITUACAO_PROXIMAS["PRODUCAO"], ["CANCELADO"]);
});
test("PRONTO_EXECUCAO avança para EXECUCAO", () => {
  assert.ok(SITUACAO_PROXIMAS["PRONTO_EXECUCAO"].includes("EXECUCAO"));
});
test("EXECUCAO avança para FINALIZADA", () => {
  assert.ok(SITUACAO_PROXIMAS["EXECUCAO"].includes("FINALIZADA"));
});
test("existe rótulo 'Pronto para execução'", () => {
  assert.equal(SITUACAO_LABEL["PRONTO_EXECUCAO"], "Pronto para execução");
});
