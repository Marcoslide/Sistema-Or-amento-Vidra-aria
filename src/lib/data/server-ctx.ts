"use server";

import { createClient } from "@/lib/supabase/server";

// Contexto de servidor compartilhado pelas server actions (org, usuário, permissões, auditoria).
export type Ctx = { supabase: ReturnType<typeof createClient>; uid: string; org: string };

export async function getCtx(): Promise<Ctx> {
  const supabase = createClient();
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) throw new Error("Sessão não encontrada.");
  const { data: prof } = await supabase.from("profiles").select("organization_id").eq("id", uid).single();
  const org = (prof?.organization_id as string) || "";
  if (!org) throw new Error("Usuário sem organização vinculada.");
  return { supabase, uid, org };
}

export async function ctxHasPerm(c: Ctx, perm: string): Promise<boolean> {
  const { data: prof } = await c.supabase.from("profiles").select("role_id").eq("id", c.uid).single();
  const role = prof?.role_id as string | undefined;
  if (!role) return false;
  const { count } = await c.supabase
    .from("role_permissions").select("*", { count: "exact", head: true })
    .eq("organization_id", c.org).eq("role_id", role).eq("permission_key", perm);
  return (count || 0) > 0;
}

export async function ctxAudit(c: Ctx, modulo: string, acao: string, registro: string) {
  await c.supabase.from("audit_log").insert({ organization_id: c.org, user_id: c.uid, modulo, acao, registro });
}

// Lista as permissões do usuário logado (para o cliente filtrar menu/campos).
// É apenas conveniência de UI — a autorização real é sempre revalidada no servidor.
export async function minhasPermissoes(): Promise<string[]> {
  try {
    const c = await getCtx();
    const { data: prof } = await c.supabase.from("profiles").select("role_id").eq("id", c.uid).single();
    const role = prof?.role_id as string | undefined;
    if (!role) return [];
    const { data } = await c.supabase
      .from("role_permissions").select("permission_key")
      .eq("organization_id", c.org).eq("role_id", role);
    return (data || []).map((r) => r.permission_key as string);
  } catch { return []; }
}
