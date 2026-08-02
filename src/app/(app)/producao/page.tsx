"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Search, Factory } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/format";
import { getProducaoData, getDashboardProducao, type OPRow, type DashProducao } from "@/lib/data/producao-actions";

const PRIOR_VAR: Record<string, "muted" | "warning" | "destructive" | "default"> = { baixa: "muted", normal: "default", alta: "warning", urgente: "destructive" };
const STATUS_VAR: Record<string, "muted" | "warning" | "success"> = { AGUARDANDO: "muted", EM_PRODUCAO: "warning", CONCLUIDA: "success" };
const FILTROS = [
  { v: "TODAS", l: "Todas" }, { v: "AGUARDANDO", l: "Aguardando" }, { v: "EM_PRODUCAO", l: "Em andamento" },
  { v: "ATRASADAS", l: "Atrasadas" }, { v: "CONCLUIDA", l: "Concluídas" },
];

export default function ProducaoPage() {
  const [ordens, setOrdens] = useState<OPRow[]>([]);
  const [dash, setDash] = useState<DashProducao | null>(null);
  const [erro, setErro] = useState(""); const [q, setQ] = useState(""); const [filtro, setFiltro] = useState("TODAS");

  const carregar = useCallback(() => {
    getProducaoData().then((r) => { if (!r.ok) { setErro(r.error || "Falha."); return; } setOrdens(r.ordens || []); setErro(""); });
    getDashboardProducao().then((r) => { if (r.ok) setDash(r.data || null); });
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  const hoje = new Date().toISOString().slice(0, 10);
  const lista = useMemo(() => {
    const s = q.trim().toLowerCase();
    return ordens.filter((o) => {
      const mq = !s || (o.cliente_nome || "").toLowerCase().includes(s) || String(o.numero ?? "").includes(s);
      const atrasada = o.status !== "CONCLUIDA" && o.prazo && o.prazo < hoje;
      const mf = filtro === "TODAS" || (filtro === "ATRASADAS" ? atrasada : o.status === filtro);
      return mq && mf;
    });
  }, [ordens, q, filtro, hoje]);

  return (
    <div className="space-y-6">
      <PageHeader title="Produção" description="Ordens de produção, fila e acompanhamento." />
      {erro && <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">{erro}</div>}

      {dash && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Aguardando</p><p className="text-2xl font-bold">{dash.aguardando}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Em andamento</p><p className="text-2xl font-bold text-amber-600">{dash.emAndamento}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Atrasadas</p><p className="text-2xl font-bold text-destructive">{dash.atrasadas}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Concluídas</p><p className="text-2xl font-bold text-emerald-600">{dash.concluidas}</p></CardContent></Card>
          <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Terc. pendentes</p><p className="text-2xl font-bold">{dash.tercPendentes}</p></CardContent></Card>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <button key={f.v} onClick={() => setFiltro(f.v)}
            className={cn("rounded-full border px-3 py-1.5 text-sm font-medium transition-colors", filtro === f.v ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground hover:bg-accent")}>
            {f.l}
          </button>
        ))}
      </div>

      <Card><CardContent className="p-0">
        <div className="border-b p-4"><div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar OP ou cliente..." className="pl-9" /></div></div>
        <div className="overflow-x-auto"><Table className="min-w-[720px]">
          <TableHeader><TableRow>
            <TableHead className="pl-6">OP</TableHead><TableHead>Cliente</TableHead><TableHead>Prioridade</TableHead>
            <TableHead>Prazo</TableHead><TableHead>Progresso</TableHead><TableHead className="pr-6">Status</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {lista.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="py-16 text-center"><Factory className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" /><p className="text-muted-foreground">Nenhuma ordem de produção.</p></TableCell></TableRow>
            ) : lista.map((o) => (
              <TableRow key={o.id}>
                <TableCell className="pl-6"><Link href={`/producao/${o.id}`} className="font-semibold text-primary hover:underline">#{o.numero ?? "—"}</Link></TableCell>
                <TableCell>{o.cliente_nome || "—"}</TableCell>
                <TableCell><Badge variant={PRIOR_VAR[o.prioridade] || "default"}>{o.prioridade}</Badge></TableCell>
                <TableCell className="text-muted-foreground">{o.prazo ? formatDate(o.prazo) : "—"}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${o.pct}%` }} /></div>
                    <span className="text-xs text-muted-foreground">{o.pct}%</span>
                  </div>
                </TableCell>
                <TableCell className="pr-6"><Badge variant={STATUS_VAR[o.status] || "muted"}>{o.status.replace("_", " ")}</Badge></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table></div>
      </CardContent></Card>
    </div>
  );
}
