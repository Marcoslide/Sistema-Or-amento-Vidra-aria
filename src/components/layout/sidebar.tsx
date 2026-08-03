"use client";
/* eslint-disable @next/next/no-img-element -- logomarca é data URI/URL dinâmica, incompatível com next/image */

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { GalleryVerticalEnd, ChevronRight } from "lucide-react";
import { useNav } from "./app-shell";
import type { NavCounts } from "@/lib/data/nav-actions";

// Sidebar portada da V6 (grupos recolhíveis, ordem, nomes, contadores do contrato).
// Cabeçalho = identidade da empresa usuária (fantasia/razão + logomarca), configurável.
// "VidroGestor" (software) fica discreto no rodapé.
export function Sidebar() {
  const pathname = usePathname();
  const { groups, closeMobile, identidade, counts } = useNav();
  const nome = identidade.nome || "VidroGestor";
  const [aberto, setAberto] = useState<Record<string, boolean>>({});
  const isAberto = (t: string) => aberto[t] !== false; // aberto por padrão (igual V6)

  return (
    <aside className="v6-sidebar">
      <div className="v6-brand">
        <div className="v6-logo">
          {identidade.logo ? <img src={identidade.logo} alt={nome} className="v6-logo-img" /> : <GalleryVerticalEnd size={20} />}
        </div>
        <div>
          <b>{nome}</b>
          <span>Orçamentos &amp; Obras</span>
        </div>
      </div>

      <nav className="v6-nav">
        {groups.map((group) => {
          const open = isAberto(group.title);
          return (
            <div key={group.title}>
              <button
                type="button"
                className="v6-nav-grp v6-nav-grp-btn"
                onClick={() => setAberto((p) => ({ ...p, [group.title]: !open }))}
                aria-expanded={open}
              >
                <span>{group.title}</span>
                <ChevronRight size={12} style={{ transform: `rotate(${open ? 90 : 0}deg)`, transition: ".15s", opacity: 0.6 }} />
              </button>
              {open && group.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                const n = item.countKey ? counts[item.countKey as keyof NavCounts] : 0;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeMobile}
                    className={`v6-nav-item${active ? " active" : ""}`}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                    {n > 0 && <span className="v6-nav-count">{n}</span>}
                  </Link>
                );
              })}
            </div>
          );
        })}
      </nav>

      <div className="v6-side-foot">
        <div className="v6-box">
          <b>VidroGestor</b>
          <p>Versão 1.0</p>
        </div>
      </div>
    </aside>
  );
}
