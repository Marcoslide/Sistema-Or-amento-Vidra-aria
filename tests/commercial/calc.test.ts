import { test } from "node:test";
import assert from "node:assert/strict";
import { qtdMedida, qtdCliente, totalItem, calcOrc, margemOrc, molduraAcrescimoM } from "../../src/lib/commercial/calc.ts";
const molde = { larguraMolduraCm: 5, multiplicadorCorte: 8 };
const approx = (a: number, b: number, t = 0.001) => assert.ok(Math.abs(a - b) < t);
const qUI = (regra: any, m: any, prod?: any) => totalItem({ regra, medidas: [m], produto: prod }).q;
test("M2 1,50x2,00=3 m2", () => assert.equal(qtdMedida("M2", { l: 1.5, a: 2, q: 1, unit: "m" }), 3));
test("UN 5=5", () => assert.equal(qtdMedida("UN", { q: 5 }), 5));
test("ML 4,20x6=25,2", () => { approx(qtdMedida("ML", { l: 4.2, q: 6, unit: "m" }), 25.2); assert.equal(qUI("ML", { l: 4.2, q: 6, unit: "m" }), 25.2); });
test("MOLDURA acresc 0,40", () => assert.equal(molduraAcrescimoM(molde), 0.4));
test("MOLDURA 40x60=2,40", () => assert.equal(qtdMedida("MOLDURA", { l: 40, a: 60, q: 1, unit: "cm" }, molde), 2.4));
test("MOLDURA qtd3=7,20 (UI)", () => assert.equal(qUI("MOLDURA", { l: 40, a: 60, q: 3, unit: "cm" }, molde), 7.2));
test("MOLDURA sem largura=0", () => assert.equal(qtdMedida("MOLDURA", { l: 40, a: 60, q: 1, unit: "cm" }, { larguraMolduraCm: 0 }), 0));
// VIA DO CLIENTE (anti-regressão): MOLDURA mostra quantidade comercial, nunca metro linear.
test("qtdCliente MOLDURA 100x150 q1 = 1 (não 5,40)", () => {
  const m = { l: 100, a: 150, q: 1, unit: "cm" as const };
  assert.equal(qtdCliente("MOLDURA", m, molde), 1);            // via cliente: 1 quadro
  assert.ok(qtdMedida("MOLDURA", m, molde) > 5);               // interno: metro linear (~5,40)
});
test("qtdCliente MOLDURA q3 = 3", () => assert.equal(qtdCliente("MOLDURA", { l: 40, a: 60, q: 3, unit: "cm" }, molde), 3));
test("qtdCliente M2 mantém métrica", () => assert.equal(qtdCliente("M2", { l: 1.5, a: 2, q: 1, unit: "m" }), 3));
test("total 2,40 x30 = 72", () => assert.equal(totalItem({ regra: "MOLDURA", medidas: [{ l: 40, a: 60, q: 1, unit: "cm" }], produto: { ...molde, preco: 30, custoBase: 10 } }).total, 72));
test("calcOrc sub/desc/frete", () => { const c = calcOrc({ itens: [{ regra: "M2", medidas: [{ l: 1, a: 2, q: 1, unit: "m" }], produto: { preco: 100 } }], desc: 10, frete: 50 }); assert.equal(c.total, 230); });
test("margem receita-custo", () => { const m = margemOrc({ itens: [{ regra: "MOLDURA", medidas: [{ l: 40, a: 60, q: 1, unit: "cm" }], produto: { ...molde, preco: 30, custoBase: 10 } }] }); assert.equal(m.lucro, 48); });
