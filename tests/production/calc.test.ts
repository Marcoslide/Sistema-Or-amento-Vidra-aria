import { test } from "node:test";
import assert from "node:assert/strict";
import { progressoEtapas, podeConcluir, type Etapa } from "../../src/lib/production/calc.ts";

const E = (status: string, aplicavel = true): Etapa => ({ status: status as Etapa["status"], aplicavel });

test("progresso: N/A fica fora do denominador", () => {
  // 4 etapas, 1 N/A → denominador 3; 2 concluídas → 67%
  const r = progressoEtapas([E("CONCLUIDA"), E("CONCLUIDA"), E("PENDENTE"), E("PENDENTE", false)]);
  assert.equal(r.aplicaveis, 3);
  assert.equal(r.concluidas, 2);
  assert.equal(r.pct, 67);
});

test("progresso: etapa em andamento NÃO conta como concluída", () => {
  const r = progressoEtapas([E("CONCLUIDA"), E("ANDAMENTO")]);
  assert.equal(r.concluidas, 1);
  assert.equal(r.pct, 50);
});

test("progresso: sem etapas aplicáveis = 0% (não divide por zero)", () => {
  assert.equal(progressoEtapas([E("PENDENTE", false)]).pct, 0);
});

test("conclusão bloqueada por etapa pendente/andamento", () => {
  assert.equal(podeConcluir([E("CONCLUIDA"), E("ANDAMENTO")]).ok, false);
  assert.equal(podeConcluir([E("CONCLUIDA"), E("PENDENTE")]).ok, false);
});

test("conclusão bloqueada por terceirização não recebida/conferida", () => {
  const stages = [E("CONCLUIDA"), E("CONCLUIDA")];
  assert.equal(podeConcluir(stages, [{ recebido: true, conferido: false }]).ok, false);
  assert.equal(podeConcluir(stages, [{ recebido: false, conferido: false }]).ok, false);
});

test("conclusão liberada só em 100% + terceirizações ok", () => {
  const stages = [E("CONCLUIDA"), E("CONCLUIDA"), E("PENDENTE", false)];
  const r = podeConcluir(stages, [{ recebido: true, conferido: true }]);
  assert.equal(r.ok, true);
});
