"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search, HardHat, Save } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/format";
import { listObras, salvarObra, type ObraRow } from "@/lib/data/obras-actions";
import { listLojasSel, type Opt } from "@/lib/data/vendas-core";

const COLS = [
  { v: "aguardando", l: "Aguardando", cor: "#64748b" },
  { v: "execucao", l: "Em execução", cor: "#b45309" },
  { v: "concluida", l: "Concluída", cor: "#16a34a" },
];

export default function ObrasPage() {
  const { toast } = useToast();
  const [rows, setRows] = useState<ObraRow[]>([]);
  const [erro, setErro] = useState("");
  const [q, setQ] = useState("");
  const [novo, setNovo] = useState(false);

  const carregar = useCallback(() => {
    listObras().then((r) => { if (r.ok && r.data) { setRows(r.data); setErro(""); } else setErro(r.error || "Falha ao carregar obras."); });
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return rows.filter((o) => !s || o.nome.toLowerCase().includes(s) || o.cliente_nome.toLowerCase().includes(s) || (o.responsavel || "").toLowerCase().includes(s));
  }, [rows, q]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <div><div className="v6-page-title">Obras</div><div className="v6-page-desc">Acompanhamento operacional de obras e instalações. Sem valores financeiros nesta tela.</div></div>
        <button className="v6-btn v6-btn-primary" style={{ marginLeft: "auto" }} onClick={() => setNovo(true)}><Plus /> Nova obra</button>
      </div>

      {erro && <div className="v6-card" style={{ padding: 12, marginBottom: 12, borderColor: "#fca5a5", background: "#fef2f2", color: "#b91c1c" }}>{erro}</div>}

      <div className="v6-search" style={{ maxWidth: 340, marginBottom: 16 }}><Search /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Obra, cliente, responsável..." /></div>

      <div className="v6-grid" style={{ gridTemplateColumns: "repeat(3,minmax(0,1fr))", alignItems: "start" }}>
        {COLS.map((col) => {
          const itens = filtered.filter((o) => o.status === col.v);
          return (
            <div key={col.v} className="v6-card" style={{ padding: 0 }}>
              <div className="v6-card-h" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 14, borderBottom: "1px solid var(--v6-border)" }}>
                <span style={{ fontWeight: 650, color: col.cor }}>{col.l}</span>
                <span className="v6-badge v6-badge-muted">{itens.length}</span>
              </div>
              <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10, minHeight: 80 }}>
                {itens.length === 0 ? <div style={{ color: "var(--v6-muted)", fontSize: 13, textAlign: "center", padding: 16 }}>—</div> :
                  itens.map((o) => (
                    <Link key={o.id} href={`/obras/${o.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                      <div style={{ border: "1px solid var(--v6-border)", borderRadius: 10, padding: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <HardHat size={16} style={{ color: col.cor }} />
                          <b style={{ fontSize: 13.5 }}>{o.nome}</b>
                          {o.sale_numero != null && <span style={{ marginLeft: "auto", fontSize: 11.5, color: "var(--v6-muted)" }}>#{o.sale_numero}</span>}
                        </div>
                        {o.cliente_nome && <div style={{ fontSize: 12.5, color: "var(--v6-muted)", marginTop: 4 }}>{o.cliente_nome}</div>}
                        {o.endereco && <div style={{ fontSize: 12, color: "var(--v6-muted-2)", marginTop: 2 }}>{o.endereco}</div>}
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                          <div style={{ flex: 1, height: 6, background: "#eef2f7", borderRadius: 999 }}>
                            <div style={{ width: `${o.progresso}%`, height: "100%", background: col.cor, borderRadius: 999 }} />
                          </div>
                          <span style={{ fontSize: 11.5, color: "var(--v6-muted)" }}>{o.progresso}%</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 11.5, color: "var(--v6-muted-2)" }}>
                          <span>{o.responsavel || "Sem responsável"}</span>
                          <span>{o.prazo ? formatDate(o.prazo) : ""}</span>
                        </div>
                      </div>
                    </Link>
                  ))}
              </div>
            </div>
          );
        })}
      </div>

      {novo && <NovaObraDialog onClose={() => setNovo(false)} onSaved={() => { setNovo(false); carregar(); }} toast={toast} />}
    </div>
  );
}

function NovaObraDialog({ onClose, onSaved, toast }: { onClose: () => void; onSaved: () => void; toast: ReturnType<typeof useToast>["toast"] }) {
  const [nome, setNome] = useState(""); const [endereco, setEndereco] = useState(""); const [responsavel, setResponsavel] = useState("");
  const [prazo, setPrazo] = useState(""); const [storeId, setStoreId] = useState(""); const [lojas, setLojas] = useState<Opt[]>([]);
  const [saving, setSaving] = useState(false); const [err, setErr] = useState("");

  useEffect(() => { listLojasSel().then(setLojas).catch(() => {}); }, []);

  async function salvar() {
    if (!nome.trim()) { setErr("Informe o nome da obra."); return; }
    setSaving(true);
    const r = await salvarObra({ nome, endereco, responsavel, prazo, store_id: storeId || undefined });
    setSaving(false);
    if (r.ok) { toast({ variant: "success", title: "Obra criada", description: nome }); onSaved(); }
    else setErr(r.error || "Falha ao salvar.");
  }

  return (
    <div className="v6-modal-scrim" onClick={onClose}>
      <div className="v6-modal" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
        <div className="v6-modal-h"><span>Nova obra</span><button className="v6-x" onClick={onClose}>✕</button></div>
        <div className="v6-modal-b">
          {err && <div className="v6-field-err" style={{ marginBottom: 10 }}>{err}</div>}
          <div className="v6-g2">
            <div className="v6-col-span"><label className="v6-lbl">Nome da obra</label><input className="v6-inp" value={nome} onChange={(e) => setNome(e.target.value)} /></div>
            <div className="v6-col-span"><label className="v6-lbl">Endereço</label><input className="v6-inp" value={endereco} onChange={(e) => setEndereco(e.target.value)} /></div>
            <div><label className="v6-lbl">Responsável</label><input className="v6-inp" value={responsavel} onChange={(e) => setResponsavel(e.target.value)} /></div>
            <div><label className="v6-lbl">Prazo</label><input className="v6-inp" type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} /></div>
            <div className="v6-col-span"><label className="v6-lbl">Loja / operação</label><select className="v6-inp" value={storeId} onChange={(e) => setStoreId(e.target.value)}><option value="">— selecione —</option>{lojas.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}</select></div>
          </div>
        </div>
        <div className="v6-modal-f">
          <button className="v6-btn v6-btn-outline" onClick={onClose}>Cancelar</button>
          <button className="v6-btn v6-btn-primary" onClick={salvar} disabled={saving}><Save size={16} /> {saving ? "Salvando…" : "Criar obra"}</button>
        </div>
      </div>
    </div>
  );
}
