"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search, Save } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/format";
import { listAgenda, salvarEvento, setStatusEvento, type EventoRow } from "@/lib/data/agenda-actions";
import { listLojasSel, type Opt } from "@/lib/data/vendas-core";

const TIPOS = [{ v: "visita", l: "Visita técnica" }, { v: "instalacao", l: "Instalação" }, { v: "evento", l: "Evento" }];
const STATUS = [{ v: "agendada", l: "Agendada" }, { v: "concluida", l: "Concluída" }, { v: "reagendada", l: "Reagendada" }, { v: "cancelada", l: "Cancelada" }];
const tipoLabel = (v: string) => TIPOS.find((t) => t.v === v)?.l || v;
const statusLabel = (v: string) => STATUS.find((s) => s.v === v)?.l || v;

export default function AgendaPage() {
  const { toast } = useToast();
  const [rows, setRows] = useState<EventoRow[]>([]);
  const [erro, setErro] = useState("");
  const [q, setQ] = useState(""); const [fStatus, setFStatus] = useState("");
  const [novo, setNovo] = useState(false);
  const [reagendarEvt, setReagendarEvt] = useState<EventoRow | null>(null);

  const carregar = useCallback(() => {
    listAgenda(fStatus ? { status: fStatus } : undefined).then((r) => { if (r.ok && r.data) { setRows(r.data); setErro(""); } else setErro(r.error || "Falha ao carregar a agenda."); });
  }, [fStatus]);
  useEffect(() => { carregar(); }, [carregar]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((e) => !s || e.cliente_nome.toLowerCase().includes(s) || (e.titulo || "").toLowerCase().includes(s) || (e.profissional || "").toLowerCase().includes(s));
  }, [rows, q]);

  async function concluir(e: EventoRow) { const r = await setStatusEvento(e.id, "concluida"); if (r.ok) { toast({ variant: "success", title: "Evento concluído" }); carregar(); } }
  // Reagendar via MODAL controlado (sem prompt/alert/confirm nativos que travam a aba).
  function reagendar(e: EventoRow) { setReagendarEvt(e); }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div><div className="v6-page-title">Agenda</div><div className="v6-page-desc">Visitas técnicas, instalações e eventos, com vínculo a venda e obra.</div></div>
        <button className="v6-btn v6-btn-primary" style={{ marginLeft: "auto" }} onClick={() => setNovo(true)}><Plus /> Novo agendamento</button>
      </div>

      {erro && <div className="v6-card" style={{ padding: 12, marginBottom: 12, borderColor: "#fca5a5", background: "#fef2f2", color: "#b91c1c" }}>{erro}</div>}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16, alignItems: "center" }}>
        <div className="v6-search" style={{ maxWidth: 300 }}><Search /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cliente, título, profissional..." /></div>
        <button className={`v6-chip${fStatus === "" ? " active" : ""}`} onClick={() => setFStatus("")}>Todos</button>
        {STATUS.map((s) => <button key={s.v} className={`v6-chip${fStatus === s.v ? " active" : ""}`} onClick={() => setFStatus(s.v)}>{s.l}</button>)}
      </div>

      <div className="v6-card">
        <div className="v6-card-b" style={{ overflowX: "auto" }}>
          <table className="v6-tbl" style={{ minWidth: 820 }}>
            <thead><tr><th>Data</th><th>Hora</th><th>Tipo</th><th>Cliente</th><th>Profissional</th><th>Local</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {filtered.length === 0 ? <tr><td colSpan={8} style={{ textAlign: "center", padding: 24, color: "var(--v6-muted)" }}>Nenhum agendamento.</td></tr> :
                filtered.map((e) => (
                  <tr key={e.id}>
                    <td style={{ fontWeight: 600 }}>{formatDate(e.data)}</td>
                    <td style={{ color: "var(--v6-muted)" }}>{e.hora || "—"}</td>
                    <td>{tipoLabel(e.tipo)}</td>
                    <td>{e.cliente_nome || e.titulo || "—"}</td>
                    <td style={{ color: "var(--v6-muted)" }}>{e.profissional || "—"}</td>
                    <td style={{ color: "var(--v6-muted)" }}>{e.endereco || e.loja_nome}</td>
                    <td><span className="v6-badge v6-badge-muted">{statusLabel(e.status)}</span></td>
                    <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                      {e.status !== "concluida" && e.status !== "cancelada" && <>
                        <button className="v6-btn v6-btn-ghost v6-btn-sm" onClick={() => reagendar(e)}>Reagendar</button>
                        <button className="v6-btn v6-btn-outline v6-btn-sm" onClick={() => concluir(e)}>Concluir</button>
                      </>}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {novo && <NovoEventoDialog onClose={() => setNovo(false)} onSaved={() => { setNovo(false); carregar(); }} toast={toast} />}
      {reagendarEvt && <ReagendarDialog evt={reagendarEvt} onClose={() => setReagendarEvt(null)} onSaved={() => { setReagendarEvt(null); carregar(); }} toast={toast} />}
    </div>
  );
}

function ReagendarDialog({ evt, onClose, onSaved, toast }: { evt: EventoRow; onClose: () => void; onSaved: () => void; toast: ReturnType<typeof useToast>["toast"] }) {
  const [data, setData] = useState(evt.data || "");
  const [hora, setHora] = useState(evt.hora || "");
  const [obs, setObs] = useState("");
  const [saving, setSaving] = useState(false); const [err, setErr] = useState("");

  async function salvar() {
    if (!data) { setErr("Informe a nova data."); return; }
    setSaving(true);
    const r = await setStatusEvento(evt.id, "reagendada", data, hora);
    setSaving(false);
    if (r.ok) { toast({ variant: "info", title: "Reagendado", description: `${evt.cliente_nome || evt.titulo || "Evento"}${obs ? " — " + obs : ""}` }); onSaved(); }
    else setErr(r.error || "Falha ao reagendar.");
  }

  return (
    <div className="v6-modal-scrim" onClick={onClose}>
      <div className="v6-modal" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
        <div className="v6-modal-h"><span>Reagendar — {evt.cliente_nome || evt.titulo || "evento"}</span><button className="v6-x" onClick={onClose}>✕</button></div>
        <div className="v6-modal-b">
          {err && <div className="v6-field-err" style={{ marginBottom: 10 }}>{err}</div>}
          <div className="v6-g2">
            <div><label className="v6-lbl">Nova data</label><input className="v6-inp" type="date" value={data} onChange={(e) => setData(e.target.value)} /></div>
            <div><label className="v6-lbl">Novo horário</label><input className="v6-inp" type="time" value={hora} onChange={(e) => setHora(e.target.value)} /></div>
            <div className="v6-col-span"><label className="v6-lbl">Profissional</label><input className="v6-inp" value={evt.profissional} disabled style={{ background: "#f8fafc" }} /></div>
            <div className="v6-col-span"><label className="v6-lbl">Motivo / observação</label><textarea className="v6-inp" rows={2} value={obs} onChange={(e) => setObs(e.target.value)} /></div>
          </div>
        </div>
        <div className="v6-modal-f">
          <button className="v6-btn v6-btn-outline" onClick={onClose}>Cancelar</button>
          <button className="v6-btn v6-btn-primary" onClick={salvar} disabled={saving}><Save size={16} /> {saving ? "Salvando…" : "Reagendar"}</button>
        </div>
      </div>
    </div>
  );
}

function NovoEventoDialog({ onClose, onSaved, toast }: { onClose: () => void; onSaved: () => void; toast: ReturnType<typeof useToast>["toast"] }) {
  const [f, setF] = useState({ tipo: "visita", titulo: "", profissional: "", cliente_nome: "", telefone: "", endereco: "", data: "", hora: "", store_id: "", obs: "" });
  const [lojas, setLojas] = useState<Opt[]>([]); const [saving, setSaving] = useState(false); const [err, setErr] = useState("");
  useEffect(() => { listLojasSel().then(setLojas).catch(() => {}); }, []);
  const set = (k: string, v: string) => setF((p) => ({ ...p, [k]: v }));

  async function salvar() {
    if (!f.data) { setErr("Informe a data."); return; }
    setSaving(true);
    const r = await salvarEvento({ ...f, store_id: f.store_id || undefined });
    setSaving(false);
    if (r.ok) { toast({ variant: "success", title: "Agendamento criado" }); onSaved(); } else setErr(r.error || "Falha.");
  }

  return (
    <div className="v6-modal-scrim" onClick={onClose}>
      <div className="v6-modal" style={{ maxWidth: 620 }} onClick={(e) => e.stopPropagation()}>
        <div className="v6-modal-h"><span>Novo agendamento</span><button className="v6-x" onClick={onClose}>✕</button></div>
        <div className="v6-modal-b">
          {err && <div className="v6-field-err" style={{ marginBottom: 10 }}>{err}</div>}
          <div className="v6-g2">
            <div><label className="v6-lbl">Tipo</label><select className="v6-inp" value={f.tipo} onChange={(e) => set("tipo", e.target.value)}>{TIPOS.map((t) => <option key={t.v} value={t.v}>{t.l}</option>)}</select></div>
            <div><label className="v6-lbl">Profissional</label><input className="v6-inp" value={f.profissional} onChange={(e) => set("profissional", e.target.value)} /></div>
            <div><label className="v6-lbl">Data</label><input className="v6-inp" type="date" value={f.data} onChange={(e) => set("data", e.target.value)} /></div>
            <div><label className="v6-lbl">Hora</label><input className="v6-inp" type="time" value={f.hora} onChange={(e) => set("hora", e.target.value)} /></div>
            <div><label className="v6-lbl">Cliente</label><input className="v6-inp" value={f.cliente_nome} onChange={(e) => set("cliente_nome", e.target.value)} /></div>
            <div><label className="v6-lbl">Telefone</label><input className="v6-inp" value={f.telefone} onChange={(e) => set("telefone", e.target.value)} /></div>
            <div className="v6-col-span"><label className="v6-lbl">Endereço</label><input className="v6-inp" value={f.endereco} onChange={(e) => set("endereco", e.target.value)} /></div>
            <div className="v6-col-span"><label className="v6-lbl">Loja / operação</label><select className="v6-inp" value={f.store_id} onChange={(e) => set("store_id", e.target.value)}><option value="">— selecione —</option>{lojas.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}</select></div>
            <div className="v6-col-span"><label className="v6-lbl">Observações</label><textarea className="v6-inp" rows={2} value={f.obs} onChange={(e) => set("obs", e.target.value)} /></div>
          </div>
        </div>
        <div className="v6-modal-f">
          <button className="v6-btn v6-btn-outline" onClick={onClose}>Cancelar</button>
          <button className="v6-btn v6-btn-primary" onClick={salvar} disabled={saving}><Save size={16} /> {saving ? "Salvando…" : "Agendar"}</button>
        </div>
      </div>
    </div>
  );
}
