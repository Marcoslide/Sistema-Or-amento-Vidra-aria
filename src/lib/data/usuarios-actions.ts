"use server";

import { getCtx, ctxHasPerm, ctxAudit } from "@/lib/data/server-ctx";
import { hasServiceRole, createAdminClient } from "@/lib/supabase/admin";

// ====================== USUÁRIOS ======================

export type UsuarioRow = {
  id: string; nome: string; email: string | null; role_id: string | null;
  seller_id: string | null; status: string; lojas: string[];
};
export type UsuariosData = {
  usuarios: UsuarioRow[];
  roles: { id: string; nome: string }[];
  stores: { id: string; nome: string }[];
  sellers: { id: string; nome: string }[];
  canManage: boolean; canDelete: boolean; canInvite: boolean; myId: string;
};

export async function getUsuariosData(): Promise<UsuariosData> {
  const c = await getCtx();
  const [{ data: profs }, { data: us }, { data: roles }, { data: stores }, { data: sellers }] = await Promise.all([
    c.supabase.from("profiles").select("id,nome,email,role_id,seller_id,status").eq("organization_id", c.org).order("nome"),
    c.supabase.from("user_stores").select("user_id,store_id"),
    c.supabase.from("roles").select("id,nome").eq("organization_id", c.org).order("nome"),
    c.supabase.from("stores").select("id,nome").eq("organization_id", c.org).eq("ativo", true).order("nome"),
    c.supabase.from("sellers").select("id,nome").eq("organization_id", c.org).eq("ativo", true).order("nome"),
  ]);
  const lojasByUser: Record<string, string[]> = {};
  (us || []).forEach((r) => { (lojasByUser[r.user_id as string] ||= []).push(r.store_id as string); });
  const usuarios = (profs || []).map((p) => ({
    id: p.id as string, nome: p.nome as string, email: p.email as string | null,
    role_id: p.role_id as string | null, seller_id: p.seller_id as string | null,
    status: (p.status as string) || "ATIVO", lojas: lojasByUser[p.id as string] || [],
  }));
  return {
    usuarios,
    roles: (roles || []) as { id: string; nome: string }[],
    stores: (stores || []) as { id: string; nome: string }[],
    sellers: (sellers || []) as { id: string; nome: string }[],
    canManage: await ctxHasPerm(c, "adm.usuarios"),
    canDelete: await ctxHasPerm(c, "adm.excluir_usuarios"),
    canInvite: hasServiceRole(),
    myId: c.uid,
  };
}

type R = { ok: boolean; error?: string };

async function syncLojas(cSupabase: ReturnType<typeof import("@/lib/supabase/server").createClient>, userId: string, lojas: string[]) {
  const { data: atuais } = await cSupabase.from("user_stores").select("store_id").eq("user_id", userId);
  const set = new Set((atuais || []).map((r) => r.store_id as string));
  const alvo = new Set(lojas);
  const remover = [...set].filter((s) => !alvo.has(s));
  const add = [...alvo].filter((s) => !set.has(s));
  if (remover.length) await cSupabase.from("user_stores").delete().eq("user_id", userId).in("store_id", remover);
  if (add.length) await cSupabase.from("user_stores").insert(add.map((s) => ({ user_id: userId, store_id: s })));
}

export async function usuarioSalvar(id: string, dados: { nome: string; role_id: string; seller_id: string | null; status: string; lojas: string[] }): Promise<R> {
  try {
    const c = await getCtx();
    if (!(await ctxHasPerm(c, "adm.usuarios"))) return { ok: false, error: "Sem permissão." };
    const { error } = await c.supabase.from("profiles").update({
      nome: dados.nome, role_id: dados.role_id || null, seller_id: dados.seller_id || null, status: dados.status,
    }).eq("id", id).eq("organization_id", c.org);
    if (error) return { ok: false, error: error.message };
    await syncLojas(c.supabase, id, dados.lojas);
    await ctxAudit(c, "Usuários", "Editou usuário", dados.nome);
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function usuarioSetStatus(id: string, status: string): Promise<R> {
  try {
    const c = await getCtx();
    if (!(await ctxHasPerm(c, "adm.usuarios"))) return { ok: false, error: "Sem permissão." };
    if (id === c.uid && status !== "ATIVO") return { ok: false, error: "Você não pode bloquear a si mesmo." };
    const { error } = await c.supabase.from("profiles").update({ status }).eq("id", id).eq("organization_id", c.org);
    if (error) return { ok: false, error: error.message };
    await ctxAudit(c, "Usuários", "Status → " + status, id);
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function usuarioConvidar(dados: { email: string; nome: string; role_id: string; lojas: string[] }): Promise<R> {
  try {
    const c = await getCtx();
    if (!(await ctxHasPerm(c, "adm.usuarios"))) return { ok: false, error: "Sem permissão." };
    if (!hasServiceRole()) return { ok: false, error: "Criação de usuários indisponível: configure SUPABASE_SERVICE_ROLE_KEY no servidor." };
    const admin = createAdminClient();
    const { data: inv, error } = await admin.auth.admin.inviteUserByEmail(dados.email, { data: { nome: dados.nome } });
    if (error) return { ok: false, error: error.message };
    const newId = inv.user?.id;
    if (!newId) return { ok: false, error: "Falha ao criar usuário." };
    await c.supabase.from("profiles").update({
      organization_id: c.org, nome: dados.nome, email: dados.email, role_id: dados.role_id || null, status: "PENDENTE_APROVACAO",
    }).eq("id", newId);
    await syncLojas(c.supabase, newId, dados.lojas);
    await ctxAudit(c, "Usuários", "Convidou usuário", dados.email);
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

async function temHistorico(c: Awaited<ReturnType<typeof getCtx>>, id: string): Promise<{ total: number; det: { label: string; n: number }[] }> {
  const det: { label: string; n: number }[] = [];
  const q = async (table: string, col: string, label: string) => {
    const { count } = await c.supabase.from(table).select("*", { count: "exact", head: true }).eq(col, id);
    if ((count || 0) > 0) det.push({ label, n: count || 0 });
  };
  await q("sales", "created_by", "vendas/orçamentos");
  await q("audit_log", "user_id", "registros de auditoria");
  await q("receivable_payments", "created_by", "recebimentos");
  return { total: det.reduce((s, d) => s + d.n, 0), det };
}

export async function usuarioExcluir(id: string): Promise<R & { blocked?: boolean; det?: { label: string; n: number }[] }> {
  try {
    const c = await getCtx();
    if (!(await ctxHasPerm(c, "adm.excluir_usuarios"))) return { ok: false, error: "Sem permissão para excluir usuários." };
    if (id === c.uid) return { ok: false, error: "Você não pode excluir o usuário com que está logado." };
    const { data: alvo } = await c.supabase.from("profiles").select("role_id,nome").eq("id", id).eq("organization_id", c.org).single();
    if (!alvo) return { ok: false, error: "Usuário não encontrado." };
    if (alvo.role_id === "admin") {
      const { count } = await c.supabase.from("profiles").select("*", { count: "exact", head: true })
        .eq("organization_id", c.org).eq("role_id", "admin").eq("status", "ATIVO");
      if ((count || 0) <= 1) return { ok: false, error: "Não é possível excluir o último administrador ativo." };
    }
    const hist = await temHistorico(c, id);
    if (hist.total > 0) return { ok: false, blocked: true, det: hist.det };
    await c.supabase.from("user_stores").delete().eq("user_id", id);
    const { error } = await c.supabase.from("profiles").delete().eq("id", id).eq("organization_id", c.org);
    if (error) return { ok: false, error: error.message };
    if (hasServiceRole()) { try { await createAdminClient().auth.admin.deleteUser(id); } catch { /* ignora */ } }
    await ctxAudit(c, "Usuários", "Excluiu usuário", (alvo.nome as string) || id);
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function usuarioBloquearComHistorico(id: string): Promise<R> {
  return usuarioSetStatus(id, "BLOQUEADO");
}
