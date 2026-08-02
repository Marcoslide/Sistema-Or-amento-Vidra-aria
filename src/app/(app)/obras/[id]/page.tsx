"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Plus, CheckSquare, Square, CalendarDays, Save } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/format";
import { getObra, setStatusObra, addChecklist, toggleChecklist, addDiario, salvarObra, type ObraFull } from "@/lib/data/obras-actions";

const STATUS = [
  { v: "aguardando", l: "Aguardando" },
  { v: "execucao", l: "Em execução" },
  { v: "concluida", l: "Concluída" },
];

export default function ObraDetailPage() {
  const params = useParams<{ id: string }>();
  const { toast } = useToast();
  const [o, setO] = useState<ObraFull | null>(null);
  const [erro, setErro] = useState("");
  const [novoItem, setNovoItem] = useState("");
  const [novaEntrada, setNovaEntrada] = useState("");
  const [progresso, setProgresso] = useState(0);

  const carregar = useCallback(() => {
    getObra(params.id).then((r) => { if (r.ok && r.data) { setO(r.data); setProgresso(r.data.progresso); setErro(""); } else setErro(r.error || "Obra não encontrada."); });
  }, [params.id]);
  useEffect(() => { carregar(); }, [carregar]);

  async function mudarStatus(status: string) {
    const r = await setStatusObra(params.id, status, progresso);
    if (r.ok) { toast({ variant: status === "concluida" ? "success" : "info", title: "Status atualizado" }); carregar(); }
    else toast({ variant: "warning", title: "Falha", description: r.error || "" });
  }
  async function salvarProgresso() {
    if (!o) return;
    const r = await salvarObra({ id: o.id, nome: o.nome, progresso });
    if (r.ok) { toast({ variant: "success", title: "Progresso salvo" }); carregar(); }
    else toast({ variant: "warning", title: "Falha", description: r.error || "" });
  }
  async function addItem() { if (!novoItem.trim()) return; const r = await addChecklist(params.id, novoItem); if (r.ok) { setNovoItem(""); carregar(); } else toast({ variant: "warning", title: "Falha", description: r.error || "" }); }
  async function toggleItem(id: string, feito: boolean) { await toggleChecklist(id, feito); carregar(); }
  async function addEntrada() { if (!novaEntrada.trim()) return; const r = await addDiario(params.id, novaEntrada); if (r.ok) { setNovaEntrada(""); carregar(); } else toast({ variant: "warning", title: "Falha", description: r.error || "" }); }

  if (erro) return <div className="v6-card" style={{ padding: 16, color: "#b91c1c" }}>{erro}</div>;
  if (!o) return <div style={{ padding: 20, color: "var(--v6-muted)" }}>Carregando…</div>;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <Link href="/obras" className="v6-btn v6-btn-outline v6-btn-sm"><ArrowLeft size={16} /> Voltar</Link>
        <div><div className="v6-page-title">{o.nome}</div><div className="v6-page-desc">{o.cliente_nome}{o.sale_numero != null ? ` · Venda #${o.sale_numero}` : ""}{o.loja_nome && o.loja_nome !== "—" ? ` · ${o.loja_nome}` : ""}</div></div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {STATUS.map((s) => (
            <button key={s.v} className={`v6-chip${o.status === s.v ? " active" : ""}`} onClick={() => mudarStatus(s.v)}>{s.l}</button>
          ))}
        </div>
      </div>

      <div className="v6-grid" style={{ gridTemplateColumns: "minmax(0,1fr) 340px", alignItems: "start" }}>
        {/* Coluna principal: diário */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="v6-card">
            <div className="v6-card-h"><div className="v6-card-title">Diário de obra</div><div className="v6-card-desc">Registro do andamento (data, texto, foto opcional).</div></div>
            <div className="v6-card-b">
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                <input className="v6-inp" value={novaEntrada} onChange={(e) => setNovaEntrada(e.target.value)} placeholder="Nova entrada no diário..." onKeyDown={(e) => e.key === "Enter" && addEntrada()} />
                <button className="v6-btn v6-btn-primary" onClick={addEntrada}><Plus size={16} /> Adicionar</button>
              </div>
              {o.diario.length === 0 ? <div style={{ color: "var(--v6-muted)", fontSize: 13 }}>Nenhuma entrada ainda.</div> :
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {o.diario.map((d) => (
                    <div key={d.id} style={{ border: "1px solid var(--v6-border)", borderRadius: 10, padding: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--v6-muted)" }}><CalendarDays size={13} /> {formatDate(d.data)}</div>
                      <div style={{ fontSize: 13.5, marginTop: 4 }}>{d.texto}</div>
                    </div>
                  ))}
                </div>}
            </div>
          </div>
        </div>

        {/* Coluna lateral: progresso + checklist */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="v6-card">
            <div className="v6-card-h"><div className="v6-card-title">Progresso</div></div>
            <div className="v6-card-b">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <input type="range" min={0} max={100} value={progresso} onChange={(e) => setProgresso(Number(e.target.value))} style={{ flex: 1, accentColor: "var(--v6-primary)" }} />
                <b style={{ width: 44, textAlign: "right" }}>{progresso}%</b>
              </div>
              <button className="v6-btn v6-btn-outline v6-btn-sm" style={{ marginTop: 12 }} onClick={salvarProgresso}><Save size={14} /> Salvar progresso</button>
              {o.prazo && <div style={{ marginTop: 10, fontSize: 12.5, color: "var(--v6-muted)" }}>Prazo: {formatDate(o.prazo)}</div>}
              {o.responsavel && <div style={{ fontSize: 12.5, color: "var(--v6-muted)" }}>Responsável: {o.responsavel}</div>}
            </div>
          </div>

          <div className="v6-card">
            <div className="v6-card-h"><div className="v6-card-title">Checklist / pendências</div></div>
            <div className="v6-card-b">
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <input className="v6-inp" value={novoItem} onChange={(e) => setNovoItem(e.target.value)} placeholder="Novo item..." onKeyDown={(e) => e.key === "Enter" && addItem()} />
                <button className="v6-btn v6-btn-primary v6-btn-sm" onClick={addItem}><Plus size={14} /></button>
              </div>
              {o.checklist.length === 0 ? <div style={{ color: "var(--v6-muted)", fontSize: 13 }}>Sem itens.</div> :
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {o.checklist.map((c) => (
                    <button key={c.id} onClick={() => toggleItem(c.id, !c.feito)} style={{ display: "flex", alignItems: "center", gap: 8, border: 0, background: "transparent", cursor: "pointer", textAlign: "left", padding: "4px 0", fontSize: 13.5, color: c.feito ? "var(--v6-muted)" : "var(--v6-fg)", textDecoration: c.feito ? "line-through" : "none" }}>
                      {c.feito ? <CheckSquare size={16} style={{ color: "var(--v6-primary)" }} /> : <Square size={16} style={{ color: "var(--v6-muted)" }} />}
                      {c.texto}
                    </button>
                  ))}
                </div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
