"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Menu, Search, Plus, Bell, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { meuResumo } from "@/lib/data/server-ctx";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNav } from "./app-shell";

function iniciais(nome: string): string {
  const p = nome.trim().split(/\s+/).filter(Boolean);
  if (!p.length) return "U";
  return ((p[0][0] || "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
}

// Topbar portada da V6: busca, seletor de operação, Novo orçamento, sino, usuário.
export function Topbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { openMobile } = useNav();
  const [user, setUser] = useState<{ nome: string; email: string; roleNome: string; lojas: string[] }>({
    nome: "Usuário", email: "", roleNome: "", lojas: [],
  });

  // Revalida o usuário logado a cada navegação; mantém o último valor válido (não volta a "Usuário").
  useEffect(() => {
    if (!hasSupabaseEnv()) return;
    meuResumo().then((r) => { if (r && r.nome && r.nome !== "Usuário") setUser(r); }).catch(() => {});
  }, [pathname]);

  async function sair() {
    if (hasSupabaseEnv()) { try { await createClient().auth.signOut(); } catch { /* ignora */ } }
    router.push("/login"); router.refresh();
  }

  return (
    <header className="v6-topbar">
      <button className="v6-hamb" aria-label="Abrir menu" onClick={openMobile}><Menu size={18} /></button>

      <div className="v6-search">
        <Search />
        <input placeholder="Buscar cliente, orçamento, pedido, obra ou produto..." />
      </div>

      <div className="v6-sp">
        <div className="v6-op">
          <label>Operação</label>
          <select defaultValue="todas">
            <option value="todas">Todas as operações</option>
          </select>
        </div>

        <Link href="/orcamentos/novo" className="v6-btn v6-btn-primary">
          <Plus /> <span>Novo orçamento</span>
        </Link>

        <button className="v6-icon-btn" aria-label="Notificações"><Bell size={18} /><span className="v6-dot" /></button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="v6-user">
              <span className="v6-avatar">{iniciais(user.nome)}</span>
              <span className="v6-uname">{user.nome}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>
              <p className="text-sm font-medium">{user.nome}</p>
              {user.email && <p className="text-xs font-normal text-muted-foreground">{user.email}</p>}
              {(user.roleNome || user.lojas.length > 0) && (
                <p className="mt-1 text-xs font-normal text-muted-foreground">
                  {user.roleNome}{user.lojas.length ? ` · ${user.lojas.join(", ")}` : ""}
                </p>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/configuracoes")}>Configurações</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={sair}>
              <LogOut className="h-4 w-4" /> Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
