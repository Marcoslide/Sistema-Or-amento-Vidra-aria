"use server";

import { getCtx } from "@/lib/data/server-ctx";

// Dados do Dashboard V6, lidos do Supabase (RLS-scoped). Sem mock: em falha/sem sessão
// retorna estrutura zerada (a UI mostra zeros, nunca dados fictícios).

export type DashboardData = {
  faturamento: number; vendas: number; ticketMedio: number; orcAberto: number;
  obrasExec: number; aReceber: number;
  evolucao: { mes: string; valor: number }[];
  meta: number; realizado: number;
  vendasRecentes: { id: string; numero: number | null; cliente: string; situacao: string; total: number; criado: string }[];
  melhoresVendedores: { nome: string; total: number }[];
  funil: { label: string; chave: string; n: number }[];
  temDados: boolean;
};

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const vazio = (): DashboardData => ({
  faturamento: 0, vendas: 0, ticketMedio: 0, orcAberto: 0, obrasExec: 0, aReceber: 0,
  evolucao: [], meta: 0, realizado: 0, vendasRecentes: [], melhoresVendedores: [], funil: [], temDados: false,
});

export async function getDashboard(periodo: "hoje" | "semana" | "mes" | "ano" = "mes"): Promise<DashboardData> {
  try {
    const c = await getCtx();
    const { data: sales } = await c.supabase
      .from("sales")
      .select("id,numero,cliente_nome,vend_nome,situacao,status,venda_gerada,total,created_at")
      .order("created_at", { ascending: false });
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
    const obrasExec = rows.filter((r) => ["PRODUCAO", "EXECUCAO"].includes(r.situacao || r.status)).length;

    // a receber = títulos - recebimentos não estornados
    const { data: recs } = await c.supabase.from("receivables").select("valor");
    const { data: pays } = await c.supabase.from("receivable_payments").select("valor,estornado");
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

    return {
      faturamento: Math.round(faturamento * 100) / 100, vendas, ticketMedio: Math.round(ticketMedio * 100) / 100,
      orcAberto, obrasExec, aReceber: Math.round(aReceber * 100) / 100,
      evolucao, meta, realizado: faturamento, vendasRecentes, melhoresVendedores, funil, temDados: true,
    };
  } catch {
    return vazio(); // mock/sem sessão: zeros, sem dados fictícios
  }
}
