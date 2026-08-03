"use server";

import { getCtx } from "@/lib/data/server-ctx";

// Dados do Dashboard V6, lidos do Supabase (RLS-scoped). Sem mock: em falha/sem sessão
// retorna estrutura zerada (a UI mostra zeros, nunca dados fictícios).

export type DashboardData = {
  faturamento: number; vendas: number; ticketMedio: number; orcAberto: number;
  obrasExec: number; aReceber: number;
  faturamentoAnterior: number; deltaFaturamentoPct: number;
  evolucao: { mes: string; valor: number }[];
  meta: number; realizado: number;
  vendasRecentes: { id: string; numero: number | null; cliente: string; situacao: string; total: number; criado: string }[];
  melhoresVendedores: { nome: string; total: number }[];
  funil: { label: string; chave: string; n: number }[];
  porLoja: { loja: string; total: number }[];
  obrasAndamento: { nome: string; cliente: string; progresso: number; status: string }[];
  agendaHoje: { hora: string; tipo: string; cliente: string }[];
  alertas: string[];
  atualizadoEm: string;
  temDados: boolean;
};

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const formatBRL = (n: number) => "R$ " + n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const vazio = (): DashboardData => ({
  faturamento: 0, vendas: 0, ticketMedio: 0, orcAberto: 0, obrasExec: 0, aReceber: 0,
  faturamentoAnterior: 0, deltaFaturamentoPct: 0,
  evolucao: [], meta: 0, realizado: 0, vendasRecentes: [], melhoresVendedores: [], funil: [],
  porLoja: [], obrasAndamento: [], agendaHoje: [], alertas: [], atualizadoEm: "", temDados: false,
});

export async function getDashboard(periodo: "hoje" | "semana" | "mes" | "ano" = "mes", storeId?: string): Promise<DashboardData> {
  try {
    const c = await getCtx();
    let sq = c.supabase
      .from("sales")
      .select("id,numero,cliente_nome,vend_nome,situacao,status,venda_gerada,total,created_at,store_id")
      .order("created_at", { ascending: false });
    if (storeId) sq = sq.eq("store_id", storeId);
    const { data: sales } = await sq;
    const rows = sales || [];
    if (!rows.length) return { ...vazio(), temDados: true };

    const agora = new Date();
    const ini = new Date(agora);
    if (periodo === "hoje") ini.setHours(0, 0, 0, 0);
    else if (periodo === "semana") ini.setDate(agora.getDate() - 7);
    else if (periodo === "mes") ini.setDate(1);
    else ini.setMonth(0, 1);
    const noPeriodo = (r: { created_at: string }) => new Date(r.created_at) >= ini;

    const confirmadas = rows.filter((r) => r.venda_gerada);
    const confPeriodo = confirmadas.filter(noPeriodo);
    const faturamento = confPeriodo.reduce((s, r) => s + (Number(r.total) || 0), 0);
    const vendas = confPeriodo.length;
    const ticketMedio = vendas > 0 ? faturamento / vendas : 0;
    const orcAberto = rows.filter((r) => (r.situacao || r.status) === "ORCAMENTO").length;
    const obrasExec = rows.filter((r) => ["PRODUCAO", "PRONTO_EXECUCAO", "EXECUCAO"].includes(r.situacao || r.status)).length;

    // a receber = títulos - recebimentos não estornados
    let rq = c.supabase.from("receivables").select("valor,store_id");
    if (storeId) rq = rq.eq("store_id", storeId);
    const { data: recs } = await rq;
    let pq = c.supabase.from("receivable_payments").select("valor,estornado,store_id");
    if (storeId) pq = pq.eq("store_id", storeId);
    const { data: pays } = await pq;
    const totRec = (recs || []).reduce((s, r) => s + (Number(r.valor) || 0), 0);
    const totPago = (pays || []).filter((p) => !p.estornado).reduce((s, p) => s + (Number(p.valor) || 0), 0);
    const aReceber = Math.max(0, totRec - totPago);

    // evolução últimos 6 meses (faturamento confirmado)
    const evolucao: { mes: string; valor: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
      const val = confirmadas
        .filter((r) => { const x = new Date(r.created_at); return x.getFullYear() === d.getFullYear() && x.getMonth() === d.getMonth(); })
        .reduce((s, r) => s + (Number(r.total) || 0), 0);
      evolucao.push({ mes: MESES[d.getMonth()], valor: Math.round(val * 100) / 100 });
    }

    // meta do mês (soma das metas dos vendedores ativos)
    const { data: sellers } = await c.supabase.from("sellers").select("meta").eq("ativo", true);
    const meta = (sellers || []).reduce((s, x) => s + (Number(x.meta) || 0), 0);

    const vendasRecentes = rows.slice(0, 5).map((r) => ({
      id: r.id as string, numero: (r.numero as number) ?? null, cliente: (r.cliente_nome as string) || "—",
      situacao: (r.situacao as string) || (r.status as string) || "ORCAMENTO", total: Number(r.total) || 0,
      criado: r.created_at as string,
    }));

    const porVendedor: Record<string, number> = {};
    confPeriodo.forEach((r) => { const n = (r.vend_nome as string) || "—"; porVendedor[n] = (porVendedor[n] || 0) + (Number(r.total) || 0); });
    const melhoresVendedores = Object.entries(porVendedor).map(([nome, total]) => ({ nome, total })).sort((a, b) => b.total - a.total).slice(0, 5);

    const funChaves = [
      { chave: "ORCAMENTO", label: "Orçamento" }, { chave: "VENDA_CONFIRMADA", label: "Venda confirmada" },
      { chave: "PRODUCAO", label: "Produção" }, { chave: "EXECUCAO", label: "Execução" }, { chave: "FINALIZADA", label: "Finalizada" },
    ];
    const funil = funChaves.map((f) => ({ ...f, n: rows.filter((r) => (r.situacao || r.status) === f.chave).length }));

    // Período anterior (mesma duração) para variação % do faturamento
    const durMs = agora.getTime() - ini.getTime();
    const iniAnterior = new Date(ini.getTime() - durMs);
    const faturamentoAnterior = confirmadas
      .filter((r) => { const x = new Date(r.created_at); return x >= iniAnterior && x < ini; })
      .reduce((s, r) => s + (Number(r.total) || 0), 0);
    const deltaFaturamentoPct = faturamentoAnterior > 0
      ? Math.round(((faturamento - faturamentoAnterior) / faturamentoAnterior) * 1000) / 10
      : (faturamento > 0 ? 100 : 0);

    // Comparativo por loja/operação (faturamento confirmado no período)
    const { data: storesAll } = await c.supabase.from("stores").select("id,nome");
    const lojaNome: Record<string, string> = {}; (storesAll || []).forEach((s) => { lojaNome[s.id as string] = s.nome as string; });
    const porLojaMap: Record<string, number> = {};
    confPeriodo.forEach((r) => { const k = (r.store_id as string) || ""; porLojaMap[k] = (porLojaMap[k] || 0) + (Number(r.total) || 0); });
    const porLoja = Object.entries(porLojaMap).map(([id, total]) => ({ loja: lojaNome[id] || "—", total: Math.round(total * 100) / 100 })).sort((a, b) => b.total - a.total);

    // Obras em andamento (não concluídas)
    let oq = c.supabase.from("obras").select("nome,status,progresso,customer_id,sale_id,store_id").neq("status", "concluida").order("created_at", { ascending: false }).limit(6);
    if (storeId) oq = oq.eq("store_id", storeId);
    const { data: obrasRows } = await oq;
    const obrasAndamento = (obrasRows || []).map((o) => ({ nome: (o.nome as string) || "Obra", cliente: "", progresso: Number(o.progresso) || 0, status: (o.status as string) || "aguardando" }));

    // Agenda de hoje
    const hojeStr = agora.toISOString().slice(0, 10);
    let aq = c.supabase.from("agenda_eventos").select("hora,tipo,cliente_nome,store_id").eq("data", hojeStr).order("hora").limit(8);
    if (storeId) aq = aq.eq("store_id", storeId);
    const { data: agRows } = await aq;
    const agendaHoje = (agRows || []).map((e) => ({ hora: (e.hora as string) || "", tipo: (e.tipo as string) || "visita", cliente: (e.cliente_nome as string) || "—" }));

    // Alertas
    const alertas: string[] = [];
    if (orcAberto > 0) alertas.push(`${orcAberto} orçamento(s) em aberto aguardando decisão.`);
    if (aReceber > 0) alertas.push(`${formatBRL(aReceber)} em contas a receber em aberto.`);
    if (obrasExec > 0) alertas.push(`${obrasExec} venda(s) em produção/execução.`);

    return {
      faturamento: Math.round(faturamento * 100) / 100, vendas, ticketMedio: Math.round(ticketMedio * 100) / 100,
      orcAberto, obrasExec, aReceber: Math.round(aReceber * 100) / 100,
      faturamentoAnterior: Math.round(faturamentoAnterior * 100) / 100, deltaFaturamentoPct,
      evolucao, meta, realizado: faturamento, vendasRecentes, melhoresVendedores, funil,
      porLoja, obrasAndamento, agendaHoje, alertas, atualizadoEm: agora.toISOString(), temDados: true,
    };
  } catch {
    return vazio(); // mock/sem sessão: zeros, sem dados fictícios
  }
}
