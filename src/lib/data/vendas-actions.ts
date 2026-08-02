"use server";

import { getCtx, ctxHasPerm, ctxAudit } from "@/lib/data/server-ctx";
import { calcOrc, custoProdutosOrc, margemOrc, type OrcamentoCalc, type Regra } from "@/lib/commercial/calc";

// ====================== COMERCIAL — server actions ======================

export type MedidaIn = { l?: number; a?: number; q?: number; unit?: string };
export type ItemIn = { product_id: string | null; regra: string; desc_pct?: number; preco_override?: number | null; medidas: MedidaIn[] };
export type AmbienteIn = { nome: string; itens: ItemIn[] };
export type OrcamentoIn = {
  store_id: string; cliente_id: string | null; cliente_nome: string;
  seller_id: string | null; vend_nome: string;
  desc_pct?: number; acrescimo?: number; frete?: number; instalacao?: number;
  obs?: string; obs_interna?: string; prazo_dias?: number | null; condicao?: unknown;
  ambientes: AmbienteIn[];
};

type Ctx = Awaited<ReturnType<typeof getCtx>>;

// Não vaza erro bruto do PostgreSQL para a UI: registra o técnico no log do servidor
// e devolve uma mensagem amigável. Casos conhecidos ganham texto específico.
function dbErro(contexto: string, tecnico: string): string {
  console.error(`[vendas] ${contexto}:`, tecnico); // fica só no servidor
  if (/more than one row returned by a subquery/i.test(tecnico))
    return "Não foi possível gravar por uma inconsistência de escopo de loja. Recarregue e tente novamente; se persistir, avise o administrador.";
  if (/row-level security|permission denied/i.test(tecnico))
    return "Você não tem permissão para esta operação nesta loja.";
  if (/duplicate key|unique constraint/i.test(tecnico))
    return "Registro duplicado. Atualize a página e tente novamente.";
  return "Não foi possível concluir a operação. Tente novamente; se persistir, avise o administrador.";
}

// monta o objeto de cálculo (puro) com os produtos reais, para totais/custo/margem no servidor
async function montarCalc(c: Ctx, orc: OrcamentoIn): Promise<OrcamentoCalc> {
  const ids = Array.from(new Set(orc.ambientes.flatMap((a) => a.itens.map((i) => i.product_id).filter(Boolean)))) as string[];
  const prodMap: Record<string, { preco: number; custoBase: number; larguraMolduraCm: number; multiplicadorCorte: number }> = {};
  if (ids.length) {
    const { data } = await c.supabase.from("products").select("id,preco,custo_base,largura_moldura_cm,multiplicador_corte").in("id", ids);
    (data || []).forEach((p) => {
      prodMap[p.id as string] = {
        preco: Number(p.preco) || 0, custoBase: Number(p.custo_base) || 0,
        larguraMolduraCm: Number(p.largura_moldura_cm) || 0, multiplicadorCorte: Number(p.multiplicador_corte) || 8,
      };
    });
  }
  return {
    itens: orc.ambientes.flatMap((a) => a.itens.map((i) => ({
      regra: i.regra as Regra, descPct: i.desc_pct || 0, precoOverride: i.preco_override ?? null,
      medidas: i.medidas.map((m) => ({ l: m.l, a: m.a, q: m.q, unit: (m.unit as "cm" | "mm" | "m") || "cm" })),
      produto: i.product_id ? prodMap[i.product_id] : undefined,
    }))),
    desc: orc.desc_pct || 0, acrescimo: orc.acrescimo || 0, frete: orc.frete || 0, instalacao: orc.instalacao || 0,
  };
}

async function validarLoja(c: Ctx, storeId: string): Promise<string | null> {
  if (!storeId) return "Selecione a loja da venda (obrigatória).";
  const { data } = await c.supabase.from("stores").select("id,ativo").eq("id", storeId).single();
  if (!data) return "Loja não encontrada.";
  if (data.ativo === false) return "Loja inativa não pode receber novos lançamentos.";
  return null;
}

async function gravarFilhos(c: Ctx, saleId: string, ambientes: AmbienteIn[]) {
  for (const amb of ambientes) {
    const { data: env, error: eEnv } = await c.supabase.from("sale_environments").insert({ sale_id: saleId, nome: amb.nome || "Ambiente" }).select("id").single();
    if (eEnv) throw new Error(eEnv.message);
    const envId = env?.id as string;
    for (const it of amb.itens) {
      const { data: item, error: eItem } = await c.supabase.from("sale_items").insert({
        sale_id: saleId, environment_id: envId, product_id: it.product_id, regra: it.regra,
        desc_pct: it.desc_pct || 0, preco_override: it.preco_override ?? null,
      }).select("id").single();
      if (eItem) throw new Error(eItem.message);
      const itemId = item?.id as string;
      if (it.medidas.length) {
        const { error: eMed } = await c.supabase.from("sale_measures").insert(it.medidas.map((m) => ({
          item_id: itemId, l: m.l || 0, a: m.a || 0, q: m.q || 1, unit: m.unit || "cm",
        })));
        if (eMed) throw new Error(eMed.message);
      }
    }
  }
}

type R = { ok: boolean; error?: string; id?: string };

export async function salvarOrcamento(id: string | null, orc: OrcamentoIn): Promise<R> {
  try {
    const c = await getCtx();
    if (!(await ctxHasPerm(c, "vendas.proprias")) && !(await ctxHasPerm(c, "vendas.loja")) && !(await ctxHasPerm(c, "vendas.todas")))
      return { ok: false, error: "Sem permissão para lançar vendas." };
    const errLoja = await validarLoja(c, orc.store_id);
    if (errLoja) return { ok: false, error: errLoja };
    if (!orc.cliente_nome?.trim()) return { ok: false, error: "Informe o cliente." };

    const calc = await montarCalc(c, orc);
    const total = calcOrc(calc).total;
    const custo = custoProdutosOrc(calc);
    const margem = margemOrc(calc).lucro;

    const base = {
      organization_id: c.org, store_id: orc.store_id,
      cliente_id: orc.cliente_id, cliente_nome: orc.cliente_nome, seller_id: orc.seller_id, vend_nome: orc.vend_nome,
      desc_pct: orc.desc_pct || 0, acrescimo: orc.acrescimo || 0, frete: orc.frete || 0, instalacao: orc.instalacao || 0,
      obs: orc.obs || null, obs_interna: orc.obs_interna || null, prazo_dias: orc.prazo_dias ?? null,
      condicao: orc.condicao ?? null, total, custo_prev: custo, margem_prev: margem,
    };

    if (id) {
      const { data: cur } = await c.supabase.from("sales").select("venda_gerada").eq("id", id).single();
      if (cur?.venda_gerada) return { ok: false, error: "Venda confirmada não pode ser editada como orçamento." };
      const { error } = await c.supabase.from("sales").update({ ...base, updated_by: c.uid, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) return { ok: false, error: dbErro("update sales", error.message) };
      await c.supabase.from("sale_environments").delete().eq("sale_id", id); // cascade nos filhos
      await gravarFilhos(c, id, orc.ambientes);
      await ctxAudit(c, "Comercial", "Editou orçamento", orc.cliente_nome);
      return { ok: true, id };
    } else {
      const { data: maxRow } = await c.supabase.from("sales").select("numero").eq("organization_id", c.org).eq("store_id", orc.store_id).order("numero", { ascending: false }).limit(1).maybeSingle();
      const numero = (Number(maxRow?.numero) || 1000) + 1;
      const { data: ins, error } = await c.supabase.from("sales").insert({
        ...base, numero, status: "ORCAMENTO", situacao: "ORCAMENTO", venda_gerada: false, created_by: c.uid,
      }).select("id").single();
      if (error) return { ok: false, error: dbErro("insert sales", error.message) };
      const saleId = ins?.id as string;
      await gravarFilhos(c, saleId, orc.ambientes);
      await ctxAudit(c, "Comercial", "Criou orçamento", orc.cliente_nome);
      return { ok: true, id: saleId };
    }
  } catch (e) { return { ok: false, error: dbErro("salvarOrcamento", (e as Error).message) }; }
}

export async function duplicarOrcamento(id: string): Promise<R> {
  try {
    const c = await getCtx();
    const { data: o } = await c.supabase.from("sales").select("*").eq("id", id).single();
    if (!o) return { ok: false, error: "Não encontrado." };
    const { data: envs } = await c.supabase.from("sale_environments").select("id,nome").eq("sale_id", id);
    const { data: items } = await c.supabase.from("sale_items").select("*").in("environment_id", (envs || []).map((e) => e.id));
    const { data: measures } = await c.supabase.from("sale_measures").select("*").in("item_id", (items || []).map((i) => i.id));
    const ambientes: AmbienteIn[] = (envs || []).map((e) => ({
      nome: e.nome as string,
      itens: (items || []).filter((i) => i.environment_id === e.id).map((i) => ({
        product_id: i.product_id as string | null, regra: i.regra as string, desc_pct: Number(i.desc_pct) || 0, preco_override: i.preco_override as number | null,
        medidas: (measures || []).filter((m) => m.item_id === i.id).map((m) => ({ l: Number(m.l), a: Number(m.a), q: Number(m.q), unit: m.unit as string })),
      })),
    }));
    return salvarOrcamento(null, {
      store_id: o.store_id as string, cliente_id: o.cliente_id as string | null, cliente_nome: (o.cliente_nome as string) + " (cópia)",
      seller_id: o.seller_id as string | null, vend_nome: o.vend_nome as string,
      desc_pct: Number(o.desc_pct), acrescimo: Number(o.acrescimo), frete: Number(o.frete), instalacao: Number(o.instalacao),
      obs: o.obs as string, obs_interna: o.obs_interna as string, prazo_dias: o.prazo_dias as number | null, condicao: o.condicao, ambientes,
    });
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function mudarSituacao(id: string, nova: string, obs?: string): Promise<R> {
  try {
    const c = await getCtx();
    const { data: o } = await c.supabase.from("sales").select("situacao").eq("id", id).single();
    if (!o) return { ok: false, error: "Não encontrado." };
    const { error } = await c.supabase.from("sales").update({ situacao: nova, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) return { ok: false, error: error.message };
    await c.supabase.from("sale_status_history").insert({ organization_id: c.org, sale_id: id, campo: "situacao", de: o.situacao as string, para: nova, user_id: c.uid, obs: obs || null });
    await ctxAudit(c, "Comercial", "Situação → " + nova, id);
    return { ok: true, id };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function excluirOuCancelarVenda(id: string): Promise<R & { blocked?: boolean; det?: { label: string; n: number }[] }> {
  try {
    const c = await getCtx();
    const { data: o } = await c.supabase.from("sales").select("venda_gerada,cliente_nome,situacao").eq("id", id).single();
    if (!o) return { ok: false, error: "Não encontrado." };
    const { count: recCount } = await c.supabase.from("receivables").select("*", { count: "exact", head: true }).eq("sale_id", id);
    const bloqueia = o.venda_gerada || (recCount || 0) > 0;
    if (bloqueia) {
      // venda confirmada / com recebimentos: cancela (inativa), nunca apaga
      const { error } = await c.supabase.from("sales").update({ situacao: "CANCELADO", updated_at: new Date().toISOString() }).eq("id", id);
      if (error) return { ok: false, error: error.message };
      await c.supabase.from("sale_status_history").insert({ organization_id: c.org, sale_id: id, campo: "situacao", de: o.situacao as string, para: "CANCELADO", user_id: c.uid, obs: "Cancelamento (venda com vínculo)" });
      await ctxAudit(c, "Comercial", "Cancelou venda (com vínculo)", (o.cliente_nome as string) || id);
      return { ok: true, blocked: true, det: [{ label: "venda confirmada/recebimentos — cancelada, não apagada", n: recCount || 0 }] };
    }
    await c.supabase.from("sale_environments").delete().eq("sale_id", id);
    const { error } = await c.supabase.from("sales").delete().eq("id", id);
    if (error) return { ok: false, error: error.message };
    await ctxAudit(c, "Comercial", "Excluiu orçamento", (o.cliente_nome as string) || id);
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function transformarEmVenda(id: string, dados: { entrada: number; forma?: string; conta?: string; operadora?: string; parcelas: number; idem: string }): Promise<R> {
  try {
    const c = await getCtx();
    if (!(await ctxHasPerm(c, "vendas.editar")) && !(await ctxHasPerm(c, "vendas.todas")) && !(await ctxHasPerm(c, "vendas.loja")) && !(await ctxHasPerm(c, "vendas.proprias")))
      return { ok: false, error: "Sem permissão." };
    const { data, error } = await c.supabase.rpc("fn_transformar_venda", {
      p_sale_id: id, p_idem: dados.idem, p_entrada: dados.entrada, p_forma: dados.forma || null,
      p_conta: dados.conta || null, p_operadora: dados.operadora || null, p_parcelas: dados.parcelas || 1, p_venc_primeira: null,
    });
    if (error) return { ok: false, error: dbErro("fn_transformar_venda", error.message) };
    await ctxAudit(c, "Comercial", "Transformou em venda", id);
    return { ok: true, id, ...(data as object) };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}
