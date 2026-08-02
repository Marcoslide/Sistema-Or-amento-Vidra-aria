import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/env";

// Guard de rota NO SERVIDOR (usado em layouts de rota protegida).
// Redireciona para /dashboard quem não tiver a permissão — impede acesso por URL direta,
// não apenas escondendo o item de menu. Em modo mock (sem env) não bloqueia.
export async function requirePerm(perm: string) {
  if (!hasSupabaseEnv()) return;
  const supabase = createClient();
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) redirect("/login");
  const { data: prof } = await supabase.from("profiles").select("organization_id,role_id").eq("id", uid).single();
  const org = prof?.organization_id as string | undefined;
  const role = prof?.role_id as string | undefined;
  if (!org || !role) redirect("/dashboard");
  const { count } = await supabase
    .from("role_permissions").select("*", { count: "exact", head: true })
    .eq("organization_id", org).eq("role_id", role).eq("permission_key", perm);
  if (!count || count < 1) redirect("/dashboard");
}
