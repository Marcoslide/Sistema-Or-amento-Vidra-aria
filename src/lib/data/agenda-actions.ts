"use server";

import { getCtx, ctxHasPerm, ctxAudit } from "@/lib/data/server-ctx";

// ============================================================
// Agenda — visitas técnicas, instalações e eventos (paridade V6).
// Permissão base: obras.ver (operação). RLS por organização/loja.
// ============================================================

export type EventoRow = {
  id: string; tipo: string; titulo: string; profissional: string; cliente_nome: string;
  telefone: string; endereco: string; data: string; hora: string; status: string;
  store_id: string | null; loja_nome: string; obs: string; sale_id: string | null; obra_id: string | null;
};

export async function listAgenda(filtro?: { storeId?: string; status?: string }): Promise<{ ok: boolean; error?: string; data?: EventoRow[] }> {
  try {
    const c = await getCtx();
    if (!(await ctxHasPerm(c, "obras.ver")) && !(await ctxHasPerm(c, "vendas.loja")) && !(await ctxHasPerm(c, "vendas.proprias")))
      return { ok: false, error: "Sem permissão para ver a agenda." };
    let q = c.supabase.from("agenda_eventos")
      .select("id,tipo,titulo,profissional,cliente_nome,telefone,endereco,data,hora,status,store_id,obs,sale_id,obra_id")
      .eq("organization_id", c.org).order("data", { ascending: true });
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
        id: r.id as string, tipo: (r.tipo as string) || "visita", titulo: (r.titulo as string) || "",
        profissional: (r.profissional as string) || "", cliente_nome: (r.cliente_nome as string) || "",
        telefone: (r.telefone as string) || "", endereco: (r.endereco as string) || "",
        data: r.data as string, hora: (r.hora as string) || "", status: (r.status as string) || "agendada",
        store_id: (r.store_id as string) || null, loja_nome: r.store_id ? (lojaBy[r.store_id as string] || "—") : "—",
        obs: (r.obs as string) || "", sale_id: (r.sale_id as string) || null, obra_id: (r.obra_id as string) || null,
      })),
    };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function salvarEvento(dados: { id?: string; tipo: string; titulo?: string; profissional?: string; cliente_nome?: string; telefone?: string; endereco?: string; data: string; hora?: string; store_id?: string; obs?: string; sale_id?: string; obra_id?: string }): Promise<{ ok: boolean; error?: string }> {
  try {
    const c = await getCtx();
    if (!(await ctxHasPerm(c, "obras.ver")) && !(await ctxHasPerm(c, "vendas.loja"))) return { ok: false, error: "Sem permissão." };
    if (!dados.data) return { ok: false, error: "Informe a data." };
    const patch: Record<string, unknown> = {
      tipo: dados.tipo || "visita", titulo: dados.titulo ?? null, profissional: dados.profissional ?? null,
      cliente_nome: dados.cliente_nome ?? null, telefone: dados.telefone ?? null, endereco: dados.endereco ?? null,
      data: dados.data, hora: dados.hora ?? null, store_id: dados.store_id || null, obs: dados.obs ?? null,
      sale_id: dados.sale_id || null, obra_id: dados.obra_id || null,
    };
    if (dados.id) {
      const { error } = await c.supabase.from("agenda_eventos").update(patch).eq("id", dados.id).eq("organization_id", c.org);
      if (error) return { ok: false, error: error.message };
      await ctxAudit(c, "Agenda", "Editou evento", dados.titulo || dados.tipo);
    } else {
      patch.organization_id = c.org; patch.status = "agendada";
      const { error } = await c.supabase.from("agenda_eventos").insert(patch);
      if (error) return { ok: false, error: error.message };
      await ctxAudit(c, "Agenda", "Criou evento", dados.titulo || dados.tipo);
    }
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function setStatusEvento(id: string, status: string, novaData?: string, novaHora?: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const c = await getCtx();
    if (!(await ctxHasPerm(c, "obras.ver")) && !(await ctxHasPerm(c, "vendas.loja"))) return { ok: false, error: "Sem permissão." };
    const patch: Record<string, unknown> = { status };
    if (status === "reagendada" && novaData) { patch.data = novaData; if (novaHora) patch.hora = novaHora; }
    const { error } = await c.supabase.from("agenda_eventos").update(patch).eq("id", id).eq("organization_id", c.org);
    if (error) return { ok: false, error: error.message };
    await ctxAudit(c, "Agenda", "Alterou status do evento", `${id} → ${status}`);
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}
