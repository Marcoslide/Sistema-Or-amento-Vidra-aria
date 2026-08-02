"use client";

import { useCallback, useEffect, useState } from "react";
import { formatCurrency } from "@/lib/format";
import { getPontoEquilibrio, type PEData } from "@/lib/data/analise-actions";
import { listLojasSel, type Opt } from "@/lib/data/vendas-core";

const selCtrl: React.CSSProperties = {
  height: 38, border: "1px solid var(--v6-border)", borderRadius: 9,
  padding: "0 11px", background: "var(--v6-card)", fontSize: 13, color: "var(--v6-fg)", outline: "none",
};

export default function PontoEquilibrioPage() {
  const [data, setData] = useState<PEData | null>(null);
  const [lojas, setLojas] = useState<Opt[]>([]);
  const [loja, setLoja] = useState("");
  const [erro, setErro] = useState("");

  const carregar = useCallback((storeId: string) => {
    getPontoEquilibrio(storeId || undefined).then((r) => {
      if (!r.ok) { setErro(r.error || "Falha."); setData(null); return; }
      setData(r.data || null); setErro("");
    });
  }, []);
  useEffect(() => { listLojasSel().then(setLojas).catch(() => {}); }, []);
  useEffect(() => { carregar(loja); }, [carregar, loja]);

  const pctBar = data ? Math.max(0, Math.min(100, data.percentualAtingido)) : 0;
  // escala do gráfico comparativo (vendida x equilíbrio) — barras proporcionais ao maior valor
  const maxVal = data ? Math.max(1, data.receitaVendida, data.receitaEquilibrio) : 1;
  const hVendida = data ? Math.max(3, (data.receitaVendida / maxVal) * 150) : 3;
  const hEquil = data ? Math.max(3, (data.receitaEquilibrio / maxVal) * 150) : 3;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <div>
          <div className="v6-page-title">Ponto de Equilíbrio</div>
          <div className="v6-page-desc">Quanto faturar para cobrir os custos fixos.</div>
        </div>
        <select style={{ ...selCtrl, marginLeft: "auto" }} value={loja} onChange={(e) => setLoja(e.target.value)}>
          <option value="">Consolidado</option>
          {lojas.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
        </select>
      </div>

      {erro && <div className="v6-card" style={{ padding: 12, marginBottom: 12, borderColor: "#fca5a5", background: "#fef2f2", color: "#b91c1c" }}>{erro}</div>}

      {data && (
        <>
          <div className="v6-grid" style={{ gridTemplateColumns: "repeat(4,1fr)" }}>
            <div className="v6-card v6-stat"><div><div className="v6-lb">Receita vendida</div><div className="v6-vl">{formatCurrency(data.receitaVendida)}</div></div></div>
            <div className="v6-card v6-stat"><div><div className="v6-lb">Receita recebida</div><div className="v6-vl" style={{ color: "#16a34a" }}>{formatCurrency(data.receitaRecebida)}</div></div></div>
            <div className="v6-card v6-stat"><div><div className="v6-lb">Custos fixos</div><div className="v6-vl">{formatCurrency(data.custosFixos)}</div></div></div>
            <div className="v6-card v6-stat"><div><div className="v6-lb">Margem contribuição</div><div className="v6-vl">{data.margemPct.toFixed(1)}%</div></div></div>
          </div>

          <div className="v6-grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 16 }}>
            {/* progresso do ponto de equilíbrio */}
            <div className="v6-card">
              <div className="v6-card-h"><div className="v6-card-title">Situação atual</div><div className="v6-card-desc">Progresso rumo ao ponto de equilíbrio</div></div>
              <div className="v6-card-b">
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", justifyContent: "space-between", gap: 16 }}>
                  <div>
                    <div className="v6-lb">Ponto de equilíbrio (receita)</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: "var(--v6-primary)" }}>{formatCurrency(data.receitaEquilibrio)}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="v6-lb">{data.positivo ? "Excedente" : "Falta faturar"}</div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: data.positivo ? "#16a34a" : "#dc2626" }}>
                      {formatCurrency(data.positivo ? data.excedeu : data.falta)}
                    </div>
                  </div>
                </div>
                <div style={{ marginTop: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--v6-muted)", marginBottom: 6 }}>
                    <span>{data.percentualAtingido.toFixed(0)}% do ponto de equilíbrio</span>
                    <span>{formatCurrency(data.receitaVendida)} / {formatCurrency(data.receitaEquilibrio)}</span>
                  </div>
                  <div className="v6-bar" style={{ height: 12 }}>
                    <i style={{ width: `${pctBar}%`, background: data.positivo ? "#16a34a" : "#f59e0b" }} />
                  </div>
                </div>
                <p style={{ marginTop: 16, fontSize: 13, fontWeight: 600, color: data.positivo ? "#16a34a" : "#dc2626" }}>
                  {data.positivo ? "Situação positiva: a receita cobre os custos fixos." : "Situação negativa: ainda não cobre os custos fixos."}
                </p>
              </div>
            </div>

            {/* gráfico comparativo: vendida x equilíbrio */}
            <div className="v6-card">
              <div className="v6-card-h"><div className="v6-card-title">Receita vendida x equilíbrio</div><div className="v6-card-desc">Comparativo visual</div></div>
              <div className="v6-card-b">
                <div className="v6-chart" style={{ height: 170, gap: 40, justifyContent: "center" }}>
                  <div className="v6-col on" style={{ maxWidth: 90 }}>
                    <div className="v6-colbar" style={{ height: `${hVendida}px` }} />
                    <div className="v6-lbl">Vendida</div>
                    <div style={{ fontSize: 11.5, fontWeight: 700 }}>{formatCurrency(data.receitaVendida)}</div>
                  </div>
                  <div className="v6-col" style={{ maxWidth: 90 }}>
                    <div className="v6-colbar" style={{ height: `${hEquil}px`, background: data.positivo ? "#86efac" : "#fcd34d" }} />
                    <div className="v6-lbl">Equilíbrio</div>
                    <div style={{ fontSize: 11.5, fontWeight: 700 }}>{formatCurrency(data.receitaEquilibrio)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
