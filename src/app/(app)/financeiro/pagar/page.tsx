"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Plus, Search, MoreHorizontal, Wallet, Landmark } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  getPagarData, salvarPagar, pagarConta, excluirPagar, getPagamentosConta, estornarPagamento,
  type PagarRow, type PagamentoRow,
} from "@/lib/data/financeiro-actions";
import { listLojasSel, type Opt } from "@/lib/data/vendas-core";
import { listAtivos } from "@/lib/data/cadastro-core";

type FormPagar = { descricao: string; fornecedor: string; categoria: string; valor: string; vencimento: string; store_id: string };
const vazio: FormPagar = { descricao: "", fornecedor: "", categoria: "", valor: "0", vencimento: "", store_id: "" };

type StatusInfo = { label: string; style: React.CSSProperties };
function statusConta(c: PagarRow): StatusInfo {
  if (c.cancelada) return { label: "Cancelada", style: { background: "#fee2e2", color: "#b91c1c", borderColor: "#fca5a5" } };
  if (c.saldo <= 0) return { label: "Paga", style: { background: "#dcfce7", color: "#15803d", borderColor: "#86efac" } };
  if (c.pago > 0) return { label: "Parcial", style: { background: "#fef9c3", color: "#a16207", borderColor: "#fde68a" } };
  return { label: "Aberta", style: { background: "#f1f5f9", color: "#475569", borderColor: "#e2e8f0" } };
}

const ctrl: React.CSSProperties = {
  width: "100%", height: 38, border: "1px solid var(--v6-border)", borderRadius: 9,
  padding: "0 11px", background: "var(--v6-card)", fontSize: 13.5, color: "var(--v6-fg)", outline: "none",
};
const lbl: React.CSSProperties = { fontSize: 12.5, fontWeight: 600, color: "var(--v6-muted)", marginBottom: 6, display: "block" };

export default function PagarPage() {
  const [contas, setContas] = useState<PagarRow[]>([]);
  const [perm, setPerm] = useState({ pagar: false, estornar: false, excluir: false });
  const [lojas, setLojas] = useState<Opt[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [erro, setErro] = useState(""); const [msg, setMsg] = useState(""); const [q, setQ] = useState("");
  const [form, setForm] = useState<FormPagar | null>(null); const [editId, setEditId] = useState<string | null>(null);
  const [pay, setPay] = useState<PagarRow | null>(null); const [valorPay, setValorPay] = useState(""); const [formaPay, setFormaPay] = useState("Pix");
  const [busy, setBusy] = useState(false);
  const [verConta, setVerConta] = useState<PagarRow | null>(null); const [pgtos, setPgtos] = useState<PagamentoRow[]>([]);
  const idemRef = useRef("");

  const carregar = useCallback(async () => {
    const r = await getPagarData();
    if (!r.ok) { setErro(r.error || "Falha."); return [] as PagarRow[]; }
    const lst = r.contas || [];
    setContas(lst); setPerm({ pagar: !!r.canPagar, estornar: !!r.canEstornar, excluir: !!r.canExcluir }); setErro("");
    return lst;
  }, []);
  useEffect(() => {
    carregar();
    listLojasSel().then(setLojas).catch(() => {});
    listAtivos("financial_categories", "id,nome").then((cs) => setCategorias(cs.map((c) => c.nome))).catch(() => {});
  }, [carregar]);

  const lista = useMemo(() => {
    const s = q.trim().toLowerCase();
    return contas.filter((c) => !s || c.descricao.toLowerCase().includes(s) || (c.fornecedor || "").toLowerCase().includes(s) || (c.categoria || "").toLowerCase().includes(s));
  }, [contas, q]);
  const totalAberto = useMemo(() => lista.reduce((s, c) => s + (c.cancelada ? 0 : c.saldo), 0), [lista]);

  async function salvar() {
    if (!form) return; setBusy(true); setErro("");
    const res = await salvarPagar(editId, { ...form, valor: parseFloat(form.valor.replace(",", ".")) || 0, vencimento: form.vencimento || null });
    setBusy(false);
    if (!res.ok) { setErro(res.error || "Falha."); return; }
    setForm(null); setEditId(null); setMsg("Conta salva."); await carregar();
  }
  function abrirPagar(c: PagarRow) { setPay(c); setValorPay(String(c.saldo)); setFormaPay("Pix"); idemRef.current = ""; }
  async function confirmarPagar() {
    if (!pay || busy) return; setBusy(true); setErro("");
    if (!idemRef.current) idemRef.current = (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : `${pay.id}-${valorPay}`;
    const res = await pagarConta(pay.id, { valor: parseFloat(valorPay.replace(",", ".")) || 0, forma: formaPay, idem: idemRef.current });
    setBusy(false);
    if (!res.ok) { setErro(res.error || "Falha."); return; }
    setPay(null); setMsg("Pagamento registrado."); await carregar();
  }
  async function excluir(c: PagarRow) {
    if (!confirm(`Excluir "${c.descricao}"?`)) return;
    const res = await excluirPagar(c.id);
    if (res.ok) { setMsg("Conta excluída."); await carregar(); } else setErro(res.error || "Falha.");
  }
  async function abrirVer(c: PagarRow) { setVerConta(c); const r = await getPagamentosConta(c.id); setPgtos(r.itens || []); }
  async function estornar(id: string) {
    const res = await estornarPagamento(id);
    if (!res.ok) { setErro(res.error || "Falha."); return; }
    setMsg("Pagamento estornado.");
    const lst = await carregar();
    if (verConta) {
      const fresh = lst.find((x) => x.id === verConta.id) || null;
      setVerConta(fresh);
      const r = await getPagamentosConta(verConta.id); setPgtos(r.itens || []);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div>
          <div className="v6-page-title">Contas a Pagar</div>
          <div className="v6-page-desc">Despesas — pagamento, estorno e exclusão segura.</div>
        </div>
        <button className="v6-btn v6-btn-primary" style={{ marginLeft: "auto" }} onClick={() => { setForm({ ...vazio }); setEditId(null); }}><Plus /> Nova conta</button>
      </div>

      {erro && <div className="v6-card" style={{ padding: 12, marginBottom: 12, borderColor: "#fca5a5", background: "#fef2f2", color: "#b91c1c" }}>{erro}</div>}
      {msg && <div className="v6-card" style={{ padding: 12, marginBottom: 12, borderColor: "#86efac", background: "#f0fdf4", color: "#15803d" }}>{msg}</div>}

      <div className="v6-grid" style={{ gridTemplateColumns: "repeat(2,1fr)" }}>
        <div className="v6-card v6-stat">
          <div className="v6-ic"><Wallet size={20} /></div>
          <div><div className="v6-lb">Contas</div><div className="v6-vl">{lista.length}</div></div>
        </div>
        <div className="v6-card v6-stat">
          <div className="v6-ic" style={{ background: "#fee2e2", color: "#dc2626" }}><Landmark size={20} /></div>
          <div><div className="v6-lb">Saldo a pagar</div><div className="v6-vl" style={{ color: "#dc2626" }}>{formatCurrency(totalAberto)}</div></div>
        </div>
      </div>

      <div className="v6-card" style={{ marginTop: 16 }}>
        <div className="v6-card-b" style={{ paddingBottom: 0 }}>
          <div className="v6-search" style={{ maxWidth: 360 }}><Search /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar descrição, fornecedor ou categoria..." /></div>
        </div>
        <div className="v6-card-b" style={{ overflowX: "auto" }}>
          <table className="v6-tbl" style={{ minWidth: 820 }}>
            <thead><tr>
              <th>Descrição</th><th>Fornecedor</th><th>Vencimento</th>
              <th style={{ textAlign: "right" }}>Valor</th><th style={{ textAlign: "right" }}>Saldo</th>
              <th>Status</th><th style={{ textAlign: "right" }}>Ações</th>
            </tr></thead>
            <tbody>
              {lista.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: "center", padding: 28, color: "var(--v6-muted)" }}>Nenhuma conta.</td></tr>
              ) : lista.map((c) => {
                const st = statusConta(c);
                return (
                  <tr key={c.id}>
                    <td style={{ fontWeight: 600 }}>{c.descricao}</td>
                    <td style={{ color: "var(--v6-muted)" }}>{c.fornecedor || "—"}</td>
                    <td style={{ color: "var(--v6-muted)" }}>{c.vencimento ? formatDate(c.vencimento) : "—"}</td>
                    <td style={{ textAlign: "right" }}>{formatCurrency(c.valor)}</td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>{formatCurrency(c.saldo)}</td>
                    <td><span className="v6-chip" style={{ padding: "3px 10px", cursor: "default", ...st.style }}>{st.label}</span></td>
                    <td style={{ textAlign: "right" }}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><button className="v6-icon-btn" style={{ width: 30, height: 30, border: 0, background: "transparent" }}><MoreHorizontal size={16} /></button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {perm.pagar && c.saldo > 0 && !c.cancelada && <DropdownMenuItem onClick={() => abrirPagar(c)}>Pagar</DropdownMenuItem>}
                          <DropdownMenuItem onClick={() => { setForm({ descricao: c.descricao, fornecedor: c.fornecedor || "", categoria: c.categoria || "", valor: String(c.valor), vencimento: c.vencimento || "", store_id: c.store_id }); setEditId(c.id); }}>Editar</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => abrirVer(c)}>Pagamentos</DropdownMenuItem>
                          {perm.excluir && <><DropdownMenuSeparator /><DropdownMenuItem className="text-destructive" onClick={() => excluir(c)}>Excluir</DropdownMenuItem></>}
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

      {/* Modal criar/editar */}
      <Dialog open={!!form} onOpenChange={(o) => { if (!o) { setForm(null); setEditId(null); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editId ? "Editar" : "Nova"} conta a pagar</DialogTitle></DialogHeader>
          {form && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ gridColumn: "1 / -1" }}><label style={lbl}>Descrição da despesa *</label><input style={ctrl} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
              <div><label style={lbl}>Fornecedor</label><input style={ctrl} value={form.fornecedor} onChange={(e) => setForm({ ...form, fornecedor: e.target.value })} /></div>
              <div>
                <label style={lbl}>Categoria</label>
                <input style={ctrl} list="cats-pagar" placeholder="Selecione ou digite..." value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} />
                <datalist id="cats-pagar">{categorias.map((cnome) => <option key={cnome} value={cnome} />)}</datalist>
              </div>
              <div><label style={lbl}>Valor (R$)</label><input style={ctrl} type="number" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} /></div>
              <div><label style={lbl}>Vencimento</label><input style={ctrl} type="date" value={form.vencimento} onChange={(e) => setForm({ ...form, vencimento: e.target.value })} /></div>
              <div style={{ gridColumn: "1 / -1" }}><label style={lbl}>Loja *</label>
                <select style={ctrl} value={form.store_id} onChange={(e) => setForm({ ...form, store_id: e.target.value })}>
                  <option value="">— selecione —</option>
                  {lojas.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
                </select>
              </div>
            </div>
          )}
          <DialogFooter>
            <button className="v6-btn" style={{ background: "var(--v6-card)", color: "var(--v6-fg)", border: "1px solid var(--v6-border)" }} onClick={() => { setForm(null); setEditId(null); }} disabled={busy}>Cancelar</button>
            <button className="v6-btn v6-btn-primary" onClick={salvar} disabled={busy}>{busy ? "Salvando..." : "Salvar"}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal pagar */}
      <Dialog open={!!pay} onOpenChange={(o) => { if (!o && !busy) setPay(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Registrar pagamento</DialogTitle></DialogHeader>
          {pay && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <p style={{ fontSize: 13, color: "var(--v6-muted)" }}>Saldo: <b style={{ color: "var(--v6-fg)" }}>{formatCurrency(pay.saldo)}</b></p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label style={lbl}>Valor (R$)</label><input style={ctrl} type="number" value={valorPay} onChange={(e) => setValorPay(e.target.value)} /></div>
                <div><label style={lbl}>Forma</label>
                  <select style={ctrl} value={formaPay} onChange={(e) => setFormaPay(e.target.value)}>
                    <option>Pix</option><option>Dinheiro</option><option>Boleto</option><option>Transferência</option><option>Cartão</option>
                  </select>
                </div>
              </div>
              <p style={{ fontSize: 11.5, color: "var(--v6-muted-2)" }}>Gera um único movimento de caixa (saída). Idempotente.</p>
            </div>
          )}
          <DialogFooter>
            <button className="v6-btn" style={{ background: "var(--v6-card)", color: "var(--v6-fg)", border: "1px solid var(--v6-border)" }} onClick={() => setPay(null)} disabled={busy}>Cancelar</button>
            <button className="v6-btn v6-btn-primary" onClick={confirmarPagar} disabled={busy}>{busy ? "Processando..." : "Confirmar"}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal ver pagamentos / estorno */}
      <Dialog open={!!verConta} onOpenChange={(o) => { if (!o) setVerConta(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Pagamentos da conta</DialogTitle></DialogHeader>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {pgtos.length === 0 ? <p style={{ fontSize: 13, color: "var(--v6-muted)" }}>Nenhum pagamento.</p> : pgtos.map((p) => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 12, border: "1px solid var(--v6-border)", borderRadius: 9, padding: "8px 10px", fontSize: 13 }}>
                <span style={{ fontWeight: 600 }}>{formatCurrency(p.valor)}</span>
                <span style={{ color: "var(--v6-muted)" }}>{p.forma || "—"}</span>
                <span style={{ fontSize: 11.5, color: "var(--v6-muted-2)" }}>{formatDate(p.created_at)}</span>
                {p.estornado ? <span className="v6-chip" style={{ marginLeft: "auto", padding: "3px 10px", cursor: "default", background: "#fee2e2", color: "#b91c1c", borderColor: "#fca5a5" }}>Estornado</span>
                  : perm.estornar ? <button className="v6-btn" style={{ marginLeft: "auto", height: 30, padding: "0 12px", background: "#fef2f2", color: "#b91c1c", border: "1px solid #fca5a5" }} onClick={() => estornar(p.id)}>Estornar</button> : null}
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
