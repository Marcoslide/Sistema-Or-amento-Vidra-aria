"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search, Save, AlertTriangle } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  listReclamacoes, salvarReclamacao, mudarStatusReclamacao, type ReclamacaoRow,
} from "@/lib/data/reclamacoes-actions";
import { listLojasSel, type Opt } from "@/lib/data/vendas-core";

const STATUS_RECL = [
  { v: "pendente", l: "Pendente" },
  { v: "em_atendimento", l: "Em atendimento" },
  { v: "aguardando_cliente", l: "Aguardando cliente" },
  { v: "aguardando_material", l: "Aguardando material" },
  { v: "aguardando_visita", l: "Aguardando visita" },
  { v: "resolvida", l: "Resolvida" },
  { v: "reaberta", l: "Reaberta" },
];
const PRIOR = [{ v: "baixa", l: "Baixa" }, { v: "media", l: "Média" }, { v: "alta", l: "Alta" }];
const statusLabel = (v: string) => STATUS_RECL.find((s) => s.v === v)?.l || v;
const priorLabel = (v: string) => PRIOR.find((p) => p.v === v)?.l || v;

export default function ReclamacoesPage() {
  const { toast } = useToast();
  const [rows, setRows] = useState<ReclamacaoRow[]>([]);
  const [erro, setErro] = useState("");
  const [q, setQ] = useState(""); const [fStatus, setFStatus] = useState("");
  const [novo, setNovo] = useState(false);

  const carregar = useCallback(() => {
    listReclamacoes(fStatus ? { status: fStatus } : undefined).then((r) => { if (r.ok && r.data) { setRows(r.data); setErro(""); } else setErro(r.error || "Falha ao carregar reclamações."); });
  }, [fStatus]);
  useEffect(() => { carregar(); }, [carregar]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((r) => !s || r.cliente_nome.toLowerCase().includes(s) || r.motivo.toLowerCase().includes(s) || (r.responsavel || "").toLowerCase().includes(s));
  }, [rows, q]);

  async function avancar(r: ReclamacaoRow, novo: string) {
    const res = await mudarStatusReclamacao(r.id, novo);
    if (res.ok) { toast({ variant: novo === "resolvida" ? "success" : "info", title: "Status atualizado", description: statusLabel(novo) }); carregar(); }
    else toast({ variant: "warning", title: "Falha", description: res.error || "" });
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div><div className="v6-page-title">Reclamações</div><div className="v6-page-desc">Pós-venda: registro, prioridade, fluxo de status e histórico, com vínculo a venda/obra.</div></div>
        <button className="v6-btn v6-btn-primary" style={{ marginLeft: "auto" }} onClick={() => setNovo(true)}><Plus /> Nova reclamação</button>
      </div>

      {erro && <div className="v6-card" style={{ padding: 12, marginBottom: 12, borderColor: "#fca5a5", background: "#fef2f2", color: "#b91c1c" }}>{erro}</div>}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
        <div className="v6-search" style={{ maxWidth: 300 }}><Search /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cliente, motivo, responsável..." /></div>
        <button className={`v6-chip${fStatus === "" ? " active" : ""}`} onClick={() => setFStatus("")}>Todas</button>
        {STATUS_RECL.map((s) => <button key={s.v} className={`v6-chip${fStatus === s.v ? " active" : ""}`} onClick={() => setFStatus(s.v)}>{s.l}</button>)}
      </div>

      <div className="v6-card">
        <div className="v6-card-b" style={{ overflowX: "auto" }}>
          <table className="v6-tbl" style={{ minWidth: 900 }}>
            <thead><tr><th>Aberta</th><th>Cliente</th><th>Motivo</th><th>Prioridade</th><th>Responsável</th><th>Custo</th><th>Status</th><th>Avançar</th></tr></thead>
            <tbody>
              {filtered.length === 0 ? <tr><td colSpan={8} style={{ textAlign: "center", padding: 24, color: "var(--v6-muted)" }}>Nenhuma reclamação.</td></tr> :
                filtered.map((r) => (
                  <tr key={r.id}>
                    <td style={{ color: "var(--v6-muted)" }}>{formatDate(r.created_at)}</td>
                    <td style={{ fontWeight: 600 }}>{r.cliente_nome || "—"}</td>
                    <td>{r.motivo}{r.reaberta && <span className="v6-badge v6-badge-muted" style={{ marginLeft: 6 }}>reaberta</span>}</td>
                    <td>{priorLabel(r.prioridade)}</td>
                    <td style={{ color: "var(--v6-muted)" }}>{r.responsavel || "—"}</td>
                    <td>{r.custo > 0 ? formatCurrency(r.custo) : "—"}</td>
                    <td><span className="v6-badge v6-badge-muted">{statusLabel(r.status)}</span></td>
                    <td style={{ minWidth: 190 }}>
                      <select className="v6-inp" style={{ height: 32 }} value={r.status} onChange={(e) => avancar(r, e.target.value)}>
                        {STATUS_RECL.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {novo && <NovaReclamacaoDialog onClose={() => setNovo(false)} onSaved={() => { setNovo(false); carregar(); }} toast={toast} />}
    </div>
  );
}

function NovaReclamacaoDialog({ onClose, onSaved, toast }: { onClose: () => void; onSaved: () => void; toast: ReturnType<typeof useToast>["toast"] }) {
  const [f, setF] = useState({ cliente_nome: "", motivo: "", descricao: "", prioridade: "media", responsavel: "", custo: "", store_id: "" });
  const [lojas, setLojas] = useState<Opt[]>([]); const [saving, setSaving] = useState(false); const [err, setErr] = useState("");
  useEffect(() => { listLojasSel().then(setLojas).catch(() => {}); }, []);
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  async function salvar() {
    if (!f.motivo.trim()) { setErr("Informe o motivo."); return; }
    setSaving(true);
    const r = await salvarReclamacao({ ...f, custo: Number(f.custo) || 0, store_id: f.store_id || undefined });
    setSaving(false);
    if (r.ok) { toast({ variant: "success", title: "Reclamação registrada" }); onSaved(); } else setErr(r.error || "Falha.");
  }

  return (
    <div className="v6-modal-scrim" onClick={onClose}>
      <div className="v6-modal" style={{ maxWidth: 620 }} onClick={(e) => e.stopPropagation()}>
        <div className="v6-modal-h"><span><AlertTriangle size={16} style={{ verticalAlign: "-3px", marginRight: 6 }} />Nova reclamação</span><button className="v6-x" onClick={onClose}>✕</button></div>
        <div className="v6-modal-b">
          {err && <div className="v6-field-err" style={{ marginBottom: 10 }}>{err}</div>}
          <div className="v6-g2">
            <div><label className="v6-lbl">Cliente</label><input className="v6-inp" value={f.cliente_nome} onChange={(e) => set("cliente_nome", e.target.value)} /></div>
            <div><label className="v6-lbl">Responsável</label><input className="v6-inp" value={f.responsavel} onChange={(e) => set("responsavel", e.target.value)} /></div>
            <div className="v6-col-span"><label className="v6-lbl">Motivo</label><input className="v6-inp" value={f.motivo} onChange={(e) => set("motivo", e.target.value)} /></div>
            <div className="v6-col-span"><label className="v6-lbl">Descrição</label><textarea className="v6-inp" rows={3} value={f.descricao} onChange={(e) => set("descricao", e.target.value)} /></div>
            <div><label className="v6-lbl">Prioridade</label><select className="v6-inp" value={f.prioridade} onChange={(e) => set("prioridade", e.target.value)}>{PRIOR.map((p) => <option key={p.v} value={p.v}>{p.l}</option>)}</select></div>
            <div><label className="v6-lbl">Custo estimado (R$)</label><input className="v6-inp" type="number" value={f.custo} onChange={(e) => set("custo", e.target.value)} /></div>
            <div className="v6-col-span"><label className="v6-lbl">Loja / operação</label><select className="v6-inp" value={f.store_id} onChange={(e) => set("store_id", e.target.value)}><option value="">— selecione —</option>{lojas.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}</select></div>
          </div>
        </div>
        <div className="v6-modal-f">
          <button className="v6-btn v6-btn-outline" onClick={onClose}>Cancelar</button>
          <button className="v6-btn v6-btn-primary" onClick={salvar} disabled={saving}><Save size={16} /> {saving ? "Salvando…" : "Registrar"}</button>
        </div>
      </div>
    </div>
  );
}
