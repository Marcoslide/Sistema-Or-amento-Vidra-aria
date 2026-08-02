"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GalleryVerticalEnd } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNav } from "./app-shell";

export function Sidebar() {
  const pathname = usePathname();
  const { groups: navGroups } = useNav();

  return (
    <aside className="hidden w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground lg:flex print:hidden">
      <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
          <GalleryVerticalEnd className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold">VidroGestor</p>
          <p className="text-xs text-sidebar-foreground/60">Orçamentos & Obras</p>
        </div>
      </div>

      <nav className="no-scrollbar flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {navGroups.map((group) => (
          <div key={group.title}>
            <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
              {group.title}
            </p>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const active =
                  pathname === item.href ||
                  pathname.startsWith(item.href + "/");
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-sidebar-accent text-white"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-white",
                      )}
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-4">
        <div className="rounded-lg bg-sidebar-accent/40 p-3">
          <p className="text-xs font-medium text-white">VidroGestor · Homologação</p>
          <p className="mt-0.5 text-[11px] text-sidebar-foreground/60">
            Ambiente de testes (staging).
          </p>
        </div>
      </div>
    </aside>
  );
}
