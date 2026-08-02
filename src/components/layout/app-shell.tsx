"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { navGroups, filterNav, type NavGroup } from "./nav-config";
import { minhasPermissoes } from "@/lib/data/server-ctx";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { MobileNav } from "./mobile-nav";

type NavCtx = { groups: NavGroup[]; perms: string[]; openMobile: () => void };
const Ctx = createContext<NavCtx>({ groups: navGroups, perms: [], openMobile: () => {} });
export const useNav = () => useContext(Ctx);

export function AppShell({ children }: { children: React.ReactNode }) {
  // Em modo mock (sem env) mostra todo o menu; com env, filtra pelas permissões reais.
  const [perms, setPerms] = useState<string[] | null>(hasSupabaseEnv() ? null : []);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!hasSupabaseEnv()) return;
    minhasPermissoes().then(setPerms).catch(() => setPerms([]));
  }, []);

  // Enquanto carrega as permissões (env configurado), não mostra itens sensíveis.
  const effectivePerms = perms ?? [];
  const groups = hasSupabaseEnv() ? filterNav(navGroups, effectivePerms) : navGroups;

  return (
    <Ctx.Provider value={{ groups, perms: effectivePerms, openMobile: () => setMobileOpen(true) }}>
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <MobileNav open={mobileOpen} onClose={() => setMobileOpen(false)} groups={groups} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
            <div className="mx-auto w-full max-w-6xl animate-fade-in">{children}</div>
          </main>
        </div>
      </div>
    </Ctx.Provider>
  );
}
