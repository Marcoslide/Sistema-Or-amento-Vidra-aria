"use server";

import { getCtx, ctxHasPerm, ctxAudit } from "@/lib/data/server-ctx";

// ====================== PERFIS / PERMISSÕES ======================

export type PerfilData = {
  roles: { id: string; nome: string; ativo: boolean }[];
  permissions: { key: string; descricao: string | null }[];
  rolePerms: { role_id: string; permission_key: string }[];
  inUse: Record<string, number>;
  canManage: boolean;
  canDelete: boolean;
  myRole: string;
};

export async function getPerfisData(): Promise<PerfilData> {
  const c = await getCtx();
  const [{ data: roles }, { data: permissions }, { data: rolePerms }, { data: profs }, { data: myProf }] = await Promise.all([
    c.supabase.from("roles").select("id,nome,ativo").eq("organization_id", c.org).order("nome"),
    c.supabase.from("permissions").select("key,descricao").order("key"),
    c.supabase.from("role_permissions").select("role_id,permission_key").eq("organization_id", c.org),
    c.supabase.from("profiles").select("role_id").eq("organization_id", c.org),
    c.supabase.from("profiles").select("role_id").eq("id", c.uid).single(),
  ]);
  const inUse: Record<string, number> = {};
  (profs || []).forEach((p) => { const r = p.role_id as string; if (r) inUse[r] = (inUse[r] || 0) + 1; });
  return {
    roles: (roles || []) as PerfilData["roles"],
    permissions: (permissions || []) as PerfilData["permissions"],
    rolePerms: (rolePerms || []) as PerfilData["rolePerms"],
    inUse,
    canManage: await ctxHasPerm(c, "adm.config") || await ctxHasPerm(c, "adm.usuarios"),
    canDelete: await ctxHasPerm(c, "adm.excluir_perfis"),
    myRole: (myProf?.role_id as string) || "",
  };
}

type R = { ok: boolean; error?: string };

export async function perfilSalvar(id: string | null, nome: string): Promise<R> {
  try {
    const c = await getCtx();
    if (!(await ctxHasPerm(c, "adm.config")) && !(await ctxHasPerm(c, "adm.usuarios"))) return { ok: false, error: "Sem permissão." };
    if (!nome.trim()) return { ok: false, error: "Informe o nome." };
    if (id) {
      const { error } = await c.supabase.from("roles").update({ nome }).eq("organization_id", c.org).eq("id", id);
      if (error) return { ok: false, error: error.message };
      await ctxAudit(c, "Perfis", "Editou perfil", nome);
    } else {
      const rid = nome.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "") || ("perfil_" + Date.now());
      const { error } = await c.supabase.from("roles").insert({ organization_id: c.org, id: rid, nome, ativo: true });
      if (error) return { ok: false, error: error.message };
      await ctxAudit(c, "Perfis", "Criou perfil", nome);
    }
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function perfilDuplicar(id: string): Promise<R> {
  try {
    const c = await getCtx();
    if (!(await ctxHasPerm(c, "adm.config")) && !(await ctxHasPerm(c, "adm.usuarios"))) return { ok: false, error: "Sem permissão." };
    const { data: orig } = await c.supabase.from("roles").select("nome").eq("organization_id", c.org).eq("id", id).single();
    if (!orig) return { ok: false, error: "Perfil não encontrado." };
    const rid = (id + "_copia").replace(/[^a-z0-9_]/g, "");
    const { error } = await c.supabase.from("roles").insert({ organization_id: c.org, id: rid, nome: orig.nome + " (cópia)", ativo: true });
    if (error) return { ok: false, error: error.message };
    const { data: perms } = await c.supabase.from("role_permissions").select("permission_key").eq("organization_id", c.org).eq("role_id", id);
    if (perms && perms.length) {
      await c.supabase.from("role_permissions").insert(perms.map((p) => ({ organization_id: c.org, role_id: rid, permission_key: p.permission_key })));
    }
    await ctxAudit(c, "Perfis", "Duplicou perfil", orig.nome);
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function perfilSetAtivo(id: string, ativo: boolean): Promise<R> {
  try {
    const c = await getCtx();
    if (id === "admin") return { ok: false, error: "O Administrador geral não pode ser inativado." };
    if (!(await ctxHasPerm(c, "adm.config")) && !(await ctxHasPerm(c, "adm.usuarios"))) return { ok: false, error: "Sem permissão." };
    const { error } = await c.supabase.from("roles").update({ ativo }).eq("organization_id", c.org).eq("id", id);
    if (error) return { ok: false, error: error.message };
    await ctxAudit(c, "Perfis", ativo ? "Reativou perfil" : "Inativou perfil", id);
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function perfilExcluir(id: string): Promise<R & { blocked?: boolean; det?: { label: string; n: number }[] }> {
  try {
    const c = await getCtx();
    if (!(await ctxHasPerm(c, "adm.excluir_perfis"))) return { ok: false, error: "Sem permissão para excluir perfis." };
    if (id === "admin") return { ok: false, error: "O Administrador geral não pode ser excluído." };
    const { data: myProf } = await c.supabase.from("profiles").select("role_id").eq("id", c.uid).single();
    if (myProf?.role_id === id) return { ok: false, error: "Você não pode excluir o perfil que está usando." };
    const { count } = await c.supabase.from("profiles").select("*", { count: "exact", head: true }).eq("organization_id", c.org).eq("role_id", id);
    if ((count || 0) > 0) return { ok: false, blocked: true, det: [{ label: "usuários com este perfil", n: count || 0 }] };
    await c.supabase.from("role_permissions").delete().eq("organization_id", c.org).eq("role_id", id);
    const { error } = await c.supabase.from("roles").delete().eq("organization_id", c.org).eq("id", id);
    if (error) return { ok: false, error: error.message };
    await ctxAudit(c, "Perfis", "Excluiu perfil", id);
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export async function perfilTogglePerm(roleId: string, permKey: string, on: boolean): Promise<R> {
  try {
    const c = await getCtx();
    if (!(await ctxHasPerm(c, "adm.config")) && !(await ctxHasPerm(c, "adm.usuarios"))) return { ok: false, error: "Sem permissão." };
    if (on) {
      const { error } = await c.supabase.from("role_permissions").insert({ organization_id: c.org, role_id: roleId, permission_key: permKey });
      if (error && !error.message.includes("duplicate")) return { ok: false, error: error.message };
    } else {
      const { error } = await c.supabase.from("role_permissions").delete().eq("organization_id", c.org).eq("role_id", roleId).eq("permission_key", permKey);
      if (error) return { ok: false, error: error.message };
    }
    await ctxAudit(c, "Perfis", (on ? "Concedeu" : "Removeu") + " permissão " + permKey, roleId);
    return { ok: true };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}
