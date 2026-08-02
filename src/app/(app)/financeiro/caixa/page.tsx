"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, TrendingUp, TrendingDown, Landmark } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { getCaixaData, type CaixaRow } from "@/lib/data/financeiro-actions";
import { listLojasSel, type Opt } from "@/lib/data/vendas-core";

const selCtrl: React.CSSProperties = {
  height: 38, border: "1px solid var(--v6-border)", borderRadius: 9,
  padding: "0 11px", background: "var(--v6-card)", fontSize: 13, color: "var(--v6-fg)", outline: "none",
};

export default function CaixaPage() {
  const [movs, setMovs] = useState<CaixaRow[]>([]);
  const [tot, setTot] = useState({ entradas: 0, saidas: 0, saldo: 0 });
  const [lojas, setLojas] = useState<Opt[]>([]);
  const [loja, setLoja] = useState("");
  const [erro, setErro] = useState("");

  const carregar = useCallback((storeId: string) => {
    getCaixaData(storeId || undefined).then((r) => {
      if (!r.ok) { setErro(r.error || "Falha."); setMovs([]); return; }
      setMovs(r.movimentos || []); setTot({ entradas: r.entradas || 0, saidas: r.saidas || 0, saldo: r.saldo || 0 }); setErro("");
    });
  }, []);
  useEffect(() => { listLojasSel().then(setLojas).catch(() => {}); }, []);
  useEffect(() => { carregar(loja); }, [carregar, loja]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <div>
          <div className="v6-page-title">Caixa</div>
          <div className="v6-page-desc">Entradas e saídas por loja (recebimentos, pagamentos e estornos).</div>
        </div>
        <select style={{ ...selCtrl, marginLeft: "auto" }} value={loja} onChange={(e) => setLoja(e.target.value)}>
          <option value="">Todas as lojas</option>
          {lojas.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
        </select>
      </div>

      {erro && <div className="v6-card" style={{ padding: 12, marginBottom: 12, borderColor: "#fca5a5", background: "#fef2f2", color: "#b91c1c" }}>{erro}</div>}

      <div className="v6-grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <div className="v6-card v6-stat">
          <div className="v6-ic" style={{ background: "#dcfce7", color: "#16a34a" }}><TrendingUp size={20} /></div>
          <div><div className="v6-lb">Entradas</div><div className="v6-vl" style={{ color: "#16a34a" }}>{formatCurrency(tot.entradas)}</div></div>
        </div>
        <div className="v6-card v6-stat">
          <div className="v6-ic" style={{ background: "#fee2e2", color: "#dc2626" }}><TrendingDown size={20} /></div>
          <div><div className="v6-lb">Saídas</div><div className="v6-vl" style={{ color: "#dc2626" }}>{formatCurrency(tot.saidas)}</div></div>
        </div>
        <div className="v6-card v6-stat">
          <div className="v6-ic"><Landmark size={20} /></div>
          <div><div className="v6-lb">Saldo</div><div className="v6-vl" style={{ color: tot.saldo >= 0 ? "var(--v6-primary)" : "#dc2626" }}>{formatCurrency(tot.saldo)}</div></div>
        </div>
      </div>

      <div className="v6-card" style={{ marginTop: 16 }}>
        <div className="v6-card-b" style={{ overflowX: "auto" }}>
          <table className="v6-tbl" style={{ minWidth: 680 }}>
            <thead><tr>
              <th>Data</th><th>Descrição</th><th>Origem</th><th>Tipo</th><th style={{ textAlign: "right" }}>Valor</th>
            </tr></thead>
            <tbody>
              {movs.length === 0 ? (
                <tr><td colSpan={5} style={{ textAlign: "center", padding: 28, color: "var(--v6-muted)" }}>Nenhum movimento.</td></tr>
              ) : movs.map((m) => (
                <tr key={m.id}>
                  <td style={{ color: "var(--v6-muted)" }}>{m.data ? formatDate(m.data) : "—"}</td>
                  <td>{m.descricao || "—"}</td>
                  <td style={{ color: "var(--v6-muted)" }}>{m.origem_tipo || "—"}</td>
                  <td>
                    {m.tipo === "entrada"
                      ? <span className="v6-chip" style={{ padding: "3px 10px", cursor: "default", gap: 5, background: "#dcfce7", color: "#15803d", borderColor: "#86efac" }}><ArrowDownCircle size={13} /> Entrada</span>
                      : <span className="v6-chip" style={{ padding: "3px 10px", cursor: "default", gap: 5, background: "#fee2e2", color: "#b91c1c", borderColor: "#fca5a5" }}><ArrowUpCircle size={13} /> Saída</span>}
                  </td>
                  <td style={{ textAlign: "right", fontWeight: 600, color: m.tipo === "entrada" ? "#16a34a" : "#dc2626" }}>
                    {m.tipo === "entrada" ? "+" : "-"}{formatCurrency(m.valor)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
