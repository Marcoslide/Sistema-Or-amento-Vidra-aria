"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, BarChart3, Landmark, Wallet } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { listVendasRicas, type VendaRica } from "@/lib/data/vendas-core";
import { labelSituacao } from "@/lib/commercial/situacao";

// Análise por venda (contrato V6): lista das vendas confirmadas com total/recebido/saldo.
// A análise detalhada (margem, custos extras, ponto por venda) abre em /orcamentos/[id]/financeiro.
export default function AnalisePage() {
  const [rows, setRows] = useState<VendaRica[]>([]);
  const [erro, setErro] = useState("");
  const [q, setQ] = useState("");

  const carregar = useCallback(() => {
    listVendasRicas()
      .then((d) => { setRows(d.filter((v) => v.venda_gerada)); setErro(""); })
      .catch((e) => { setRows([]); setErro((e as Error).message); });
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((o) =>
      !s || (o.cliente_nome || "").toLowerCase().includes(s) || String(o.numero ?? "").includes(s) || (o.vend_nome || "").toLowerCase().includes(s));
  }, [rows, q]);

  const totVendido = useMemo(() => rows.reduce((s, o) => s + o.total, 0), [rows]);
  const totRecebido = useMemo(() => rows.reduce((s, o) => s + o.recebido, 0), [rows]);
  const totSaldo = useMemo(() => rows.reduce((s, o) => s + o.saldo, 0), [rows]);

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div className="v6-page-title">Análise por venda</div>
        <div className="v6-page-desc">Resultado financeiro de cada venda confirmada. Abra uma venda para ver margem, custos e recebimentos.</div>
      </div>

      {erro && <div className="v6-card" style={{ padding: 12, marginBottom: 12, borderColor: "#fca5a5", background: "#fef2f2", color: "#b91c1c" }}>{erro}</div>}

      <div className="v6-grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <div className="v6-card v6-stat"><div className="v6-ic"><BarChart3 size={20} /></div><div><div className="v6-lb">Total vendido</div><div className="v6-vl">{formatCurrency(totVendido)}</div></div></div>
        <div className="v6-card v6-stat"><div className="v6-ic" style={{ background: "#dcfce7", color: "#16a34a" }}><Wallet size={20} /></div><div><div className="v6-lb">Recebido</div><div className="v6-vl">{formatCurrency(totRecebido)}</div></div></div>
        <div className="v6-card v6-stat"><div className="v6-ic" style={{ background: "#fef3c7", color: "#b45309" }}><Landmark size={20} /></div><div><div className="v6-lb">Saldo a receber</div><div className="v6-vl">{formatCurrency(totSaldo)}</div></div></div>
      </div>

      <div className="v6-card" style={{ marginTop: 16 }}>
        <div className="v6-card-b" style={{ paddingBottom: 0 }}>
          <div className="v6-search" style={{ maxWidth: 340 }}><Search /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Número, cliente, vendedor..." /></div>
        </div>
        <div className="v6-card-b" style={{ overflowX: "auto" }}>
          <table className="v6-tbl" style={{ minWidth: 760 }}>
            <thead><tr>
              <th>Nº</th><th>Cliente</th><th>Loja</th><th>Vendedor</th><th>Situação</th>
              <th style={{ textAlign: "right" }}>Total</th><th style={{ textAlign: "right" }}>Recebido</th><th style={{ textAlign: "right" }}>Saldo</th><th></th>
            </tr></thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: "center", padding: 28, color: "var(--v6-muted)" }}>Nenhuma venda confirmada.</td></tr>
              ) : filtered.map((o) => (
                <tr key={o.id}>
                  <td><Link href={`/orcamentos/${o.id}/financeiro`} style={{ color: "var(--v6-primary)", fontWeight: 700 }}>#{o.numero ?? "—"}</Link></td>
                  <td>{o.cliente_nome || "—"}</td>
                  <td style={{ color: "var(--v6-muted)" }}>{o.loja_nome}</td>
                  <td style={{ color: "var(--v6-muted)" }}>{o.vend_nome || "—"}</td>
                  <td>{labelSituacao(o.situacao)}</td>
                  <td style={{ textAlign: "right", fontWeight: 600 }}>{formatCurrency(o.total)}</td>
                  <td style={{ textAlign: "right", color: "#16a34a" }}>{formatCurrency(o.recebido)}</td>
                  <td style={{ textAlign: "right", fontWeight: 600 }}>{formatCurrency(o.saldo)}</td>
                  <td style={{ textAlign: "right" }}><Link href={`/orcamentos/${o.id}/financeiro`} className="v6-btn" style={{ padding: "4px 10px" }}>Analisar</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
