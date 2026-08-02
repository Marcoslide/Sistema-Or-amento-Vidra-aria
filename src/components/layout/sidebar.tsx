"use client";
/* eslint-disable @next/next/no-img-element -- logomarca é data URI/URL dinâmica, incompatível com next/image */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GalleryVerticalEnd } from "lucide-react";
import { useNav } from "./app-shell";

// Sidebar portada da V6 (grupos, ordem, nomes do contrato).
// Cabeçalho = identidade da empresa usuária (fantasia/razão + logomarca), configurável.
// "VidroGestor" (software) fica discreto no rodapé.
export function Sidebar() {
  const pathname = usePathname();
  const { groups, closeMobile, identidade } = useNav();
  const nome = identidade.nome || "VidroGestor";

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
        {groups.map((group) => (
          <div key={group.title}>
            <div className="v6-nav-grp">{group.title}</div>
            {group.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMobile}
                  className={`v6-nav-item${active ? " active" : ""}`}
                >
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
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
