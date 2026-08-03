// Cálculo de custo/hora — Hora-Homem e Hora-Máquina (paridade V6).
// Puro e testável. Nunca inventa valor: se faltarem horas efetivas, retorna 0.

const num = (v: unknown): number => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};
const round4 = (n: number) => Math.round(n * 10000) / 10000;

export type LaborInput = {
  salario?: number; encargos?: number; beneficios?: number; adicionais?: number;
  tipo_adicional?: string; horas_contratadas?: number; horas_produtivas?: number; produtividade?: number;
};

// Custo total mensal / horas produtivas efetivas.
export function custoHoraHomem(i: LaborInput): number {
  const salario = num(i.salario), encargos = num(i.encargos), beneficios = num(i.beneficios), adic = num(i.adicionais);
  const adicionalValor = (i.tipo_adicional === "percentual") ? salario * (adic / 100) : adic;
  const custoMensal = salario + encargos + beneficios + adicionalValor;
  const hProd = num(i.horas_produtivas);
  const horasEfetivas = hProd > 0 ? hProd : num(i.horas_contratadas) * (num(i.produtividade) / 100);
  return horasEfetivas > 0 ? round4(custoMensal / horasEfetivas) : 0;
}

export type MachineInput = {
  aquisicao?: number; vida_util_meses?: number; valor_residual?: number; depreciacao_mes?: number;
  energia?: number; manutencao?: number; seguro?: number; consumiveis?: number; operador?: number;
  horas_disponiveis?: number; horas_produtivas?: number;
};

export function custoHoraMaquina(i: MachineInput): number {
  const vida = num(i.vida_util_meses);
  const depMes = num(i.depreciacao_mes) > 0
    ? num(i.depreciacao_mes)
    : (vida > 0 ? Math.max(0, num(i.aquisicao) - num(i.valor_residual)) / vida : 0);
  const custoMensal = depMes + num(i.energia) + num(i.manutencao) + num(i.seguro) + num(i.consumiveis) + num(i.operador);
  const hProd = num(i.horas_produtivas);
  const horasEfetivas = hProd > 0 ? hProd : num(i.horas_disponiveis);
  return horasEfetivas > 0 ? round4(custoMensal / horasEfetivas) : 0;
}
