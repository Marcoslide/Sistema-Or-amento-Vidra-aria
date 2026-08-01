// Motor de cálculo comercial — portado 1:1 do protótipo V6 (regras aprovadas).
// Puro (sem React/DOM), reutilizável por UI e testes. Dinheiro tratado com arredondamento
// a 2 casas (r2); no banco os valores usam colunas numeric/Decimal (nunca Float).

export type Unidade = "cm" | "mm" | "m";
export type Regra = "M2" | "ML" | "PERIMETRO" | "UN" | "BARRA" | "CHAPA" | "KIT" | "MOLDURA";

export interface Medida { l?: number; a?: number; q?: number; unit?: Unidade; }
export interface ProdutoCalc {
  regra?: Regra;
  preco?: number;
  custoBase?: number;
  larguraMolduraCm?: number;
  multiplicadorCorte?: number;
}
export interface ItemCalc {
  regra: Regra;
  descPct?: number;
  precoOverride?: number | null;
  medidas: Medida[];
  produto?: ProdutoCalc;
}
export interface OrcamentoCalc {
  itens: ItemCalc[];
  desc?: number;        // % desconto geral
  acrescimo?: number;
  frete?: number;
  instalacao?: number;
  custosExtras?: { valor: number; participaMargem?: boolean }[];
}

export const num0 = (v: unknown): number => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
export const r2 = (v: number): number => Math.round((v + Number.EPSILON) * 100) / 100;

// converte para metros conforme a unidade (cm é o padrão)
export const toM = (v: unknown, unit?: Unidade): number => {
  const x = num0(v);
  return unit === "mm" ? x / 1000 : unit === "m" ? x : x / 100;
};

export function molduraMult(prod?: ProdutoCalc): number {
  const v = num0(prod?.multiplicadorCorte);
  return v > 0 ? v : 8;
}
// acréscimo técnico de corte da moldura, em metros
export function molduraAcrescimoM(prod?: ProdutoCalc): number {
  const lm = num0(prod?.larguraMolduraCm);
  if (!(lm > 0)) return 0;
  return (lm * molduraMult(prod)) / 100;
}

// quantidade faturável de UMA medida, conforme a regra
export function qtdMedida(regra: Regra, m: Medida, prod?: ProdutoCalc): number {
  const l = toM(m.l, m.unit), a = toM(m.a, m.unit);
  const q = Math.max(0, Math.floor(num0(m.q)) || 0);
  switch (regra) {
    case "M2": return l * a * q;
    case "ML": return l * q;
    case "PERIMETRO": return (2 * l + 2 * a) * q;
    case "MOLDURA": {
      const lm = num0(prod?.larguraMolduraCm);
      if (!(l > 0) || !(a > 0) || !(lm > 0) || !(q > 0)) return 0;
      return ((2 * l + 2 * a) + molduraAcrescimoM(prod)) * q;
    }
    default: return q;
  }
}

export function precoItem(it: ItemCalc): number {
  return it.precoOverride != null ? num0(it.precoOverride) : num0(it.produto?.preco);
}

export interface TotalItem { q: number; bruto: number; desc: number; total: number; preco: number; }
export function totalItem(it: ItemCalc): TotalItem {
  const preco = precoItem(it);
  const q = it.medidas.reduce((s, m) => s + qtdMedida(it.regra, m, it.produto), 0);
  const bruto = q * preco;
  const desc = bruto * (num0(it.descPct) / 100);
  return { q: r2(q), bruto: r2(bruto), desc: r2(desc), total: r2(bruto - desc), preco };
}

export interface TotalOrc { sub: number; descV: number; total: number; nItens: number; }
export function calcOrc(o: OrcamentoCalc): TotalOrc {
  let sub = 0;
  o.itens.forEach((it) => { sub += totalItem(it).total; });
  const descV = r2(sub * (num0(o.desc) / 100));
  const total = r2(sub - descV + num0(o.acrescimo) + num0(o.frete) + num0(o.instalacao));
  return { sub: r2(sub), descV, total, nItens: o.itens.length };
}

export function custoProdutosOrc(o: OrcamentoCalc): number {
  let t = 0;
  o.itens.forEach((it) => {
    const q = it.medidas.reduce((s, m) => s + qtdMedida(it.regra, m, it.produto), 0);
    t += q * num0(it.produto?.custoBase);
  });
  return r2(t);
}
export function custoExtrasOrc(o: OrcamentoCalc): number {
  return r2((o.custosExtras || []).filter((x) => x.participaMargem !== false).reduce((s, x) => s + num0(x.valor), 0));
}

export interface Margem { receita: number; cp: number; ce: number; lucro: number; margem: number; }
export function margemOrc(o: OrcamentoCalc): Margem {
  const receita = calcOrc(o).total;
  const cp = custoProdutosOrc(o);
  const ce = custoExtrasOrc(o);
  const lucro = r2(receita - cp - ce);
  const margem = receita > 0 ? r2((lucro / receita) * 100) : 0;
  return { receita, cp, ce, lucro, margem };
}

// memória de cálculo textual (uso interno; NÃO exibir no PDF do cliente)
export function memoMedida(regra: Regra, m: Medida, prod?: ProdutoCalc): string {
  const u = m.unit || "cm";
  const q = Math.max(0, Math.floor(num0(m.q)) || 0);
  const Q = qtdMedida(regra, m, prod);
  if (regra === "M2") return `${num0(m.l)} ${u} × ${num0(m.a)} ${u} × ${q} = ${Q.toFixed(2)} m²`;
  if (regra === "ML") return `${num0(m.l)} ${u} × ${q} = ${Q.toFixed(2)} m`;
  if (regra === "PERIMETRO") return `(2×${num0(m.l)} + 2×${num0(m.a)}) ${u} × ${q} = ${Q.toFixed(2)} m`;
  if (regra === "MOLDURA") {
    const per = r2(2 * toM(m.l, m.unit) + 2 * toM(m.a, m.unit));
    const acr = r2(molduraAcrescimoM(prod));
    return `perím ${per.toFixed(2)} m + acrésc ${acr.toFixed(2)} m × ${q} = ${Q.toFixed(2)} m`;
  }
  return `${q} un`;
}
