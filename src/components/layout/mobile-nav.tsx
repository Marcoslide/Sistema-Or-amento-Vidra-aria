"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GalleryVerticalEnd, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavGroup } from "./nav-config";

// Drawer de navegação mobile: overlay, fecha por botão, ao navegar, ao clicar fora e no Esc.
// Usa 100dvh + safe-area e rola internamente. Escondido em lg+ (onde há sidebar fixa).
export function MobileNav({
  open, onClose, groups,
}: { open: boolean; onClose: () => void; groups: NavGroup[] }) {
  const pathname = usePathname();

  // fecha ao trocar de rota (depende só do pathname de propósito)
  useEffect(() => {
    if (open) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Esc fecha + trava o scroll do body enquanto aberto
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
      {/* overlay — clicar fora fecha */}
      <button
        aria-label="Fechar menu"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* painel */}
      <aside
        className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col bg-sidebar text-sidebar-foreground shadow-xl"
        style={{ height: "100dvh", paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <GalleryVerticalEnd className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold">VidroGestor</p>
            <p className="text-xs text-sidebar-foreground/60">Orçamentos & Obras</p>
          </div>
          <button
            aria-label="Fechar"
            onClick={onClose}
            className="ml-auto rounded-md p-2 text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="no-scrollbar flex-1 space-y-6 overflow-y-auto px-3 py-5">
          {groups.map((group) => (
            <div key={group.title}>
              <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                {group.title}
              </p>
              <ul className="space-y-1">
                {group.items.map((item) => {
                  const active = pathname === item.href || pathname.startsWith(item.href + "/");
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onClose}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                          active ? "bg-sidebar-accent text-white" : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-white",
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
      </aside>
    </div>
  );
}
