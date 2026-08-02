"use server";

import { getCtx, ctxHasPerm, ctxAudit } from "@/lib/data/server-ctx";
import { analiseVenda, pontoEquilibrio, type AnaliseVenda } from "@/lib/financial/calc";

type R = { ok: boolean; error?: string };

// ---------------- ANÁLISE FINANCEIRA POR VENDA ----------------
export type ExtraRow = { id: string; descricao: string; categoria: string | null; valor: number; data: string | null; fornecedor: string | null; participa_margem: boolean };
export type AnaliseVendaData = {
  sale: { id: string; numero: number | null; cliente_nome: string | null };
  analise: AnaliseVenda; extras: ExtraRow[]; recebido: number; canEdit: boolean;
};

export async function getAnaliseVenda(saleId: string): Promise<{ ok: boolean; error?: string; data?: AnaliseVendaData }> {
  try {
    const c = await getCtx();
    // visível apenas a quem pode ver custos/margem
    if (!(await ctxHasPerm(c, "fin.ver_custos")) && !(await ctxHasPerm(c, "fin.ver_margem")))
      return { ok: false, error: "Sem permissão para ver a análise financeira." };
    const { data: s } = await c.supabase.from("sales")
      .select("id,numero,cliente_nome,total,desc_pct,acrescimo,frete,instalacao,custo_prev").eq("id", saleId).maybeSingle();
    if (!s) return { ok: false, error: "Venda não encontrada." };
    const { data: extrasRows } = await c.supabase.from("sale_extra_costs")
      .select("id,descricao,categoria,valor,data,fornecedor,participa_margem").eq("sale_id", saleId).order("created_at");
    const { data: pays } = await c.supabase.from("receivable_payments").select("valor,estornado").eq("sale_id", saleId);
    const recebido = (pays || []).filter((p) => !p.estornado).reduce((acc, p) => acc + Number(p.valor), 0);

    const total = Number(s.total) || 0;
    const descPct = Number(s.desc_pct) || 0;
    // receita bruta = subtotal antes de desconto/extras; reconstruída a partir do total salvo
    const acr = Number(s.acrescimo) || 0, frete = Number(s.frete) || 0, inst = Number(s.instalacao) || 0;
    const subMaisAcr = total - frete - inst;                 // sub - desconto + acréscimo
    const sub = descPct < 100 ? (subMaisAcr - acr) / (1 - descPct / 100) : subMaisAcr - acr;
    const descontos = Math.round(sub * (descPct / 100) * 100) / 100;

    const extras = (extrasRows || []).map((e) => ({
      id: e.id as string, descricao: e.descricao as string, categoria: (e.categoria as string) || null,
      valor: Number(e.valor) || 0, data: (e.data as string) || null, fornecedor: (e.fornecedor as string) || null,
      participa_margem: e.participa_margem !== false,
    }));
    const analise = analiseVenda({
      receitaBruta: sub, descontos, acrescimos: acr, frete, instalacao: inst,
      custoProdutos: Number(s.custo_prev) || 0,
      extras: extras.map((e) => ({ valor: e.valor, participaMargem: e.participa_margem })),
      recebido,
    });
    return {
      ok: true,
      data: {
        sale: { id: s.id as string, numero: (s.numero as number) ?? null, cliente_nome: (s.cliente_nome as string) || null },
        analise, extras, recebido: Math.round(recebido * 100) / 100,
        canEdit: await ctxHasPerm(c, "fin.custos_venda"),
      },
    };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function addCustoExtra(saleId: string, dados: { descricao: string; categoria?: string; valor: number; data?: string; fornecedor?: string; participa_margem: boolean }): Promise<R> {
  try {
    const c = await getCtx();
    if (!(await ctxHasPerm(c, "fin.custos_venda"))) return { ok: false, error: "Sem permissão para lançar custos." };
    if (!dados.descricao?.trim()) return { ok: false, error: "Informe a descrição do custo." };
    const { data: s } = await c.supabase.from("sales").select("store_id").eq("id", saleId).maybeSingle();
    const { error } = await c.supabase.from("sale_extra_costs").insert({
      organization_id: c.org, sale_id: saleId, store_id: (s?.store_id as string) || null,
      descricao: dados.descricao.trim(), categoria: dados.categoria || "outro", valor: dados.valor || 0,
      data: dados.data || null, fornecedor: dados.fornecedor || null, participa_margem: dados.participa_margem, created_by: c.uid,
    });
    if (error) return { ok: false, error: error.message };
    await ctxAudit(c, "Financeiro", "Adicionou custo à venda", saleId);
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function removeCustoExtra(id: string): Promise<R> {
  try {
    const c = await getCtx();
    if (!(await ctxHasPerm(c, "fin.custos_venda"))) return { ok: false, error: "Sem permissão." };
    const { error } = await c.supabase.from("sale_extra_costs").delete().eq("id", id).eq("organization_id", c.org);
    if (error) return { ok: false, error: error.message };
    await ctxAudit(c, "Financeiro", "Removeu custo da venda", id);
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

// ---------------- PONTO DE EQUILÍBRIO ----------------
export type PEData = {
  receitaVendida: number; receitaRecebida: number; custosFixos: number; custosVariaveis: number;
  margemPct: number; receitaEquilibrio: number; falta: number; excedeu: number; percentualAtingido: number; positivo: boolean;
};
export async function getPontoEquilibrio(storeId?: string): Promise<{ ok: boolean; error?: string; data?: PEData }> {
  try {
    const c = await getCtx();
    if (!(await ctxHasPerm(c, "fin.ponto_equilibrio"))) return { ok: false, error: "Sem permissão para o Ponto de Equilíbrio." };
    let sq = c.supabase.from("sales").select("total,venda_gerada,store_id");
    if (storeId) sq = sq.eq("store_id", storeId);
    const { data: sales } = await sq;
    const receitaVendida = (sales || []).filter((s) => s.venda_gerada).reduce((acc, s) => acc + (Number(s.total) || 0), 0);

    let rq = c.supabase.from("receivable_payments").select("valor,estornado,store_id");
    if (storeId) rq = rq.eq("store_id", storeId);
    const { data: pays } = await rq;
    const receitaRecebida = (pays || []).filter((p) => !p.estornado).reduce((acc, p) => acc + Number(p.valor), 0);

    let cq = c.supabase.from("cost_centers").select("valor,base_valor,tipo,store_id,ativo");
    if (storeId) cq = cq.eq("store_id", storeId);
    const { data: ccs } = await cq;
    const ativos = (ccs || []).filter((x) => x.ativo !== false && x.base_valor !== false);
    const custosFixos = ativos.filter((x) => (x.tipo as string) !== "variavel").reduce((acc, x) => acc + Number(x.valor), 0);
    const custosVariaveis = ativos.filter((x) => (x.tipo as string) === "variavel").reduce((acc, x) => acc + Number(x.valor), 0);

    // margem de contribuição % média = (receita vendida - custos variáveis) / receita vendida
    const margemPct = receitaVendida > 0 ? ((receitaVendida - custosVariaveis) / receitaVendida) * 100 : 0;
    const pe = pontoEquilibrio({ custosFixos, margemContribuicaoPct: margemPct, receitaAtual: receitaVendida });
    return {
      ok: true,
      data: {
        receitaVendida: Math.round(receitaVendida * 100) / 100, receitaRecebida: Math.round(receitaRecebida * 100) / 100,
        custosFixos: pe.custosFixos, custosVariaveis: Math.round(custosVariaveis * 100) / 100, margemPct: pe.margemPct,
        receitaEquilibrio: pe.receitaEquilibrio, falta: pe.falta, excedeu: pe.excedeu,
        percentualAtingido: pe.percentualAtingido, positivo: pe.positivo,
      },
    };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}
