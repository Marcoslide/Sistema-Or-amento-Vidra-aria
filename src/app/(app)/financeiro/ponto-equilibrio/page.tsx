"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { getPontoEquilibrio, type PEData } from "@/lib/data/analise-actions";
import { listLojasSel, type Opt } from "@/lib/data/vendas-core";

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

  return (
    <div className="space-y-6">
      <PageHeader title="Ponto de Equilíbrio" description="Quanto faturar para cobrir os custos fixos.">
        <select className="h-10 rounded-md border bg-background px-3 text-sm" value={loja} onChange={(e) => setLoja(e.target.value)}>
          <option value="">Consolidado</option>
          {lojas.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
        </select>
      </PageHeader>
      {erro && <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">{erro}</div>}

      {data && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">Receita vendida</p><p className="text-xl font-bold">{formatCurrency(data.receitaVendida)}</p></CardContent></Card>
            <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">Receita recebida</p><p className="text-xl font-bold text-emerald-600">{formatCurrency(data.receitaRecebida)}</p></CardContent></Card>
            <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">Custos fixos</p><p className="text-xl font-bold">{formatCurrency(data.custosFixos)}</p></CardContent></Card>
            <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">Margem contribuição</p><p className="text-xl font-bold">{data.margemPct.toFixed(1)}%</p></CardContent></Card>
          </div>

          <Card><CardContent className="space-y-4 p-6">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Ponto de equilíbrio (receita)</p>
                <p className="text-3xl font-bold text-primary">{formatCurrency(data.receitaEquilibrio)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">{data.positivo ? "Excedente" : "Falta faturar"}</p>
                <p className={`text-2xl font-bold ${data.positivo ? "text-emerald-600" : "text-destructive"}`}>
                  {formatCurrency(data.positivo ? data.excedeu : data.falta)}
                </p>
              </div>
            </div>
            <div>
              <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                <span>{data.percentualAtingido.toFixed(0)}% do ponto de equilíbrio</span>
                <span>{formatCurrency(data.receitaVendida)} / {formatCurrency(data.receitaEquilibrio)}</span>
              </div>
              <div className="h-4 w-full overflow-hidden rounded-full bg-muted">
                <div className={`h-full rounded-full transition-all ${data.positivo ? "bg-emerald-500" : "bg-amber-500"}`} style={{ width: `${pctBar}%` }} />
              </div>
            </div>
            <p className={`text-sm font-medium ${data.positivo ? "text-emerald-600" : "text-destructive"}`}>
              {data.positivo ? "Situação positiva: a receita cobre os custos fixos." : "Situação negativa: ainda não cobre os custos fixos."}
            </p>
          </CardContent></Card>
        </>
      )}
    </div>
  );
}
