import { test } from "node:test";
import assert from "node:assert/strict";
import { progressoChecklist } from "../../src/lib/obras/calc.ts";

test("sem itens = 0%", () => assert.equal(progressoChecklist([]), 0));
test("nenhum concluído = 0%", () => assert.equal(progressoChecklist([{ feito: false }, { feito: false }]), 0));
test("metade concluída = 50%", () => assert.equal(progressoChecklist([{ feito: true }, { feito: false }]), 50));
test("todos concluídos = 100%", () => assert.equal(progressoChecklist([{ feito: true }, { feito: true }, { feito: true }]), 100));
test("arredonda (2 de 3 = 67%)", () => assert.equal(progressoChecklist([{ feito: true }, { feito: true }, { feito: false }]), 67));
