"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Search, Landmark, Wallet, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  getReceberData, receberParcela, getRecebimentosParcela, estornarRecebimento,
  type ParcelaRow, type RecebimentoRow,
} from "@/lib/data/financeiro-actions";

// paleta de status no visual V6 (chips coloridos)
const STATUS_CHIP: Record<string, React.CSSProperties> = {
  ABERTO: { background: "#f1f5f9", color: "#475569", borderColor: "#e2e8f0" },
  PARCIAL: { background: "#fef9c3", color: "#a16207", borderColor: "#fde68a" },
  RECEBIDO: { background: "#dcfce7", color: "#15803d", borderColor: "#86efac" },
  VENCIDO: { background: "#fee2e2", color: "#b91c1c", borderColor: "#fca5a5" },
  CANCELADO: { background: "#fee2e2", color: "#b91c1c", borderColor: "#fca5a5" },
};
const ctrl: React.CSSProperties = {
  width: "100%", height: 38, border: "1px solid var(--v6-border)", borderRadius: 9,
  padding: "0 11px", background: "var(--v6-card)", fontSize: 13.5, color: "var(--v6-fg)", outline: "none",
};
const lbl: React.CSSProperties = { fontSize: 12.5, fontWeight: 600, color: "var(--v6-muted)", marginBottom: 6, display: "block" };

export default function ReceberPage() {
  const [parcelas, setParcelas] = useState<ParcelaRow[]>([]);
  const [perm, setPerm] = useState({ receber: false, estornar: false });
  const [erro, setErro] = useState(""); const [msg, setMsg] = useState("");
  const [q, setQ] = useState("");
  const [receb, setReceb] = useState<ParcelaRow | null>(null);
  const [valor, setValor] = useState(""); const [forma, setForma] = useState("Pix"); const [busy, setBusy] = useState(false);
  const [verParc, setVerParc] = useState<ParcelaRow | null>(null); const [recs, setRecs] = useState<RecebimentoRow[]>([]);
  const idemRef = useRef("");

  const carregar = useCallback(async () => {
    const r = await getReceberData();
    if (!r.ok) { setErro(r.error || "Falha."); return [] as ParcelaRow[]; }
    const lst = r.parcelas || [];
    setParcelas(lst); setPerm({ receber: !!r.canReceber, estornar: !!r.canEstornar }); setErro("");
    return lst;
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  const lista = useMemo(() => {
    const s = q.trim().toLowerCase();
    return parcelas.filter((p) => !s || (p.cliente_nome || "").toLowerCase().includes(s) || String(p.numero ?? "").includes(s) || p.descricao.toLowerCase().includes(s));
  }, [parcelas, q]);
  const totalAberto = useMemo(() => lista.reduce((s, p) => s + p.saldo, 0), [lista]);
  const totalRecebido = useMemo(() => lista.reduce((s, p) => s + p.recebido, 0), [lista]);

  function abrirReceber(p: ParcelaRow) { setReceb(p); setValor(String(p.saldo)); setForma("Pix"); idemRef.current = ""; }
  async function confirmarReceber() {
    if (!receb || busy) return; setBusy(true); setMsg(""); setErro("");
    if (!idemRef.current) idemRef.current = (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : `${receb.id}-${valor}`;
    const v = parseFloat(valor.replace(",", ".")) || 0;
    const res = await receberParcela(receb.id, { valor: v, forma, idem: idemRef.current });
    setBusy(false);
    if (!res.ok) { setErro(res.error || "Falha."); return; }
    setReceb(null); setMsg("Recebimento registrado."); await carregar();
  }
  async function abrirVer(p: ParcelaRow) { setVerParc(p); const r = await getRecebimentosParcela(p.id); setRecs(r.itens || []); }
  async function estornar(id: string) {
    const res = await estornarRecebimento(id);
    if (!res.ok) { setErro(res.error || "Falha."); return; }
    setMsg("Recebimento estornado.");
    const lst = await carregar();
    if (verParc) {
      const fresh = lst.find((x) => x.id === verParc.id) || null;
      setVerParc(fresh);
      const r = await getRecebimentosParcela(verParc.id); setRecs(r.itens || []);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div>
          <div className="v6-page-title">Contas a Receber</div>
          <div className="v6-page-desc">Parcelas das vendas — recebimento, baixa e estorno.</div>
        </div>
      </div>

      {erro && <div className="v6-card" style={{ padding: 12, marginBottom: 12, borderColor: "#fca5a5", background: "#fef2f2", color: "#b91c1c" }}>{erro}</div>}
      {msg && <div className="v6-card" style={{ padding: 12, marginBottom: 12, borderColor: "#86efac", background: "#f0fdf4", color: "#15803d" }}>{msg}</div>}

      <div className="v6-grid" style={{ gridTemplateColumns: "repeat(3,1fr)" }}>
        <div className="v6-card v6-stat">
          <div className="v6-ic"><Wallet size={20} /></div>
          <div><div className="v6-lb">Parcelas</div><div className="v6-vl">{lista.length}</div></div>
        </div>
        <div className="v6-card v6-stat">
          <div className="v6-ic"><Landmark size={20} /></div>
          <div><div className="v6-lb">Saldo em aberto</div><div className="v6-vl" style={{ color: "var(--v6-primary)" }}>{formatCurrency(totalAberto)}</div></div>
        </div>
        <div className="v6-card v6-stat">
          <div className="v6-ic" style={{ background: "#dcfce7", color: "#16a34a" }}><CheckCircle2 size={20} /></div>
          <div><div className="v6-lb">Recebido</div><div className="v6-vl" style={{ color: "#16a34a" }}>{formatCurrency(totalRecebido)}</div></div>
        </div>
      </div>

      <div className="v6-card" style={{ marginTop: 16 }}>
        <div className="v6-card-b" style={{ paddingBottom: 0 }}>
          <div className="v6-search" style={{ maxWidth: 360 }}><Search /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar cliente, venda ou descrição..." /></div>
        </div>
        <div className="v6-card-b" style={{ overflowX: "auto" }}>
          <table className="v6-tbl" style={{ minWidth: 820 }}>
            <thead><tr>
              <th>Venda</th><th>Cliente</th><th>Parcela</th><th>Vencimento</th>
              <th style={{ textAlign: "right" }}>Valor</th><th style={{ textAlign: "right" }}>Saldo</th>
              <th>Status</th><th style={{ textAlign: "right" }}>Ações</th>
            </tr></thead>
            <tbody>
              {lista.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: "center", padding: 28, color: "var(--v6-muted)" }}>Nenhuma parcela.</td></tr>
              ) : lista.map((p) => (
                <tr key={p.id}>
                  <td>{p.sale_id ? <Link href={`/orcamentos/${p.sale_id}`} style={{ color: "var(--v6-primary)", fontWeight: 700 }}>#{p.numero ?? "—"}</Link> : "—"}</td>
                  <td>{p.cliente_nome || "—"}</td>
                  <td style={{ color: "var(--v6-muted)" }}>{p.descricao}</td>
                  <td style={{ color: "var(--v6-muted)" }}>{p.vencimento ? formatDate(p.vencimento) : "—"}</td>
                  <td style={{ textAlign: "right" }}>{formatCurrency(p.valor)}</td>
                  <td style={{ textAlign: "right", fontWeight: 600 }}>{formatCurrency(p.saldo)}</td>
                  <td><span className="v6-chip" style={{ padding: "3px 10px", cursor: "default", ...(STATUS_CHIP[p.status] || STATUS_CHIP.ABERTO) }}>{p.status}</span></td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: 8, justifyContent: "flex-end" }}>
                      {perm.receber && p.saldo > 0 && <button className="v6-btn v6-btn-primary" style={{ height: 32, padding: "0 12px" }} onClick={() => abrirReceber(p)}>Receber</button>}
                      <button className="v6-btn" style={{ height: 32, padding: "0 12px", background: "var(--v6-card)", color: "var(--v6-fg)", border: "1px solid var(--v6-border)" }} onClick={() => abrirVer(p)}>Recebimentos</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal receber */}
      <Dialog open={!!receb} onOpenChange={(o) => { if (!o && !busy) setReceb(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar recebimento</DialogTitle></DialogHeader>
          {receb && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <p style={{ fontSize: 13, color: "var(--v6-muted)" }}>Saldo da parcela: <b style={{ color: "var(--v6-fg)" }}>{formatCurrency(receb.saldo)}</b></p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label style={lbl}>Valor (R$)</label><input style={ctrl} type="number" value={valor} onChange={(e) => setValor(e.target.value)} /></div>
                <div><label style={lbl}>Forma</label>
                  <select style={ctrl} value={forma} onChange={(e) => setForma(e.target.value)}>
                    <option>Pix</option><option>Dinheiro</option><option>Cartão</option><option>Boleto</option><option>Transferência</option>
                  </select>
                </div>
              </div>
              <p style={{ fontSize: 11.5, color: "var(--v6-muted-2)" }}>Gera um único movimento de caixa. Idempotente: cliques repetidos não duplicam.</p>
            </div>
          )}
          <DialogFooter>
            <button className="v6-btn" style={{ background: "var(--v6-card)", color: "var(--v6-fg)", border: "1px solid var(--v6-border)" }} onClick={() => setReceb(null)} disabled={busy}>Cancelar</button>
            <button className="v6-btn v6-btn-primary" onClick={confirmarReceber} disabled={busy}>{busy ? "Processando..." : "Confirmar"}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal ver recebimentos / estorno */}
      <Dialog open={!!verParc} onOpenChange={(o) => { if (!o) setVerParc(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Recebimentos da parcela</DialogTitle></DialogHeader>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {recs.length === 0 ? <p style={{ fontSize: 13, color: "var(--v6-muted)" }}>Nenhum recebimento.</p> : recs.map((r) => (
              <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, border: "1px solid var(--v6-border)", borderRadius: 9, padding: "8px 10px", fontSize: 13 }}>
                <span style={{ fontWeight: 600 }}>{formatCurrency(r.valor)}</span>
                <span style={{ color: "var(--v6-muted)" }}>{r.forma || "—"}</span>
                <span style={{ fontSize: 11.5, color: "var(--v6-muted-2)" }}>{formatDate(r.created_at)}</span>
                {r.estornado ? <span className="v6-chip" style={{ marginLeft: "auto", padding: "3px 10px", cursor: "default", ...STATUS_CHIP.CANCELADO }}>Estornado</span>
                  : perm.estornar ? <button className="v6-btn" style={{ marginLeft: "auto", height: 30, padding: "0 12px", background: "#fef2f2", color: "#b91c1c", border: "1px solid #fca5a5" }} onClick={() => estornar(r.id)}>Estornar</button> : null}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
