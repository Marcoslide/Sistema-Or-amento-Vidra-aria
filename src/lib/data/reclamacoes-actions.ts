"use server";

import { getCtx, ctxHasPerm, ctxAudit } from "@/lib/data/server-ctx";

// ============================================================
// Reclamações / pós-venda (paridade V6). Fluxo de status com histórico.
// Permissão base: obras.ver ou vendas.loja. RLS por organização/loja.
// ============================================================

export type ReclamacaoRow = {
  id: string; cliente_nome: string; motivo: string; descricao: string; prioridade: string;
  responsavel: string; status: string; custo: number; reaberta: boolean; created_at: string;
  store_id: string | null; loja_nome: string; sale_id: string | null; obra_id: string | null;
};

async function podeVer(c: Awaited<ReturnType<typeof getCtx>>) {
  return (await ctxHasPerm(c, "obras.ver")) || (await ctxHasPerm(c, "vendas.loja")) || (await ctxHasPerm(c, "vendas.proprias"));
}

export async function listReclamacoes(filtro?: { storeId?: string; status?: string }): Promise<{ ok: boolean; error?: string; data?: ReclamacaoRow[] }> {
  try {
    const c = await getCtx();
    if (!(await podeVer(c))) return { ok: false, error: "Sem permissão para ver reclamações." };
    let q = c.supabase.from("reclamacoes")
      .select("id,cliente_nome,motivo,descricao,prioridade,responsavel,status,custo,reaberta,created_at,store_id,sale_id,obra_id")
      .eq("organization_id", c.org).order("created_at", { ascending: false });
    if (filtro?.storeId) q = q.eq("store_id", filtro.storeId);
    if (filtro?.status) q = q.eq("status", filtro.status);
    const { data, error } = await q;
    if (error) return { ok: false, error: error.message };
    const rows = data || [];
    const storeIds = Array.from(new Set(rows.map((r) => r.store_id).filter(Boolean))) as string[];
    const { data: stores } = storeIds.length ? await c.supabase.from("stores").select("id,nome").in("id", storeIds) : { data: [] };
    const lojaBy: Record<string, string> = {}; (stores || []).forEach((s) => { lojaBy[s.id as string] = s.nome as string; });
    return {
      ok: true,
      data: rows.map((r) => ({
        id: r.id as string, cliente_nome: (r.cliente_nome as string) || "", motivo: (r.motivo as string) || "",
        descricao: (r.descricao as string) || "", prioridade: (r.prioridade as string) || "media",
        responsavel: (r.responsavel as string) || "", status: (r.status as string) || "pendente",
        custo: Number(r.custo) || 0, reaberta: Boolean(r.reaberta), created_at: r.created_at as string,
        store_id: (r.store_id as string) || null, loja_nome: r.store_id ? (lojaBy[r.store_id as string] || "—") : "—",
        sale_id: (r.sale_id as string) || null, obra_id: (r.obra_id as string) || null,
      })),
    };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export type HistItem = { id: string; de: string | null; para: string | null; obs: string | null; created_at: string };
export async function getHistoricoReclamacao(id: string): Promise<{ ok: boolean; data?: HistItem[] }> {
  try {
    const c = await getCtx();
    const { data } = await c.supabase.from("reclamacao_historico").select("id,de,para,obs,created_at").eq("reclamacao_id", id).order("created_at", { ascending: false });
    return { ok: true, data: (data || []).map((h) => ({ id: h.id as string, de: (h.de as string) || null, para: (h.para as string) || null, obs: (h.obs as string) || null, created_at: h.created_at as string })) };
  } catch { return { ok: false }; }
}

export async function salvarReclamacao(dados: { id?: string; cliente_nome?: string; motivo: string; descricao?: string; prioridade?: string; responsavel?: string; custo?: number; store_id?: string; sale_id?: string; obra_id?: string }): Promise<{ ok: boolean; error?: string }> {
  try {
    const c = await getCtx();
    if (!(await podeVer(c))) return { ok: false, error: "Sem permissão." };
    if (!dados.motivo?.trim()) return { ok: false, error: "Informe o motivo." };
    const patch: Record<string, unknown> = {
      cliente_nome: dados.cliente_nome ?? null, motivo: dados.motivo.trim(), descricao: dados.descricao ?? null,
      prioridade: dados.prioridade || "media", responsavel: dados.responsavel ?? null, custo: Number(dados.custo) || 0,
      store_id: dados.store_id || null, sale_id: dados.sale_id || null, obra_id: dados.obra_id || null,
    };
    if (dados.id) {
      const { error } = await c.supabase.from("reclamacoes").update(patch).eq("id", dados.id).eq("organization_id", c.org);
      if (error) return { ok: false, error: error.message };
      await ctxAudit(c, "Reclamações", "Editou reclamação", dados.motivo);
    } else {
      patch.organization_id = c.org; patch.status = "pendente";
      const { error } = await c.supabase.from("reclamacoes").insert(patch);
      if (error) return { ok: false, error: error.message };
      await ctxAudit(c, "Reclamações", "Abriu reclamação", dados.motivo);
    }
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function mudarStatusReclamacao(id: string, novo: string, obs?: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const c = await getCtx();
    if (!(await podeVer(c))) return { ok: false, error: "Sem permissão." };
    const { data: atual } = await c.supabase.from("reclamacoes").select("status").eq("id", id).eq("organization_id", c.org).maybeSingle();
    if (!atual) return { ok: false, error: "Reclamação não encontrada." };
    const de = (atual.status as string) || "";
    const patch: Record<string, unknown> = { status: novo };
    if (novo === "reaberta") patch.reaberta = true;
    const { error } = await c.supabase.from("reclamacoes").update(patch).eq("id", id).eq("organization_id", c.org);
    if (error) return { ok: false, error: error.message };
    await c.supabase.from("reclamacao_historico").insert({ organization_id: c.org, reclamacao_id: id, de, para: novo, obs: obs || null });
    await ctxAudit(c, "Reclamações", "Alterou status", `${de} → ${novo}`);
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}
