"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Search, Landmark, Wallet, CheckCircle2, AlertTriangle, CalendarClock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  getReceberPorVenda, getReceberData, receberParcela, getRecebimentosParcela, estornarRecebimento,
  type VendaReceberRow, type ParcelaRow, type RecebimentoRow,
} from "@/lib/data/financeiro-actions";
import { listLojasSel, type Opt } from "@/lib/data/vendas-core";

// Situação por VENDA (paridade V6: CRV_SIT)
const SIT_LABEL: Record<string, string> = { ABERTA: "Em aberto", PARCIAL: "Parcial", QUITADA: "Quitada", VENCIDA: "Vencida" };
const SIT_CHIP: Record<string, React.CSSProperties> = {
  ABERTA: { background: "#f1f5f9", color: "#475569", borderColor: "#e2e8f0" },
  PARCIAL: { background: "#fef9c3", color: "#a16207", borderColor: "#fde68a" },
  QUITADA: { background: "#dcfce7", color: "#15803d", borderColor: "#86efac" },
  VENCIDA: { background: "#fee2e2", color: "#b91c1c", borderColor: "#fca5a5" },
};
const ctrl: React.CSSProperties = {
  width: "100%", height: 38, border: "1px solid var(--v6-border)", borderRadius: 9,
  padding: "0 11px", background: "var(--v6-card)", fontSize: 13.5, color: "var(--v6-fg)", outline: "none",
};
const lbl: React.CSSProperties = { fontSize: 12.5, fontWeight: 600, color: "var(--v6-muted)", marginBottom: 6, display: "block" };

export default function ReceberPage() {
  const [vendas, setVendas] = useState<VendaReceberRow[]>([]);
  const [perm, setPerm] = useState({ receber: false, estornar: false });
  const [erro, setErro] = useState(""); const [msg, setMsg] = useState("");
  const [q, setQ] = useState(""); const [sit, setSit] = useState(""); const [vendFiltro, setVendFiltro] = useState(""); const [lojaFiltro, setLojaFiltro] = useState("");
  const [lojas, setLojas] = useState<Opt[]>([]);
  const [abertaVenda, setAbertaVenda] = useState<VendaReceberRow | null>(null);

  const carregar = useCallback(async () => {
    const r = await getReceberPorVenda();
    if (!r.ok) { setErro(r.error || "Falha."); return; }
    setVendas(r.vendas || []); setPerm({ receber: !!r.canReceber, estornar: !!r.canEstornar }); setErro("");
  }, []);
  useEffect(() => { carregar(); listLojasSel().then(setLojas).catch(() => {}); }, [carregar]);

  const vendedores = useMemo(() => Array.from(new Set(vendas.map((v) => v.vend_nome).filter(Boolean))).sort() as string[], [vendas]);

  const filtradas = useMemo(() => {
    const s = q.trim().toLowerCase();
    return vendas.filter((v) => {
      const mq = !s || (v.cliente_nome || "").toLowerCase().includes(s) || String(v.numero ?? "").includes(s) || (v.vend_nome || "").toLowerCase().includes(s);
      const ms = !sit || v.situacao === sit;
      const mv = !vendFiltro || v.vend_nome === vendFiltro;
      const ml = !lojaFiltro || v.store_id === lojaFiltro;
      return mq && ms && mv && ml;
    }).sort((a, b) => (a.proxVencimento || "9999").localeCompare(b.proxVencimento || "9999") || (b.numero || 0) - (a.numero || 0));
  }, [vendas, q, sit, vendFiltro, lojaFiltro]);

  // 5 cards (paridade V6): Total previsto, Recebido, A receber, Vencido, Vence hoje
  const hoje = new Date().toISOString().slice(0, 10);
  const totV = useMemo(() => filtradas.reduce((s, v) => s + v.total, 0), [filtradas]);
  const totR = useMemo(() => filtradas.reduce((s, v) => s + v.recebido, 0), [filtradas]);
  const totS = useMemo(() => filtradas.reduce((s, v) => s + v.saldo, 0), [filtradas]);
  const totVenc = useMemo(() => filtradas.filter((v) => v.situacao === "VENCIDA").reduce((s, v) => s + v.saldo, 0), [filtradas]);
  const venceHoje = useMemo(() => filtradas.filter((v) => v.proxVencimento === hoje).reduce((s, v) => s + v.saldo, 0), [filtradas, hoje]);

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div className="v6-page-title">Contas a receber</div>
        <div className="v6-page-desc">Títulos, parcelas e recebimentos por venda. O Caixa fica no menu Financeiro.</div>
      </div>

      {erro && <div className="v6-card" style={{ padding: 12, marginBottom: 12, borderColor: "#fca5a5", background: "#fef2f2", color: "#b91c1c" }}>{erro}</div>}
      {msg && <div className="v6-card" style={{ padding: 12, marginBottom: 12, borderColor: "#86efac", background: "#f0fdf4", color: "#15803d" }}>{msg}</div>}

      <div className="v6-grid" style={{ gridTemplateColumns: "repeat(5,minmax(0,1fr))" }}>
        <div className="v6-card v6-stat"><div className="v6-ic"><Landmark size={20} /></div><div><div className="v6-lb">Total previsto</div><div className="v6-vl">{formatCurrency(totV)}</div></div></div>
        <div className="v6-card v6-stat"><div className="v6-ic" style={{ background: "#dcfce7", color: "#16a34a" }}><CheckCircle2 size={20} /></div><div><div className="v6-lb">Recebido</div><div className="v6-vl" style={{ color: "#16a34a" }}>{formatCurrency(totR)}</div></div></div>
        <div className="v6-card v6-stat"><div className="v6-ic"><Wallet size={20} /></div><div><div className="v6-lb">A receber</div><div className="v6-vl">{formatCurrency(totS)}</div></div></div>
        <div className="v6-card v6-stat"><div className="v6-ic" style={{ background: "#fee2e2", color: "#dc2626" }}><AlertTriangle size={20} /></div><div><div className="v6-lb">Vencido</div><div className="v6-vl" style={{ color: "#dc2626" }}>{formatCurrency(totVenc)}</div></div></div>
        <div className="v6-card v6-stat"><div className="v6-ic" style={{ background: "#fef3c7", color: "#b45309" }}><CalendarClock size={20} /></div><div><div className="v6-lb">Vence hoje</div><div className="v6-vl">{formatCurrency(venceHoje)}</div></div></div>
      </div>

      <div className="v6-card" style={{ marginTop: 16 }}>
        <div className="v6-card-b" style={{ paddingBottom: 0, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <div className="v6-search" style={{ maxWidth: 300 }}><Search /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Venda, cliente ou vendedor..." /></div>
          <select style={{ ...ctrl, width: "auto" }} value={sit} onChange={(e) => setSit(e.target.value)}>
            <option value="">Situação: todas</option>
            {Object.entries(SIT_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select style={{ ...ctrl, width: "auto" }} value={vendFiltro} onChange={(e) => setVendFiltro(e.target.value)}>
            <option value="">Vendedor: todos</option>
            {vendedores.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          <select style={{ ...ctrl, width: "auto" }} value={lojaFiltro} onChange={(e) => setLojaFiltro(e.target.value)}>
            <option value="">Todas as operações</option>
            {lojas.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
          </select>
          <Link href="/financeiro/caixa" className="v6-btn v6-btn-ghost v6-btn-sm"><Wallet size={14} /> Ver no Caixa</Link>
          <button className="v6-btn v6-btn-ghost v6-btn-sm" onClick={() => { setQ(""); setSit(""); setVendFiltro(""); setLojaFiltro(""); }}>Limpar</button>
        </div>
        <div className="v6-card-b" style={{ overflowX: "auto" }}>
          <table className="v6-tbl" style={{ minWidth: 880 }}>
            <thead><tr>
              <th>Venda</th><th>Cliente / Vendedor</th><th className="v6-hide-sm">Loja</th>
              <th style={{ textAlign: "right" }}>Total</th><th style={{ textAlign: "right" }} className="v6-hide-sm">Recebido</th>
              <th style={{ textAlign: "right" }}>Saldo</th><th className="v6-hide-sm">Próx. venc.</th><th>Situação</th><th style={{ textAlign: "right" }}>Ação</th>
            </tr></thead>
            <tbody>
              {filtradas.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: "center", padding: 28, color: "var(--v6-muted)" }}>Nenhuma venda neste filtro.</td></tr>
              ) : filtradas.map((v) => (
                <tr key={v.sale_id} style={{ cursor: "pointer" }} onClick={() => setAbertaVenda(v)}>
                  <td><span style={{ color: "var(--v6-primary)", fontWeight: 700 }}>#{v.numero ?? "—"}</span></td>
                  <td><div style={{ fontWeight: 600 }}>{v.cliente_nome || "—"}</div><div style={{ fontSize: 11, color: "var(--v6-muted)" }}>{v.vend_nome || "—"}</div></td>
                  <td className="v6-hide-sm" style={{ color: "var(--v6-muted)" }}>{v.loja_nome}</td>
                  <td style={{ textAlign: "right" }}>{formatCurrency(v.total)}</td>
                  <td className="v6-hide-sm" style={{ textAlign: "right", color: "#16a34a" }}>{formatCurrency(v.recebido)}</td>
                  <td style={{ textAlign: "right", fontWeight: 600 }}>{formatCurrency(v.saldo)}</td>
                  <td className="v6-hide-sm" style={{ color: v.situacao === "VENCIDA" ? "#dc2626" : "var(--v6-muted)" }}>{v.proxVencimento ? formatDate(v.proxVencimento) : "—"}</td>
                  <td><span className="v6-chip" style={{ padding: "3px 10px", cursor: "default", ...(SIT_CHIP[v.situacao]) }}>{SIT_LABEL[v.situacao]}</span></td>
                  <td style={{ textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                    {v.saldo > 0.01 ? <button className="v6-btn v6-btn-primary v6-btn-sm" onClick={() => setAbertaVenda(v)}>Receber</button> : <button className="v6-btn v6-btn-ghost v6-btn-sm" onClick={() => setAbertaVenda(v)}>Ver</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {abertaVenda && (
        <ParcelasDaVendaDialog
          venda={abertaVenda} perm={perm}
          onClose={() => setAbertaVenda(null)}
          onChanged={(m) => { setMsg(m); carregar(); }}
        />
      )}
    </div>
  );
}

// Painel de parcelas de UMA venda (abre ao clicar na linha — equivalente ao abrirFinanceiro() da V6).
function ParcelasDaVendaDialog({ venda, perm, onClose, onChanged }: {
  venda: VendaReceberRow; perm: { receber: boolean; estornar: boolean }; onClose: () => void; onChanged: (msg: string) => void;
}) {
  const [parcelas, setParcelas] = useState<ParcelaRow[]>([]);
  const [receb, setReceb] = useState<ParcelaRow | null>(null);
  const [valor, setValor] = useState(""); const [forma, setForma] = useState("Pix"); const [busy, setBusy] = useState(false);
  const [verParc, setVerParc] = useState<ParcelaRow | null>(null); const [recs, setRecs] = useState<RecebimentoRow[]>([]);
  const [erro, setErro] = useState("");
  const idemRef = useRef("");

  const carregar = useCallback(async () => {
    const r = await getReceberData(venda.sale_id);
    if (r.ok) setParcelas(r.parcelas || []); else setErro(r.error || "Falha.");
  }, [venda.sale_id]);
  useEffect(() => { carregar(); }, [carregar]);

  function abrirReceber(p: ParcelaRow) { setReceb(p); setValor(String(p.saldo)); setForma("Pix"); idemRef.current = ""; }
  async function confirmarReceber() {
    if (!receb || busy) return; setBusy(true); setErro("");
    if (!idemRef.current) idemRef.current = (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : `${receb.id}-${valor}`;
    const v = parseFloat(valor.replace(",", ".")) || 0;
    const res = await receberParcela(receb.id, { valor: v, forma, idem: idemRef.current });
    setBusy(false);
    if (!res.ok) { setErro(res.error || "Falha."); return; }
    setReceb(null); await carregar(); onChanged("Recebimento registrado.");
  }
  async function abrirVer(p: ParcelaRow) { setVerParc(p); const r = await getRecebimentosParcela(p.id); setRecs(r.itens || []); }
  async function estornar(id: string) {
    const res = await estornarRecebimento(id);
    if (!res.ok) { setErro(res.error || "Falha."); return; }
    await carregar(); onChanged("Recebimento estornado.");
    if (verParc) { const r = await getRecebimentosParcela(verParc.id); setRecs(r.itens || []); }
  }

  return (
    <>
      <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Venda #{venda.numero ?? ""} — {venda.cliente_nome}</DialogTitle></DialogHeader>
          {erro && <div style={{ color: "#b91c1c", fontSize: 13 }}>{erro}</div>}
          {parcelas.length === 0 ? <p style={{ fontSize: 13, color: "var(--v6-muted)" }}>Nenhuma parcela gerada para esta venda.</p> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {parcelas.map((p) => (
                <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, border: "1px solid var(--v6-border)", borderRadius: 9, padding: "8px 10px", fontSize: 13 }}>
                  <span style={{ minWidth: 90 }}>{p.descricao}</span>
                  <span style={{ color: "var(--v6-muted)" }}>{p.vencimento ? formatDate(p.vencimento) : "—"}</span>
                  <span style={{ marginLeft: "auto" }}>{formatCurrency(p.valor)}</span>
                  <span style={{ fontWeight: 700 }}>saldo {formatCurrency(p.saldo)}</span>
                  <span className="v6-chip" style={{ padding: "2px 9px", cursor: "default" }}>{p.status}</span>
                  {perm.receber && p.saldo > 0 && <button className="v6-btn v6-btn-primary v6-btn-sm" onClick={() => abrirReceber(p)}>Receber</button>}
                  <button className="v6-btn v6-btn-ghost v6-btn-sm" onClick={() => abrirVer(p)}>Recebimentos</button>
                </div>
              ))}
            </div>
          )}
          <DialogFooter><button className="v6-btn v6-btn-outline" onClick={onClose}>Fechar</button></DialogFooter>
        </DialogContent>
      </Dialog>

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
            <button className="v6-btn v6-btn-outline" onClick={() => setReceb(null)} disabled={busy}>Cancelar</button>
            <button className="v6-btn v6-btn-primary" onClick={confirmarReceber} disabled={busy}>{busy ? "Processando..." : "Confirmar"}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!verParc} onOpenChange={(o) => { if (!o) setVerParc(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Recebimentos da parcela</DialogTitle></DialogHeader>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {recs.length === 0 ? <p style={{ fontSize: 13, color: "var(--v6-muted)" }}>Nenhum recebimento.</p> : recs.map((r) => (
              <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 12, border: "1px solid var(--v6-border)", borderRadius: 9, padding: "8px 10px", fontSize: 13 }}>
                <span style={{ fontWeight: 600 }}>{formatCurrency(r.valor)}</span>
                <span style={{ color: "var(--v6-muted)" }}>{r.forma || "—"}</span>
                <span style={{ fontSize: 11.5, color: "var(--v6-muted-2)" }}>{formatDate(r.created_at)}</span>
                {r.estornado ? <span className="v6-chip" style={{ marginLeft: "auto", padding: "3px 10px", cursor: "default", ...SIT_CHIP.VENCIDA }}>Estornado</span>
                  : perm.estornar ? <button className="v6-btn v6-btn-sm" style={{ marginLeft: "auto", background: "#fef2f2", color: "#b91c1c", border: "1px solid #fca5a5" }} onClick={() => estornar(r.id)}>Estornar</button> : null}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
