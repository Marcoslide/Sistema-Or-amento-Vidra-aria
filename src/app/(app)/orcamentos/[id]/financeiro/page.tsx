"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/format";
import { getAnaliseVenda, addCustoExtra, removeCustoExtra, type AnaliseVendaData } from "@/lib/data/analise-actions";

const ctrl: React.CSSProperties = {
  width: "100%", height: 38, border: "1px solid var(--v6-border)", borderRadius: 9,
  padding: "0 11px", background: "var(--v6-card)", fontSize: 13.5, color: "var(--v6-fg)", outline: "none",
};
const lbl: React.CSSProperties = { fontSize: 12.5, fontWeight: 600, color: "var(--v6-muted)", marginBottom: 6, display: "block" };

export default function AnaliseVendaPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<AnaliseVendaData | null>(null);
  const [erro, setErro] = useState(""); const [busy, setBusy] = useState(false);
  const [novo, setNovo] = useState<{ descricao: string; categoria: string; valor: string; participa: boolean } | null>(null);

  const carregar = useCallback(() => {
    getAnaliseVenda(id).then((r) => { if (!r.ok) { setErro(r.error || "Falha."); return; } setData(r.data || null); setErro(""); });
  }, [id]);
  useEffect(() => { carregar(); }, [carregar]);

  async function adicionar() {
    if (!novo) return; setBusy(true); setErro("");
    const res = await addCustoExtra(id, { descricao: novo.descricao, categoria: novo.categoria, valor: parseFloat(novo.valor.replace(",", ".")) || 0, participa_margem: novo.participa });
    setBusy(false);
    if (!res.ok) { setErro(res.error || "Falha."); return; }
    setNovo(null); carregar();
  }
  async function remover(cid: string) { const res = await removeCustoExtra(cid); if (res.ok) carregar(); else setErro(res.error || "Falha."); }

  if (erro && !data) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="v6-card" style={{ padding: 12, borderColor: "#fca5a5", background: "#fef2f2", color: "#b91c1c" }}>{erro}</div>
      <Link href={`/orcamentos/${id}`} className="v6-btn" style={{ alignSelf: "flex-start", background: "var(--v6-card)", color: "var(--v6-fg)", border: "1px solid var(--v6-border)" }}><ArrowLeft size={16} /> Voltar</Link>
    </div>
  );
  if (!data) return <div style={{ padding: 40, textAlign: "center", color: "var(--v6-muted)" }}>Carregando...</div>;
  const a = data.analise;

  const linha = (label: string, v: number, cls?: string) => (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13 }}>
      <span style={{ color: "var(--v6-muted)" }}>{label}</span>
      <span style={{ fontWeight: 600, color: cls || "var(--v6-fg)" }}>{formatCurrency(v)}</span>
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <Link href={`/orcamentos/${id}`} className="v6-icon-btn"><ArrowLeft size={16} /></Link>
        <div>
          <div className="v6-page-title">Análise financeira — Venda #{data.sale.numero ?? ""}</div>
          <div className="v6-page-desc">{data.sale.cliente_nome || ""}</div>
        </div>
      </div>

      {erro && <div className="v6-card" style={{ padding: 12, marginBottom: 12, borderColor: "#fca5a5", background: "#fef2f2", color: "#b91c1c" }}>{erro}</div>}

      <div className="v6-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <div className="v6-card">
          <div className="v6-card-h"><div className="v6-card-title">Receita e custos</div></div>
          <div className="v6-card-b">
            {linha("Receita bruta", a.receitaBruta)}
            {linha("Descontos", -a.descontos)}
            {linha("Acréscimos", a.acrescimos)}
            {linha("Frete", a.frete)}
            {linha("Instalação", a.instalacao)}
            <div style={{ borderTop: "1px solid var(--v6-border)", margin: "6px 0" }} />
            {linha("Receita líquida", a.receitaLiquida)}
            {linha("Custo dos produtos", -a.custoProdutos)}
            {linha("Custos extras (margem)", -a.custosExtras)}
          </div>
        </div>

        <div className="v6-card">
          <div className="v6-card-h"><div className="v6-card-title">Margem e lucro</div></div>
          <div className="v6-card-b">
            {linha("Margem bruta", a.margemBruta)}
            {linha("Margem de contribuição", a.margemContribuicao)}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 13 }}>
              <span style={{ color: "var(--v6-muted)" }}>Margem %</span><span style={{ fontWeight: 600 }}>{a.margemPct.toFixed(1)}%</span>
            </div>
            <div style={{ borderTop: "1px solid var(--v6-border)", margin: "6px 0" }} />
            {linha("Lucro estimado", a.lucroEstimado, a.lucroEstimado >= 0 ? "#16a34a" : "#dc2626")}
            {linha("Recebido", data.recebido)}
            {linha("Lucro realizado", a.lucroRealizado, a.lucroRealizado >= 0 ? "#16a34a" : "#dc2626")}
          </div>
        </div>
      </div>

      <div className="v6-card" style={{ marginTop: 16 }}>
        <div className="v6-card-b">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div className="v6-card-title">Custos extras da venda</div>
            {data.canEdit && <button className="v6-btn v6-btn-primary" style={{ height: 32, padding: "0 12px" }} onClick={() => setNovo({ descricao: "", categoria: "reclamacao", valor: "0", participa: true })}><Plus size={15} /> Custo</button>}
          </div>
          {data.extras.length === 0 ? <p style={{ fontSize: 13, color: "var(--v6-muted)" }}>Nenhum custo extra lançado.</p> : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {data.extras.map((e) => (
                <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 12, border: "1px solid var(--v6-border)", borderRadius: 9, padding: "8px 10px", fontSize: 13 }}>
                  <span style={{ fontWeight: 600 }}>{e.descricao}</span>
                  <span className="v6-chip" style={{ padding: "2px 9px", cursor: "default", background: "#f1f5f9", color: "#475569" }}>{e.categoria}</span>
                  {!e.participa_margem && <span style={{ fontSize: 11.5, color: "var(--v6-muted-2)" }}>(fora da margem)</span>}
                  <span style={{ marginLeft: "auto", fontWeight: 700 }}>{formatCurrency(e.valor)}</span>
                  {data.canEdit && <button className="v6-icon-btn" style={{ width: 30, height: 30, border: 0, background: "transparent", color: "#dc2626" }} onClick={() => remover(e.id)}><Trash2 size={15} /></button>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!novo} onOpenChange={(o) => { if (!o) setNovo(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Adicionar custo à venda</DialogTitle></DialogHeader>
          {novo && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ gridColumn: "1 / -1" }}><label style={lbl}>Descrição *</label><input style={ctrl} value={novo.descricao} onChange={(e) => setNovo({ ...novo, descricao: e.target.value })} /></div>
              <div><label style={lbl}>Categoria</label>
                <select style={ctrl} value={novo.categoria} onChange={(e) => setNovo({ ...novo, categoria: e.target.value })}>
                  <option value="reclamacao">reclamação</option><option value="assistencia">assistência</option><option value="rateio">rateio</option><option value="outro">outro</option>
                </select>
              </div>
              <div><label style={lbl}>Valor (R$)</label><input style={ctrl} type="number" value={novo.valor} onChange={(e) => setNovo({ ...novo, valor: e.target.value })} /></div>
              <label style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                <input type="checkbox" checked={novo.participa} onChange={(e) => setNovo({ ...novo, participa: e.target.checked })} style={{ width: 16, height: 16, accentColor: "var(--v6-primary)" }} /> Participa da margem
              </label>
            </div>
          )}
          <DialogFooter>
            <button className="v6-btn" style={{ background: "var(--v6-card)", color: "var(--v6-fg)", border: "1px solid var(--v6-border)" }} onClick={() => setNovo(null)} disabled={busy}>Cancelar</button>
            <button className="v6-btn v6-btn-primary" onClick={adicionar} disabled={busy}>{busy ? "Salvando..." : "Adicionar"}</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
