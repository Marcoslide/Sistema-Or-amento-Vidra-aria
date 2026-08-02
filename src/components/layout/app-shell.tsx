"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { navGroups, filterNav, type NavGroup } from "./nav-config";
import { minhasPermissoes } from "@/lib/data/server-ctx";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

type NavCtx = { groups: NavGroup[]; perms: string[]; openMobile: () => void; closeMobile: () => void };
const Ctx = createContext<NavCtx>({ groups: navGroups, perms: [], openMobile: () => {}, closeMobile: () => {} });
export const useNav = () => useContext(Ctx);

// Shell portado da V6: sidebar fixa (vira drawer no mobile) + main com topbar.
export function AppShell({ children }: { children: React.ReactNode }) {
  const [perms, setPerms] = useState<string[] | null>(hasSupabaseEnv() ? null : []);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!hasSupabaseEnv()) return;
    minhasPermissoes().then(setPerms).catch(() => setPerms([]));
  }, []);

  const effectivePerms = perms ?? [];
  const groups = hasSupabaseEnv() ? filterNav(navGroups, effectivePerms) : navGroups;

  return (
    <Ctx.Provider value={{ groups, perms: effectivePerms, openMobile: () => setMobileOpen(true), closeMobile: () => setMobileOpen(false) }}>
      <div className={`v6-shell${mobileOpen ? " v6-drawer" : ""}`}>
        <Sidebar />
        {mobileOpen && <div className="v6-scrim" onClick={() => setMobileOpen(false)} aria-hidden />}
        <div className="v6-main">
          <Topbar />
          <main className="v6-content">{children}</main>
        </div>
      </div>
    </Ctx.Provider>
  );
}
