// Motor financeiro puro (sem React/DOM) — análise por venda, custo hora-homem/máquina,
// depreciação, rateio e ponto de equilíbrio. Dinheiro com arredondamento a 2 casas (r2);
// no banco, colunas numeric (nunca float).

export const n0 = (v: unknown): number => {
  const x = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(",", "."));
  return Number.isFinite(x) ? x : 0;
};
export const r2 = (v: number): number => Math.round((v + Number.EPSILON) * 100) / 100;
export const pct = (parte: number, todo: number): number => (todo > 0 ? r2((parte / todo) * 100) : 0);

// ---------- Análise financeira por venda ----------
export interface CustoExtra { valor: number; participaMargem?: boolean }
export interface VendaFin {
  receitaBruta: number; descontos: number; acrescimos: number; frete: number; instalacao: number;
  custoProdutos: number;                // custo previsto dos produtos
  extras?: CustoExtra[];                // reclamação, assistência, rateio, outros
  recebido?: number;                    // total recebido (para lucro realizado)
}
export interface AnaliseVenda {
  receitaBruta: number; descontos: number; acrescimos: number; frete: number; instalacao: number;
  receitaLiquida: number; custoProdutos: number; custosExtras: number; custoTotal: number;
  margemBruta: number; margemContribuicao: number; margemPct: number;
  lucroEstimado: number; lucroRealizado: number;
}
export function analiseVenda(v: VendaFin): AnaliseVenda {
  const receitaBruta = r2(n0(v.receitaBruta));
  const descontos = r2(n0(v.descontos));
  const acrescimos = r2(n0(v.acrescimos));
  const frete = r2(n0(v.frete));
  const instalacao = r2(n0(v.instalacao));
  // receita líquida = bruta - descontos + acréscimos + frete + instalação (o total cobrado do cliente)
  const receitaLiquida = r2(receitaBruta - descontos + acrescimos + frete + instalacao);
  const custoProdutos = r2(n0(v.custoProdutos));
  const extras = v.extras || [];
  const custosExtras = r2(extras.filter((e) => e.participaMargem !== false).reduce((s, e) => s + n0(e.valor), 0));
  const custoTotal = r2(custoProdutos + custosExtras);
  const margemBruta = r2(receitaLiquida - custoProdutos);
  const margemContribuicao = r2(receitaLiquida - custoTotal);
  const margemPct = pct(margemContribuicao, receitaLiquida);
  const lucroEstimado = margemContribuicao;
  const lucroRealizado = r2(n0(v.recebido) - custoTotal);
  return {
    receitaBruta, descontos, acrescimos, frete, instalacao, receitaLiquida,
    custoProdutos, custosExtras, custoTotal, margemBruta, margemContribuicao, margemPct,
    lucroEstimado, lucroRealizado,
  };
}

// ---------- Custo hora-homem ----------
export interface HoraHomem { salario: number; encargos: number; beneficios: number; adicionais: number; horasProdutivas: number }
export function custoHoraHomem(h: HoraHomem): number {
  const total = n0(h.salario) + n0(h.encargos) + n0(h.beneficios) + n0(h.adicionais);
  const hp = n0(h.horasProdutivas);
  return hp > 0 ? r2(total / hp) : 0;
}

// ---------- Custo hora-máquina ----------
export interface HoraMaquina {
  depreciacaoMes: number; energia: number; manutencao: number; seguro: number;
  consumiveis: number; operador: number; horasProdutivas: number;
}
export function custoHoraMaquina(m: HoraMaquina): number {
  const mensal = n0(m.depreciacaoMes) + n0(m.energia) + n0(m.manutencao) + n0(m.seguro) + n0(m.consumiveis) + n0(m.operador);
  const hp = n0(m.horasProdutivas);
  return hp > 0 ? r2(mensal / hp) : 0;
}

// ---------- Depreciação linear ----------
export interface Bem { custoOriginal: number; valorResidual: number; vidaUtilMeses: number; mesesDecorridos?: number }
export function depreciacaoMensal(b: Bem): number {
  const base = n0(b.custoOriginal) - n0(b.valorResidual);
  const vu = n0(b.vidaUtilMeses);
  return vu > 0 ? r2(base / vu) : 0;
}
export function valorContabil(b: Bem): number {
  const acumulada = r2(depreciacaoMensal(b) * Math.min(n0(b.mesesDecorridos), n0(b.vidaUtilMeses)));
  return r2(Math.max(n0(b.valorResidual), n0(b.custoOriginal) - acumulada));
}

// ---------- Rateio de custo fixo ----------
export type CriterioRateio = "faturamento" | "quantidade" | "horas" | "m2" | "ml" | "personalizado";
// distribui `valor` entre unidades conforme os pesos; retorna o rateio da unidade `idx`.
export function rateio(valor: number, pesos: number[], idx: number): number {
  const soma = pesos.reduce((s, p) => s + n0(p), 0);
  if (!(soma > 0)) return 0;
  return r2((n0(valor) * n0(pesos[idx])) / soma);
}

// ---------- Ponto de equilíbrio ----------
export interface PontoEquilibrioIn { custosFixos: number; margemContribuicaoPct: number; receitaAtual: number }
export interface PontoEquilibrio {
  custosFixos: number; margemPct: number; receitaEquilibrio: number; receitaAtual: number;
  falta: number; excedeu: number; percentualAtingido: number; positivo: boolean;
}
export function pontoEquilibrio(i: PontoEquilibrioIn): PontoEquilibrio {
  const custosFixos = r2(n0(i.custosFixos));
  const margemPct = n0(i.margemContribuicaoPct);
  const receitaEquilibrio = margemPct > 0 ? r2(custosFixos / (margemPct / 100)) : 0;
  const receitaAtual = r2(n0(i.receitaAtual));
  const diff = r2(receitaAtual - receitaEquilibrio);
  return {
    custosFixos, margemPct, receitaEquilibrio, receitaAtual,
    falta: diff < 0 ? r2(-diff) : 0, excedeu: diff > 0 ? diff : 0,
    percentualAtingido: receitaEquilibrio > 0 ? pct(receitaAtual, receitaEquilibrio) : (receitaAtual > 0 ? 100 : 0),
    positivo: diff >= 0,
  };
}
