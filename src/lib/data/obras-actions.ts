"use server";

import { getCtx, ctxHasPerm, ctxAudit } from "@/lib/data/server-ctx";
import { progressoChecklist } from "@/lib/obras/calc";

// Recalcula obras.progresso a partir do checklist real (fonte única de verdade).
// Nunca editável manualmente pelo usuário — sempre derivado do andamento dos itens.
async function recalcularProgresso(c: Awaited<ReturnType<typeof getCtx>>, obraId: string) {
  const { data: itens } = await c.supabase.from("obra_checklist").select("feito").eq("obra_id", obraId);
  const pct = progressoChecklist((itens || []).map((i) => ({ feito: Boolean(i.feito) })));
  await c.supabase.from("obras").update({ progresso: pct }).eq("id", obraId).eq("organization_id", c.org);
  return pct;
}

// ============================================================
// Obras — acompanhamento operacional (paridade V6). SEM valores financeiros.
// Status kanban: aguardando | execucao | concluida.
// RLS garante o escopo por organização/loja.
// ============================================================

export type ObraRow = {
  id: string; nome: string; endereco: string; status: string; responsavel: string;
  progresso: number; prazo: string | null; store_id: string | null; loja_nome: string;
  sale_id: string | null; sale_numero: number | null; cliente_nome: string;
};

const R = () => ({ ok: false as boolean, error: undefined as string | undefined });

export async function listObras(storeId?: string): Promise<{ ok: boolean; error?: string; data?: ObraRow[] }> {
  try {
    const c = await getCtx();
    if (!(await ctxHasPerm(c, "obras.ver"))) return { ok: false, error: "Sem permissão para ver obras." };
    let q = c.supabase.from("obras")
      .select("id,nome,endereco,status,responsavel,progresso,prazo,store_id,sale_id,customer_id")
      .eq("organization_id", c.org).order("created_at", { ascending: false });
    if (storeId) q = q.eq("store_id", storeId);
    const { data, error } = await q;
    if (error) return { ok: false, error: error.message };
    const rows = data || [];
    const storeIds = Array.from(new Set(rows.map((r) => r.store_id).filter(Boolean))) as string[];
    const saleIds = Array.from(new Set(rows.map((r) => r.sale_id).filter(Boolean))) as string[];
    const custIds = Array.from(new Set(rows.map((r) => r.customer_id).filter(Boolean))) as string[];
    const [{ data: stores }, { data: sales }, { data: custs }] = await Promise.all([
      storeIds.length ? c.supabase.from("stores").select("id,nome").in("id", storeIds) : Promise.resolve({ data: [] }),
      saleIds.length ? c.supabase.from("sales").select("id,numero,cliente_nome").in("id", saleIds) : Promise.resolve({ data: [] }),
      custIds.length ? c.supabase.from("customers").select("id,nome").in("id", custIds) : Promise.resolve({ data: [] }),
    ]);
    const lojaBy: Record<string, string> = {}; (stores || []).forEach((s) => { lojaBy[s.id as string] = s.nome as string; });
    const saleBy: Record<string, { numero: number | null; cli: string }> = {};
    (sales || []).forEach((s) => { saleBy[s.id as string] = { numero: (s.numero as number) ?? null, cli: (s.cliente_nome as string) || "" }; });
    const custBy: Record<string, string> = {}; (custs || []).forEach((x) => { custBy[x.id as string] = x.nome as string; });
    return {
      ok: true,
      data: rows.map((r) => ({
        id: r.id as string, nome: (r.nome as string) || "", endereco: (r.endereco as string) || "",
        status: (r.status as string) || "aguardando", responsavel: (r.responsavel as string) || "",
        progresso: Number(r.progresso) || 0, prazo: (r.prazo as string) || null,
        store_id: (r.store_id as string) || null, loja_nome: r.store_id ? (lojaBy[r.store_id as string] || "—") : "—",
        sale_id: (r.sale_id as string) || null, sale_numero: r.sale_id ? (saleBy[r.sale_id as string]?.numero ?? null) : null,
        cliente_nome: (r.customer_id && custBy[r.customer_id as string]) || (r.sale_id && saleBy[r.sale_id as string]?.cli) || "",
      })),
    };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export type ChecklistItem = { id: string; texto: string; feito: boolean };
export type DiarioItem = { id: string; data: string; texto: string; foto_url: string | null };
export type ObraFull = ObraRow & { checklist: ChecklistItem[]; diario: DiarioItem[] };

export async function getObra(id: string): Promise<{ ok: boolean; error?: string; data?: ObraFull }> {
  try {
    const c = await getCtx();
    if (!(await ctxHasPerm(c, "obras.ver"))) return { ok: false, error: "Sem permissão." };
    const { data: o } = await c.supabase.from("obras").select("*").eq("id", id).eq("organization_id", c.org).maybeSingle();
    if (!o) return { ok: false, error: "Obra não encontrada." };
    const [{ data: chk }, { data: dia }, { data: store }, { data: sale }, { data: cust }] = await Promise.all([
      c.supabase.from("obra_checklist").select("id,texto,feito").eq("obra_id", id).order("created_at"),
      c.supabase.from("obra_diario").select("id,data,texto,foto_url").eq("obra_id", id).order("data", { ascending: false }),
      o.store_id ? c.supabase.from("stores").select("nome").eq("id", o.store_id).maybeSingle() : Promise.resolve({ data: null }),
      o.sale_id ? c.supabase.from("sales").select("numero,cliente_nome").eq("id", o.sale_id).maybeSingle() : Promise.resolve({ data: null }),
      o.customer_id ? c.supabase.from("customers").select("nome").eq("id", o.customer_id).maybeSingle() : Promise.resolve({ data: null }),
    ]);
    return {
      ok: true,
      data: {
        id: o.id as string, nome: (o.nome as string) || "", endereco: (o.endereco as string) || "",
        status: (o.status as string) || "aguardando", responsavel: (o.responsavel as string) || "",
        progresso: Number(o.progresso) || 0, prazo: (o.prazo as string) || null,
        store_id: (o.store_id as string) || null, loja_nome: (store?.nome as string) || "—",
        sale_id: (o.sale_id as string) || null, sale_numero: (sale?.numero as number) ?? null,
        cliente_nome: (cust?.nome as string) || (sale?.cliente_nome as string) || "",
        checklist: (chk || []).map((x) => ({ id: x.id as string, texto: x.texto as string, feito: Boolean(x.feito) })),
        diario: (dia || []).map((x) => ({ id: x.id as string, data: x.data as string, texto: x.texto as string, foto_url: (x.foto_url as string) || null })),
      },
    };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

// progresso NÃO é parâmetro aqui: é sempre derivado do checklist (recalcularProgresso), nunca editável manualmente.
export async function salvarObra(dados: { id?: string; nome: string; endereco?: string; responsavel?: string; prazo?: string; store_id?: string; sale_id?: string; customer_id?: string; status?: string }): Promise<{ ok: boolean; error?: string; id?: string }> {
  try {
    const c = await getCtx();
    if (!(await ctxHasPerm(c, "obras.ver"))) return { ok: false, error: "Sem permissão." };
    if (!dados.nome?.trim()) return { ok: false, error: "Informe o nome da obra." };
    const patch: Record<string, unknown> = {
      nome: dados.nome.trim(), endereco: dados.endereco ?? null, responsavel: dados.responsavel ?? null,
      prazo: dados.prazo || null, store_id: dados.store_id || null, sale_id: dados.sale_id || null,
      customer_id: dados.customer_id || null,
    };
    if (dados.status) patch.status = dados.status;
    if (dados.id) {
      const { error } = await c.supabase.from("obras").update(patch).eq("id", dados.id).eq("organization_id", c.org);
      if (error) return { ok: false, error: error.message };
      await ctxAudit(c, "Obras", "Editou obra", dados.nome);
      return { ok: true, id: dados.id };
    }
    patch.organization_id = c.org; patch.status = dados.status || "aguardando";
    const { data, error } = await c.supabase.from("obras").insert(patch).select("id").single();
    if (error) return { ok: false, error: error.message };
    await ctxAudit(c, "Obras", "Criou obra", dados.nome);
    return { ok: true, id: data?.id as string };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

// progresso não é parâmetro: "concluida" força 100% (consequência do status, não edição manual do percentual).
export async function setStatusObra(id: string, status: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const c = await getCtx();
    if (status === "concluida" && !(await ctxHasPerm(c, "obras.finalizar"))) return { ok: false, error: "Sem permissão para finalizar obra." };
    if (!(await ctxHasPerm(c, "obras.ver"))) return { ok: false, error: "Sem permissão." };
    const patch: Record<string, unknown> = { status };
    if (status === "concluida") patch.progresso = 100;
    const { error } = await c.supabase.from("obras").update(patch).eq("id", id).eq("organization_id", c.org);
    if (error) return { ok: false, error: error.message };
    await ctxAudit(c, "Obras", "Alterou status da obra", `${id} → ${status}`);
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function addChecklist(obraId: string, texto: string): Promise<{ ok: boolean; error?: string; progresso?: number }> {
  try {
    const c = await getCtx();
    if (!texto?.trim()) return { ok: false, error: "Informe o item." };
    const { error } = await c.supabase.from("obra_checklist").insert({ organization_id: c.org, obra_id: obraId, texto: texto.trim() });
    if (error) return { ok: false, error: error.message };
    const progresso = await recalcularProgresso(c, obraId);
    return { ok: true, progresso };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function toggleChecklist(obraId: string, id: string, feito: boolean): Promise<{ ok: boolean; error?: string; progresso?: number }> {
  try {
    const c = await getCtx();
    const { error } = await c.supabase.from("obra_checklist").update({ feito }).eq("id", id).eq("organization_id", c.org);
    if (error) return { ok: false, error: error.message };
    const progresso = await recalcularProgresso(c, obraId);
    return { ok: true, progresso };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function addDiario(obraId: string, texto: string, foto_url?: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const c = await getCtx();
    if (!texto?.trim()) return { ok: false, error: "Descreva a entrada do diário." };
    const { error } = await c.supabase.from("obra_diario").insert({ organization_id: c.org, obra_id: obraId, texto: texto.trim(), foto_url: foto_url || null });
    if (error) return { ok: false, error: error.message };
    await ctxAudit(c, "Obras", "Adicionou entrada no diário", obraId);
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}
