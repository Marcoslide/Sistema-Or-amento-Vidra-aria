"use server";

import { getCtx, ctxHasPerm, ctxAudit } from "@/lib/data/server-ctx";

// ====================== FINANCEIRO — server actions ======================
// Dinheiro em numeric; operações críticas via RPC transacional/idempotente.
// Permissão sempre checada no servidor; erros do banco não vazam crus para a UI.

type R = { ok: boolean; error?: string };

function dbErro(ctx: string, tecnico: string): string {
  console.error(`[financeiro] ${ctx}:`, tecnico);
  if (/acima do saldo/i.test(tecnico)) return tecnico.replace(/.*acima do saldo[^)]*\)?/i, "Valor acima do saldo disponível.");
  if (/row-level security|permission denied/i.test(tecnico)) return "Você não tem permissão para esta operação nesta loja.";
  if (/duplicate key|unique constraint/i.test(tecnico)) return "Operação já registrada (evitada duplicidade).";
  return "Não foi possível concluir a operação. Tente novamente; se persistir, avise o administrador.";
}

// ---------------- CONTAS A RECEBER ----------------
export type ParcelaRow = {
  id: string; sale_id: string | null; descricao: string; valor: number; recebido: number; saldo: number;
  vencimento: string | null; status: string; store_id: string;
  cliente_nome: string | null; numero: number | null; vend_nome: string | null;
};
export async function getReceberData(saleId?: string): Promise<{ ok: boolean; error?: string; parcelas?: ParcelaRow[]; canReceber?: boolean; canEstornar?: boolean }> {
  try {
    const c = await getCtx();
    if (!(await ctxHasPerm(c, "fin.contas_receber"))) return { ok: false, error: "Sem permissão para Contas a Receber." };
    let q = c.supabase.from("receivables").select("id,sale_id,descricao,valor,vencimento,status,store_id").order("vencimento");
    if (saleId) q = q.eq("sale_id", saleId);
    const { data: recs } = await q;
    const ids = (recs || []).map((r) => r.id as string);
    const { data: pays } = ids.length
      ? await c.supabase.from("receivable_payments").select("receivable_id,valor,estornado").in("receivable_id", ids)
      : { data: [] as { receivable_id: string; valor: number; estornado: boolean }[] };
    const saleIds = Array.from(new Set((recs || []).map((r) => r.sale_id).filter(Boolean))) as string[];
    const { data: sales } = saleIds.length
      ? await c.supabase.from("sales").select("id,numero,cliente_nome,vend_nome").in("id", saleIds)
      : { data: [] as { id: string; numero: number; cliente_nome: string; vend_nome: string }[] };
    const saleMap: Record<string, { numero: number | null; cliente_nome: string | null; vend_nome: string | null }> = {};
    (sales || []).forEach((s) => { saleMap[s.id as string] = { numero: s.numero as number, cliente_nome: s.cliente_nome as string, vend_nome: s.vend_nome as string }; });
    const pagoBy: Record<string, number> = {};
    (pays || []).forEach((p) => { if (!p.estornado) pagoBy[p.receivable_id as string] = (pagoBy[p.receivable_id as string] || 0) + Number(p.valor); });
    const parcelas: ParcelaRow[] = (recs || []).map((r) => {
      const valor = Number(r.valor) || 0; const recebido = Number(pagoBy[r.id as string] || 0);
      const s = r.sale_id ? saleMap[r.sale_id as string] : undefined;
      return {
        id: r.id as string, sale_id: (r.sale_id as string) || null, descricao: (r.descricao as string) || "Parcela",
        valor, recebido, saldo: Math.round((valor - recebido) * 100) / 100,
        vencimento: (r.vencimento as string) || null, status: (r.status as string) || "ABERTO", store_id: r.store_id as string,
        cliente_nome: s?.cliente_nome ?? null, numero: s?.numero ?? null, vend_nome: s?.vend_nome ?? null,
      };
    });
    return { ok: true, parcelas, canReceber: await ctxHasPerm(c, "fin.baixar"), canEstornar: await ctxHasPerm(c, "fin.estornar") };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

// ---- Contas a Receber por VENDA (paridade V6: 1 linha = 1 venda, agrega as parcelas) ----
export type VendaReceberRow = {
  sale_id: string; numero: number | null; cliente_nome: string | null; vend_nome: string | null;
  store_id: string; loja_nome: string; total: number; recebido: number; saldo: number;
  proxVencimento: string | null; situacao: "ABERTA" | "PARCIAL" | "QUITADA" | "VENCIDA";
};
export async function getReceberPorVenda(): Promise<{ ok: boolean; error?: string; vendas?: VendaReceberRow[]; canReceber?: boolean; canEstornar?: boolean }> {
  try {
    const c = await getCtx();
    if (!(await ctxHasPerm(c, "fin.contas_receber"))) return { ok: false, error: "Sem permissão para Contas a Receber." };
    const { data: recs } = await c.supabase.from("receivables").select("id,sale_id,valor,vencimento,status,store_id");
    const rows = recs || [];
    const ids = rows.map((r) => r.id as string);
    const { data: pays } = ids.length
      ? await c.supabase.from("receivable_payments").select("receivable_id,valor,estornado").in("receivable_id", ids)
      : { data: [] as { receivable_id: string; valor: number; estornado: boolean }[] };
    const pagoBy: Record<string, number> = {};
    (pays || []).forEach((p) => { if (!p.estornado) pagoBy[p.receivable_id as string] = (pagoBy[p.receivable_id as string] || 0) + Number(p.valor); });

    const saleIds = Array.from(new Set(rows.map((r) => r.sale_id).filter(Boolean))) as string[];
    if (!saleIds.length) return { ok: true, vendas: [], canReceber: await ctxHasPerm(c, "fin.baixar"), canEstornar: await ctxHasPerm(c, "fin.estornar") };
    const [{ data: sales }, { data: stores }] = await Promise.all([
      c.supabase.from("sales").select("id,numero,cliente_nome,vend_nome,store_id").in("id", saleIds),
      c.supabase.from("stores").select("id,nome"),
    ]);
    const lojaBy: Record<string, string> = {}; (stores || []).forEach((s) => { lojaBy[s.id as string] = s.nome as string; });
    const hoje = new Date().toISOString().slice(0, 10);

    const bySale: Record<string, { total: number; recebido: number; proxVenc: string | null; temVencida: boolean }> = {};
    rows.forEach((r) => {
      const sid = r.sale_id as string; if (!sid) return;
      const valor = Number(r.valor) || 0; const recebido = Number(pagoBy[r.id as string] || 0);
      const saldo = valor - recebido;
      const venc = (r.vencimento as string) || null;
      const agg = (bySale[sid] ||= { total: 0, recebido: 0, proxVenc: null, temVencida: false });
      agg.total += valor; agg.recebido += recebido;
      if (saldo > 0.005) {
        if (venc && venc < hoje) agg.temVencida = true;
        if (venc && (!agg.proxVenc || venc < agg.proxVenc)) agg.proxVenc = venc;
      }
    });

    const vendas: VendaReceberRow[] = (sales || []).map((s) => {
      const agg = bySale[s.id as string] || { total: 0, recebido: 0, proxVenc: null, temVencida: false };
      const saldo = Math.round((agg.total - agg.recebido) * 100) / 100;
      let situacao: VendaReceberRow["situacao"] = "ABERTA";
      if (saldo <= 0.005) situacao = "QUITADA";
      else if (agg.temVencida) situacao = "VENCIDA";
      else if (agg.recebido > 0.005) situacao = "PARCIAL";
      return {
        sale_id: s.id as string, numero: (s.numero as number) ?? null, cliente_nome: (s.cliente_nome as string) || null,
        vend_nome: (s.vend_nome as string) || null, store_id: (s.store_id as string) || "", loja_nome: lojaBy[s.store_id as string] || "—",
        total: Math.round(agg.total * 100) / 100, recebido: Math.round(agg.recebido * 100) / 100, saldo,
        proxVencimento: agg.proxVenc, situacao,
      };
    });
    return { ok: true, vendas, canReceber: await ctxHasPerm(c, "fin.baixar"), canEstornar: await ctxHasPerm(c, "fin.estornar") };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function receberParcela(receivableId: string, dados: { valor: number; forma?: string; conta?: string; operadora?: string; idem: string }): Promise<R> {
  try {
    const c = await getCtx();
    if (!(await ctxHasPerm(c, "fin.baixar"))) return { ok: false, error: "Sem permissão para baixar títulos." };
    const { error } = await c.supabase.rpc("fn_receber_parcela", {
      p_receivable_id: receivableId, p_valor: dados.valor, p_idem: dados.idem,
      p_forma: dados.forma || null, p_conta: dados.conta || null, p_operadora: dados.operadora || null,
    });
    if (error) return { ok: false, error: dbErro("fn_receber_parcela", error.message) };
    await ctxAudit(c, "Financeiro", "Recebeu parcela", receivableId);
    return { ok: true };
  } catch (e) { return { ok: false, error: dbErro("receberParcela", (e as Error).message) }; }
}

export type RecebimentoRow = { id: string; valor: number; forma: string | null; conta: string | null; estornado: boolean; created_at: string };
export async function getRecebimentosParcela(receivableId: string): Promise<{ ok: boolean; error?: string; itens?: RecebimentoRow[] }> {
  try {
    const c = await getCtx();
    if (!(await ctxHasPerm(c, "fin.contas_receber"))) return { ok: false, error: "Sem permissão." };
    const { data } = await c.supabase.from("receivable_payments")
      .select("id,valor,forma,conta,estornado,created_at").eq("receivable_id", receivableId).order("created_at");
    return { ok: true, itens: (data || []).map((p) => ({ id: p.id as string, valor: Number(p.valor) || 0, forma: (p.forma as string) || null, conta: (p.conta as string) || null, estornado: Boolean(p.estornado), created_at: p.created_at as string })) };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function estornarRecebimento(paymentId: string): Promise<R> {
  try {
    const c = await getCtx();
    if (!(await ctxHasPerm(c, "fin.estornar"))) return { ok: false, error: "Sem permissão para estornar." };
    const { error } = await c.supabase.rpc("fn_estornar_recebimento", { p_payment_id: paymentId });
    if (error) return { ok: false, error: dbErro("fn_estornar_recebimento", error.message) };
    await ctxAudit(c, "Financeiro", "Estornou recebimento", paymentId);
    return { ok: true };
  } catch (e) { return { ok: false, error: dbErro("estornarRecebimento", (e as Error).message) }; }
}

// ---------------- CAIXA ----------------
export type CaixaRow = {
  id: string; data: string; tipo: string; valor: number; descricao: string | null; forma: string | null;
  store_id: string; origem_tipo: string | null;
};
export async function getCaixaData(storeId?: string): Promise<{ ok: boolean; error?: string; movimentos?: CaixaRow[]; entradas?: number; saidas?: number; saldo?: number }> {
  try {
    const c = await getCtx();
    if (!(await ctxHasPerm(c, "fin.caixa"))) return { ok: false, error: "Sem permissão para o Caixa." };
    let q = c.supabase.from("cash_movements").select("id,data,tipo,valor,descricao,forma,store_id,origem_tipo").order("created_at", { ascending: false });
    if (storeId) q = q.eq("store_id", storeId);
    const { data } = await q;
    const movimentos: CaixaRow[] = (data || []).map((m) => ({
      id: m.id as string, data: (m.data as string) || "", tipo: m.tipo as string, valor: Number(m.valor) || 0,
      descricao: (m.descricao as string) || null, forma: (m.forma as string) || null,
      store_id: m.store_id as string, origem_tipo: (m.origem_tipo as string) || null,
    }));
    const entradas = movimentos.filter((m) => m.tipo === "entrada").reduce((s, m) => s + m.valor, 0);
    const saidas = movimentos.filter((m) => m.tipo === "saida").reduce((s, m) => s + m.valor, 0);
    return { ok: true, movimentos, entradas: Math.round(entradas * 100) / 100, saidas: Math.round(saidas * 100) / 100, saldo: Math.round((entradas - saidas) * 100) / 100 };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

// ---------------- CONTAS A PAGAR ----------------
export type PagarRow = {
  id: string; descricao: string; fornecedor: string | null; categoria: string | null; category_id: string | null; valor: number;
  pago: number; saldo: number; vencimento: string | null; store_id: string; cancelada: boolean;
};
export async function getPagarData(): Promise<{ ok: boolean; error?: string; contas?: PagarRow[]; canPagar?: boolean; canEstornar?: boolean; canExcluir?: boolean }> {
  try {
    const c = await getCtx();
    if (!(await ctxHasPerm(c, "fin.contas_pagar"))) return { ok: false, error: "Sem permissão para Contas a Pagar." };
    const { data: pbs } = await c.supabase.from("payables").select("id,descricao,fornecedor,categoria,category_id,valor,vencimento,store_id,cancelada").order("vencimento");
    const ids = (pbs || []).map((p) => p.id as string);
    const { data: pays } = ids.length
      ? await c.supabase.from("payable_payments").select("payable_id,valor,estornado").in("payable_id", ids)
      : { data: [] as { payable_id: string; valor: number; estornado: boolean }[] };
    const pagoBy: Record<string, number> = {};
    (pays || []).forEach((p) => { if (!p.estornado) pagoBy[p.payable_id as string] = (pagoBy[p.payable_id as string] || 0) + Number(p.valor); });
    const contas: PagarRow[] = (pbs || []).map((p) => {
      const valor = Number(p.valor) || 0; const pago = Number(pagoBy[p.id as string] || 0);
      return {
        id: p.id as string, descricao: (p.descricao as string) || "Despesa", fornecedor: (p.fornecedor as string) || null,
        categoria: (p.categoria as string) || null, category_id: (p.category_id as string) || null, valor, pago, saldo: Math.round((valor - pago) * 100) / 100,
        vencimento: (p.vencimento as string) || null, store_id: p.store_id as string, cancelada: Boolean(p.cancelada),
      };
    });
    return { ok: true, contas, canPagar: await ctxHasPerm(c, "fin.contas_pagar"), canEstornar: await ctxHasPerm(c, "fin.estornar"), canExcluir: await ctxHasPerm(c, "fin.excluir_contas") };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function salvarPagar(id: string | null, dados: {
  descricao: string; fornecedor?: string; categoria?: string; category_id?: string | null; valor: number; vencimento?: string | null;
  competencia?: string | null; forma?: string; conta_fin?: string; ocorrencia?: string; store_id: string;
}): Promise<R & { id?: string }> {
  try {
    const c = await getCtx();
    if (!(await ctxHasPerm(c, "fin.contas_pagar"))) return { ok: false, error: "Sem permissão." };
    if (!dados.descricao?.trim()) return { ok: false, error: "Informe a descrição da despesa." };
    if (!dados.store_id) return { ok: false, error: "Selecione a loja (obrigatória)." };
    // Relacionamento real: se veio category_id, deriva o texto legado do nome da categoria.
    let categoriaTxt = dados.categoria || null;
    if (dados.category_id) {
      const { data: fc } = await c.supabase.from("financial_categories").select("nome").eq("id", dados.category_id).eq("organization_id", c.org).maybeSingle();
      if (fc?.nome) categoriaTxt = fc.nome as string;
    }
    const base = {
      descricao: dados.descricao.trim(), fornecedor: dados.fornecedor || null, categoria: categoriaTxt, category_id: dados.category_id || null,
      valor: dados.valor || 0, vencimento: dados.vencimento || null, competencia: dados.competencia || null,
      forma: dados.forma || null, conta_fin: dados.conta_fin || null, ocorrencia: dados.ocorrencia || "Única",
      store_id: dados.store_id,
    };
    if (id) {
      const { error } = await c.supabase.from("payables").update(base).eq("id", id).eq("organization_id", c.org);
      if (error) return { ok: false, error: dbErro("update payables", error.message) };
      await ctxAudit(c, "Financeiro", "Editou conta a pagar", base.descricao);
      return { ok: true, id };
    }
    const { data: ins, error } = await c.supabase.from("payables").insert({ ...base, organization_id: c.org, created_by: c.uid }).select("id").single();
    if (error) return { ok: false, error: dbErro("insert payables", error.message) };
    await ctxAudit(c, "Financeiro", "Criou conta a pagar", base.descricao);
    return { ok: true, id: ins?.id as string };
  } catch (e) { return { ok: false, error: dbErro("salvarPagar", (e as Error).message) }; }
}

export async function pagarConta(payableId: string, dados: { valor: number; forma?: string; conta_fin?: string; idem: string }): Promise<R> {
  try {
    const c = await getCtx();
    if (!(await ctxHasPerm(c, "fin.contas_pagar"))) return { ok: false, error: "Sem permissão para pagar." };
    const { error } = await c.supabase.rpc("fn_pagar_conta", {
      p_payable_id: payableId, p_valor: dados.valor, p_idem: dados.idem, p_forma: dados.forma || null, p_conta_fin: dados.conta_fin || null,
    });
    if (error) return { ok: false, error: dbErro("fn_pagar_conta", error.message) };
    await ctxAudit(c, "Financeiro", "Pagou conta", payableId);
    return { ok: true };
  } catch (e) { return { ok: false, error: dbErro("pagarConta", (e as Error).message) }; }
}

export type PagamentoRow = { id: string; valor: number; forma: string | null; estornado: boolean; created_at: string };
export async function getPagamentosConta(payableId: string): Promise<{ ok: boolean; error?: string; itens?: PagamentoRow[] }> {
  try {
    const c = await getCtx();
    if (!(await ctxHasPerm(c, "fin.contas_pagar"))) return { ok: false, error: "Sem permissão." };
    const { data } = await c.supabase.from("payable_payments").select("id,valor,forma,estornado,created_at").eq("payable_id", payableId).order("created_at");
    return { ok: true, itens: (data || []).map((p) => ({ id: p.id as string, valor: Number(p.valor) || 0, forma: (p.forma as string) || null, estornado: Boolean(p.estornado), created_at: p.created_at as string })) };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function estornarPagamento(paymentId: string): Promise<R> {
  try {
    const c = await getCtx();
    if (!(await ctxHasPerm(c, "fin.estornar"))) return { ok: false, error: "Sem permissão para estornar." };
    const { error } = await c.supabase.rpc("fn_estornar_pagamento", { p_payment_id: paymentId });
    if (error) return { ok: false, error: dbErro("fn_estornar_pagamento", error.message) };
    await ctxAudit(c, "Financeiro", "Estornou pagamento", paymentId);
    return { ok: true };
  } catch (e) { return { ok: false, error: dbErro("estornarPagamento", (e as Error).message) }; }
}

// exclusão segura de conta a pagar: bloqueia se houver pagamento não estornado ou se cancelada/paga.
export async function excluirPagar(id: string): Promise<R & { blocked?: boolean }> {
  try {
    const c = await getCtx();
    if (!(await ctxHasPerm(c, "fin.excluir_contas"))) return { ok: false, error: "Sem permissão para excluir." };
    const { count } = await c.supabase.from("payable_payments").select("*", { count: "exact", head: true }).eq("payable_id", id).eq("estornado", false);
    if ((count || 0) > 0) return { ok: false, blocked: true, error: "Conta com pagamento ativo — estorne antes de excluir." };
    const { error } = await c.supabase.from("payables").delete().eq("id", id).eq("organization_id", c.org);
    if (error) return { ok: false, error: dbErro("delete payables", error.message) };
    await ctxAudit(c, "Financeiro", "Excluiu conta a pagar", id);
    return { ok: true };
  } catch (e) { return { ok: false, error: dbErro("excluirPagar", (e as Error).message) }; }
}
