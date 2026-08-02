import { redirect } from "next/navigation";
import "@/styles/v6-shell.css";
import { AppShell } from "@/components/layout/app-shell";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Guard de sessão: quando o Supabase está configurado, exige usuário autenticado.
  if (hasSupabaseEnv()) {
    const supabase = createClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) redirect("/login");
  }

  return <AppShell>{children}</AppShell>;
}
