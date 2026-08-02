"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search, FileText, Tag, Layers, CheckCircle2, Factory, Landmark, MoreHorizontal, Copy, Pencil, Trash2 } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency, formatDate } from "@/lib/format";
import { listVendasRicas, type VendaRica } from "@/lib/data/vendas-core";
import { duplicarOrcamento, excluirOuCancelarVenda } from "@/lib/data/vendas-actions";
import { labelSituacao } from "@/lib/commercial/situacao";

const ABAS = [
  { v: "TODOS", l: "Todos" }, { v: "ORCAMENTO", l: "Orçamentos" }, { v: "VENDA_CONFIRMADA", l: "Vendas confirmadas" },
  { v: "PRODUCAO", l: "Em produção" }, { v: "EXECUCAO", l: "Em execução" }, { v: "FINALIZADA", l: "Finalizados" }, { v: "CANCELADO", l: "Cancelados" },
];

export default function VendasPage() {
  const [rows, setRows] = useState<VendaRica[]>([]);
  const [erro, setErro] = useState(""); const [msg, setMsg] = useState("");
  const [q, setQ] = useState(""); const [aba, setAba] = useState("TODOS");

  const carregar = useCallback(() => {
    listVendasRicas().then((d) => { setRows(d); setErro(""); }).catch((e) => { setRows([]); setErro((e as Error).message); });
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((o) => {
      const mq = !s || (o.cliente_nome || "").toLowerCase().includes(s) || String(o.numero ?? "").includes(s) || (o.vend_nome || "").toLowerCase().includes(s);
      const ma = aba === "TODOS" || o.situacao === aba;
      return mq && ma;
    });
  }, [rows, q, aba]);

  const conta = (chave: string) => rows.filter((o) => o.situacao === chave).length;
  const cards = [
    { ic: <FileText size={20} />, lb: "Orçamentos", vl: conta("ORCAMENTO") },
    { ic: <Tag size={20} />, lb: "Aguardando produção", vl: conta("VENDA_CONFIRMADA") },
    { ic: <Factory size={20} />, lb: "Em produção", vl: conta("PRODUCAO") },
    { ic: <CheckCircle2 size={20} />, lb: "Em execução", vl: conta("EXECUCAO") },
    { ic: <Layers size={20} />, lb: "Finalizados", vl: conta("FINALIZADA") },
  ];
  const saldoReceber = useMemo(() => rows.reduce((s, o) => s + o.saldo, 0), [rows]);

  async function duplicar(id: string) { const r = await duplicarOrcamento(id); if (r.ok) { setMsg("Orçamento duplicado."); carregar(); } else setErro(r.error || "Falha."); }
  async function excluir(o: VendaRica) {
    if (!confirm(o.venda_gerada ? "Cancelar esta venda? (preserva histórico)" : "Excluir este orçamento?")) return;
    const r = await excluirOuCancelarVenda(o.id);
    if (r.ok) { setMsg(r.blocked ? "Venda cancelada (preservada)." : "Orçamento excluído."); carregar(); } else setErro(r.error || "Falha.");
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div>
          <div className="v6-page-title">Vendas</div>
          <div className="v6-page-desc">Registro único do ciclo comercial: orçamento → venda → produção → execução → finalização.</div>
        </div>
        <Link href="/orcamentos/novo" className="v6-btn v6-btn-primary" style={{ marginLeft: "auto" }}><Plus /> Novo orçamento</Link>
      </div>

      {erro && <div className="v6-card" style={{ padding: 12, marginBottom: 12, borderColor: "#fca5a5", background: "#fef2f2", color: "#b91c1c" }}>{erro}</div>}
      {msg && <div className="v6-card" style={{ padding: 12, marginBottom: 12, borderColor: "#86efac", background: "#f0fdf4", color: "#15803d" }}>{msg}</div>}

      {/* 6 cards de status */}
      <div className="v6-grid" style={{ gridTemplateColumns: "repeat(6,1fr)" }}>
        {cards.map((c, i) => (
          <div key={i} className="v6-card v6-stat">
            <div className="v6-ic">{c.ic}</div>
            <div><div className="v6-lb">{c.lb}</div><div className="v6-vl">{c.vl}</div></div>
          </div>
        ))}
        <div className="v6-card v6-stat">
          <div className="v6-ic" style={{ background: "#dcfce7", color: "#16a34a" }}><Landmark size={20} /></div>
          <div><div className="v6-lb">Saldo a receber</div><div className="v6-vl">{formatCurrency(saldoReceber)}</div></div>
        </div>
      </div>

      {/* abas do ciclo */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "16px 0" }}>
        {ABAS.map((t) => (
          <button key={t.v} className={`v6-chip${aba === t.v ? " active" : ""}`} onClick={() => setAba(t.v)}>
            {t.l} {t.v !== "TODOS" && <span style={{ opacity: .7 }}>{conta(t.v)}</span>}
          </button>
        ))}
      </div>

      {/* busca + tabela */}
      <div className="v6-card">
        <div className="v6-card-b" style={{ paddingBottom: 0 }}>
          <div className="v6-search" style={{ maxWidth: 340 }}><Search /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Número, cliente, obra, vendedor..." /></div>
        </div>
        <div className="v6-card-b" style={{ overflowX: "auto" }}>
          <table className="v6-tbl" style={{ minWidth: 900 }}>
            <thead><tr>
              <th>Nº</th><th>Cliente / Obra</th><th>Loja</th><th>Vendedor</th><th>Situação</th>
              <th style={{ textAlign: "right" }}>Total</th><th style={{ textAlign: "right" }}>Recebido</th><th style={{ textAlign: "right" }}>Saldo</th><th>Financeiro</th><th></th>
            </tr></thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={10} style={{ textAlign: "center", padding: 28, color: "var(--v6-muted)" }}>Nenhum registro encontrado.</td></tr>
              ) : filtered.map((o) => {
                const fin = o.venda_gerada ? (o.saldo <= 0 ? "Recebido" : o.recebido > 0 ? "Parcial" : "A receber") : "—";
                return (
                  <tr key={o.id}>
                    <td><Link href={`/orcamentos/${o.id}`} style={{ color: "var(--v6-primary)", fontWeight: 700 }}>#{o.numero ?? "—"}</Link></td>
                    <td>{o.cliente_nome || "—"}</td>
                    <td style={{ color: "var(--v6-muted)" }}>{o.loja_nome}</td>
                    <td style={{ color: "var(--v6-muted)" }}>{o.vend_nome || "—"}</td>
                    <td>{labelSituacao(o.situacao)}</td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>{formatCurrency(o.total)}</td>
                    <td style={{ textAlign: "right", color: "#16a34a" }}>{formatCurrency(o.recebido)}</td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>{formatCurrency(o.saldo)}</td>
                    <td>{fin}</td>
                    <td style={{ textAlign: "right" }}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><button className="v6-icon-btn" style={{ width: 30, height: 30, border: 0, background: "transparent" }}><MoreHorizontal size={16} /></button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild><Link href={`/orcamentos/${o.id}`}><Pencil className="mr-2 h-4 w-4" /> Abrir</Link></DropdownMenuItem>
                          <DropdownMenuItem onClick={() => duplicar(o.id)}><Copy className="mr-2 h-4 w-4" /> Duplicar</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => excluir(o)}><Trash2 className="mr-2 h-4 w-4" /> {o.venda_gerada ? "Cancelar venda" : "Excluir"}</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
