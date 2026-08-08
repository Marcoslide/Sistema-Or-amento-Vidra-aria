// Filtro de período — padrão reutilizável entre Vendas, Contas a Receber e Contas a Pagar
// (evita reimplementar a mesma lógica em cada tela). Puro e testável.
export type PeriodoChave = "" | "hoje" | "semana" | "7dias" | "mes" | "mes_anterior";

export const PERIODOS: { v: PeriodoChave; l: string }[] = [
  { v: "", l: "Todos os períodos" }, { v: "hoje", l: "Hoje" }, { v: "semana", l: "Esta semana" },
  { v: "7dias", l: "Últimos 7 dias" }, { v: "mes", l: "Este mês" }, { v: "mes_anterior", l: "Mês anterior" },
];

export function dentroPeriodo(dataIso: string, periodo: string, agora: Date = new Date()): boolean {
  if (!periodo || !dataIso) return true;
  const d = new Date(dataIso);
  if (periodo === "hoje") return d.toDateString() === agora.toDateString();
  if (periodo === "semana" || periodo === "7dias") {
    const ini = new Date(agora); ini.setDate(agora.getDate() - 7);
    return d >= ini;
  }
  if (periodo === "mes") return d.getFullYear() === agora.getFullYear() && d.getMonth() === agora.getMonth();
  if (periodo === "mes_anterior") {
    const m = new Date(agora.getFullYear(), agora.getMonth() - 1, 1);
    return d.getFullYear() === m.getFullYear() && d.getMonth() === m.getMonth();
  }
  return true;
}
