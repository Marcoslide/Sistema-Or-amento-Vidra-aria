import { test } from "node:test";
import assert from "node:assert/strict";
import {
  analiseVenda, custoHoraHomem, custoHoraMaquina, depreciacaoMensal, valorContabil,
  rateio, pontoEquilibrio,
} from "../../src/lib/financial/calc.ts";

test("análise da venda: receita líquida, margem e lucros", () => {
  const a = analiseVenda({
    receitaBruta: 1000, descontos: 100, acrescimos: 0, frete: 50, instalacao: 50,
    custoProdutos: 400, extras: [{ valor: 100, participaMargem: true }, { valor: 30, participaMargem: false }],
    recebido: 600,
  });
  assert.equal(a.receitaLiquida, 1000);      // 1000 -100 +50 +50
  assert.equal(a.custosExtras, 100);         // só o que participa da margem
  assert.equal(a.custoTotal, 500);           // 400 + 100
  assert.equal(a.margemBruta, 600);          // 1000 - 400
  assert.equal(a.margemContribuicao, 500);   // 1000 - 500
  assert.equal(a.margemPct, 50);
  assert.equal(a.lucroEstimado, 500);
  assert.equal(a.lucroRealizado, 100);       // 600 recebido - 500 custo
});

test("custo hora-homem", () => {
  // (3000 + 1200 + 300 + 0) / 176 = 25.5681... -> 25.57
  assert.equal(custoHoraHomem({ salario: 3000, encargos: 1200, beneficios: 300, adicionais: 0, horasProdutivas: 176 }), 25.57);
  assert.equal(custoHoraHomem({ salario: 100, encargos: 0, beneficios: 0, adicionais: 0, horasProdutivas: 0 }), 0);
});

test("custo hora-máquina", () => {
  // (500+400+300+100+100+600)/140 = 2000/140 = 14.2857 -> 14.29
  assert.equal(custoHoraMaquina({ depreciacaoMes: 500, energia: 400, manutencao: 300, seguro: 100, consumiveis: 100, operador: 600, horasProdutivas: 140 }), 14.29);
});

test("depreciação linear e valor contábil", () => {
  const bem = { custoOriginal: 12000, valorResidual: 2000, vidaUtilMeses: 100, mesesDecorridos: 10 };
  assert.equal(depreciacaoMensal(bem), 100);        // (12000-2000)/100
  assert.equal(valorContabil(bem), 11000);          // 12000 - 100*10
  // não passa do valor residual
  assert.equal(valorContabil({ ...bem, mesesDecorridos: 500 }), 2000);
});

test("rateio por peso", () => {
  // custo 900 rateado por faturamento [100,200,600] -> unidade 2 = 900*600/900 = 600
  assert.equal(rateio(900, [100, 200, 600], 2), 600);
  assert.equal(rateio(900, [0, 0, 0], 0), 0);       // sem base, zero (não divide por zero)
});

test("ponto de equilíbrio", () => {
  const pe = pontoEquilibrio({ custosFixos: 10000, margemContribuicaoPct: 40, receitaAtual: 20000 });
  assert.equal(pe.receitaEquilibrio, 25000);        // 10000 / 0.40
  assert.equal(pe.falta, 5000);                     // 25000 - 20000
  assert.equal(pe.excedeu, 0);
  assert.equal(pe.positivo, false);
  assert.equal(pe.percentualAtingido, 80);
  const pe2 = pontoEquilibrio({ custosFixos: 10000, margemContribuicaoPct: 50, receitaAtual: 25000 });
  assert.equal(pe2.receitaEquilibrio, 20000);
  assert.equal(pe2.excedeu, 5000);
  assert.equal(pe2.positivo, true);
});
