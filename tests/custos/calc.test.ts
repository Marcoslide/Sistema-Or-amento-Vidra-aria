import { test } from "node:test";
import assert from "node:assert/strict";
import { custoHoraHomem, custoHoraMaquina } from "../../src/lib/custos/calc.ts";

const approx = (a: number, b: number, t = 0.001) => assert.ok(Math.abs(a - b) < t, `${a} ≈ ${b}`);

// Hora-Homem — adicional em VALOR
test("hora-homem valor: (2000+700+200+100)/176 = 17,045", () => {
  approx(custoHoraHomem({ salario: 2000, encargos: 700, beneficios: 200, adicionais: 100, tipo_adicional: "valor", horas_produtivas: 176 }), 3000 / 176);
});
// Hora-Homem — adicional em PERCENTUAL (10% de 2000 = 200)
test("hora-homem percentual: (2000+700+200+200)/176", () => {
  approx(custoHoraHomem({ salario: 2000, encargos: 700, beneficios: 200, adicionais: 10, tipo_adicional: "percentual", horas_produtivas: 176 }), 3100 / 176);
});
// Hora-Homem — sem horas produtivas cai para contratadas × produtividade
test("hora-homem via contratadas×produtividade", () => {
  approx(custoHoraHomem({ salario: 2200, encargos: 0, beneficios: 0, adicionais: 0, horas_contratadas: 220, produtividade: 80 }), 2200 / (220 * 0.8));
});
// Não inventa: sem horas efetivas => 0
test("hora-homem sem horas = 0", () => assert.equal(custoHoraHomem({ salario: 2000 }), 0));

// Hora-Máquina — depreciação explícita
test("hora-maquina dep explícita: (500+300+200)/140", () => {
  approx(custoHoraMaquina({ depreciacao_mes: 500, energia: 300, manutencao: 200, horas_produtivas: 140 }), 1000 / 140);
});
// Hora-Máquina — depreciação derivada de (aquisição-residual)/vida
test("hora-maquina dep derivada: (12000-0)/120=100 + 200 = 300 /150", () => {
  approx(custoHoraMaquina({ aquisicao: 12000, vida_util_meses: 120, valor_residual: 0, energia: 200, horas_produtivas: 150 }), 300 / 150);
});
test("hora-maquina sem horas = 0", () => assert.equal(custoHoraMaquina({ aquisicao: 12000, vida_util_meses: 120 }), 0));
