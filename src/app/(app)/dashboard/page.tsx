"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Percent, FileText, Tag, Clock, HardHat, Landmark, Plus } from "lucide-react";
import { getDashboard, type DashboardData } from "@/lib/data/dashboard-actions";
import { listLojasSel, type Opt } from "@/lib/data/vendas-core";
import { formatCurrency } from "@/lib/format";
import { labelSituacao } from "@/lib/commercial/situacao";

type Periodo = "hoje" | "semana" | "mes" | "ano";
const PERIODOS: { v: Periodo; l: string }[] = [
  { v: "hoje", l: "Hoje" }, { v: "semana", l: "Semana" }, { v: "mes", l: "Mês" }, { v: "ano", l: "Ano" },
];

export default function DashboardPage() {
  const [d, setD] = useState<DashboardData | null>(null);
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const [lojas, setLojas] = useState<Opt[]>([]);
  const [lojaId, setLojaId] = useState("");

  const carregar = useCallback((p: Periodo, loja: string) => { getDashboard(p, loja || undefined).then(setD).catch(() => setD(null)); }, []);
  useEffect(() => { carregar(periodo, lojaId); }, [carregar, periodo, lojaId]);
  useEffect(() => { listLojasSel().then(setLojas).catch(() => {}); }, []);

  const maxEvol = useMemo(() => Math.max(1, ...((d?.evolucao || []).map((e) => e.valor))), [d]);
  const metaPct = d && d.meta > 0 ? Math.min(100, Math.round((d.realizado / d.meta) * 100)) : 0;

  const kpis = d ? [
    { ic: <Percent size={20} />, lb: "Faturamento", vl: formatCurrency(d.faturamento), hn: "no período" },
    { ic: <Tag size={20} />, lb: "Vendas", vl: String(d.vendas), hn: "confirmadas" },
    { ic: <FileText size={20} />, lb: "Ticket médio", vl: formatCurrency(d.ticketMedio), hn: `${d.vendas} vendas` },
    { ic: <Clock size={20} />, lb: "Orç. em aberto", vl: String(d.orcAberto), hn: "aguardando" },
    { ic: <HardHat size={20} />, lb: "Obras em execução", vl: String(d.obrasExec), hn: "produção/execução" },
    { ic: <Landmark size={20} />, lb: "A receber", vl: formatCurrency(d.aReceber), hn: "saldo em aberto" },
  ] : [];

  return (
    <div>
      {/* cabeçalho + filtros (V6) */}
      <div className="v6-cols" style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div className="v6-page-title">Visão geral</div>
            <div className="v6-page-desc">Acompanhe vendas, obras, financeiro e operação.</div>
          </div>
          <Link href="/orcamentos/novo" className="v6-btn v6-btn-primary" style={{ marginLeft: "auto" }}><Plus /> Novo orçamento</Link>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap", alignItems: "center" }}>
          {PERIODOS.map((p) => (
            <button key={p.v} className={`v6-chip${periodo === p.v ? " active" : ""}`} onClick={() => setPeriodo(p.v)}>{p.l}</button>
          ))}
          {lojas.length > 0 && (
            <select className="v6-inp" style={{ height: 34, width: "auto", marginLeft: 4 }} value={lojaId} onChange={(e) => setLojaId(e.target.value)}>
              <option value="">Todas as lojas</option>
              {lojas.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* Resumo (callout V6) */}
      {d && (
        <div className="v6-card" style={{ background: "var(--v6-primary-soft)", borderColor: "#c7d6f7", padding: "14px 18px", marginBottom: 16, display: "flex", gap: 12, alignItems: "center" }}>
          <div className="v6-ic" style={{ width: 32, height: 32 }}><Percent size={16} /></div>
          <div style={{ fontSize: 13.5 }}>
            <b>Resumo</b> — {d.vendas > 0
              ? <>Faturamento de <b>{formatCurrency(d.faturamento)}</b> em {d.vendas} venda(s) no período.</>
              : <>Sem vendas confirmadas no período.</>} Acompanhe os orçamentos em aberto ({d.orcAberto}).
          </div>
        </div>
      )}

      {/* KPIs — 3 colunas (2×3), igual à V6 */}
      <div className="v6-grid" style={{ gridTemplateColumns: "repeat(3,minmax(0,1fr))" }}>
        {kpis.map((k, i) => (
          <div key={i} className="v6-card v6-stat">
            <div className="v6-ic">{k.ic}</div>
            <div>
              <div className="v6-lb">{k.lb}</div>
              <div className="v6-vl">{k.vl}</div>
              <div className="v6-hn">{k.hn}</div>
            </div>
          </div>
        ))}
      </div>

      {/* evolução + meta */}
      <div className="v6-grid" style={{ gridTemplateColumns: "2fr 1fr", marginTop: 16 }}>
        <div className="v6-card">
          <div className="v6-card-h"><div className="v6-card-title">Evolução do faturamento</div><div className="v6-card-desc">Últimos 6 meses</div></div>
          <div className="v6-card-b">
            <div className="v6-chart">
              {(d?.evolucao || []).map((e, i) => (
                <div key={i} className={`v6-col${i === (d!.evolucao.length - 1) ? " on" : ""}`}>
                  <div className="v6-colbar" style={{ height: `${Math.max(3, (e.valor / maxEvol) * 140)}px` }} />
                  <div className="v6-lbl">{e.mes}</div>
                </div>
              ))}
              {(!d || d.evolucao.length === 0) && <div className="v6-lbl">Sem dados no período.</div>}
            </div>
          </div>
        </div>
        <div className="v6-card">
          <div className="v6-card-h"><div className="v6-card-title">Meta do mês</div></div>
          <div className="v6-card-b">
            <div style={{ fontSize: 34, fontWeight: 800 }}>{metaPct}%</div>
            <div className="v6-card-desc">da meta atingida</div>
            <div className="v6-bar" style={{ margin: "12px 0" }}><i style={{ width: `${metaPct}%` }} /></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}><span className="v6-lb">Meta</span><b>{formatCurrency(d?.meta || 0)}</b></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginTop: 4 }}><span className="v6-lb">Realizado</span><b>{formatCurrency(d?.realizado || 0)}</b></div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginTop: 4 }}><span className="v6-lb">Faltam</span><b>{formatCurrency(Math.max(0, (d?.meta || 0) - (d?.realizado || 0)))}</b></div>
          </div>
        </div>
      </div>

      {/* vendas recentes + melhores vendedores + funil */}
      <div className="v6-grid" style={{ gridTemplateColumns: "2fr 1fr", marginTop: 16 }}>
        <div className="v6-card">
          <div className="v6-card-h"><div className="v6-card-title">Vendas recentes</div></div>
          <div className="v6-card-b">
            <table className="v6-tbl">
              <thead><tr><th>Nº</th><th>Cliente</th><th>Status</th><th style={{ textAlign: "right" }}>Total</th></tr></thead>
              <tbody>
                {(d?.vendasRecentes || []).map((v) => (
                  <tr key={v.id}>
                    <td><Link href={`/orcamentos/${v.id}`} style={{ color: "var(--v6-primary)", fontWeight: 600 }}>#{v.numero ?? "—"}</Link></td>
                    <td>{v.cliente}</td>
                    <td>{labelSituacao(v.situacao)}</td>
                    <td style={{ textAlign: "right", fontWeight: 600 }}>{formatCurrency(v.total)}</td>
                  </tr>
                ))}
                {(!d || d.vendasRecentes.length === 0) && <tr><td colSpan={4} style={{ color: "var(--v6-muted)", padding: 16, textAlign: "center" }}>Sem vendas ainda.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
        <div className="v6-cols" style={{ gap: 16 }}>
          <div className="v6-card">
            <div className="v6-card-h"><div className="v6-card-title">Melhores vendedores</div></div>
            <div className="v6-card-b">
              {(d?.melhoresVendedores || []).map((v, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "6px 0", borderBottom: "1px solid #eef2f7" }}>
                  <span>{v.nome}</span><b>{formatCurrency(v.total)}</b>
                </div>
              ))}
              {(!d || d.melhoresVendedores.length === 0) && <div className="v6-lb">Sem dados.</div>}
            </div>
          </div>
          <div className="v6-card">
            <div className="v6-card-h"><div className="v6-card-title">Funil de orçamentos</div></div>
            <div className="v6-card-b v6-cols" style={{ gap: 10 }}>
              {(d?.funil || []).map((f) => {
                const max = Math.max(1, ...(d!.funil.map((x) => x.n)));
                return (
                  <div key={f.chave}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}><span className="v6-lb">{f.label}</span><b>{f.n}</b></div>
                    <div className="v6-bar" style={{ marginTop: 4 }}><i style={{ width: `${(f.n / max) * 100}%` }} /></div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
