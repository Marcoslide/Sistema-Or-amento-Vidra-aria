"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, LogOut, Plus, Search, ChevronDown, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { useNav } from "./app-shell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Topbar() {
  const router = useRouter();
  const { openMobile } = useNav();

  async function sair() {
    if (hasSupabaseEnv()) {
      try { await createClient().auth.signOut(); } catch { /* ignora */ }
    }
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-md sm:px-6 print:hidden">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        aria-label="Abrir menu"
        onClick={openMobile}
      >
        <Menu className="h-5 w-5" />
      </Button>

      <div className="relative hidden max-w-sm flex-1 md:block">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar cliente, orçamento ou obra..."
          className="pl-9"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Button asChild size="sm" className="gap-1.5">
          <Link href="/orcamentos/novo">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Novo orçamento</span>
          </Link>
        </Button>

        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition-colors hover:bg-accent">
              <Avatar>
                <AvatarFallback>CM</AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium sm:inline">
                Carla Mendes
              </span>
              <ChevronDown className="hidden h-4 w-4 text-muted-foreground sm:inline" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <p className="text-sm font-medium">Carla Mendes</p>
              <p className="text-xs font-normal text-muted-foreground">
                carla@vidraria.com
              </p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/configuracoes")}>
              Configurações
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={sair}
            >
              <LogOut className="h-4 w-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
