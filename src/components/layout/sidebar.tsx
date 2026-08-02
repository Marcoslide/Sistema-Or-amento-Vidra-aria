"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { GalleryVerticalEnd } from "lucide-react";
import { useNav } from "./app-shell";

// Sidebar portada da V6 (grupos, ordem, nomes do contrato). Marca "VidroGestor".
export function Sidebar() {
  const pathname = usePathname();
  const { groups, closeMobile } = useNav();

  return (
    <aside className="v6-sidebar">
      <div className="v6-brand">
        <div className="v6-logo"><GalleryVerticalEnd size={20} /></div>
        <div>
          <b>VidroGestor</b>
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
