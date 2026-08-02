"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/format";
import { getCaixaData, type CaixaRow } from "@/lib/data/financeiro-actions";
import { listLojasSel, type Opt } from "@/lib/data/vendas-core";

export default function CaixaPage() {
  const [movs, setMovs] = useState<CaixaRow[]>([]);
  const [tot, setTot] = useState({ entradas: 0, saidas: 0, saldo: 0 });
  const [lojas, setLojas] = useState<Opt[]>([]);
  const [loja, setLoja] = useState("");
  const [erro, setErro] = useState("");

  const carregar = useCallback((storeId: string) => {
    getCaixaData(storeId || undefined).then((r) => {
      if (!r.ok) { setErro(r.error || "Falha."); setMovs([]); return; }
      setMovs(r.movimentos || []); setTot({ entradas: r.entradas || 0, saidas: r.saidas || 0, saldo: r.saldo || 0 }); setErro("");
    });
  }, []);
  useEffect(() => { listLojasSel().then(setLojas).catch(() => {}); }, []);
  useEffect(() => { carregar(loja); }, [carregar, loja]);

  return (
    <div className="space-y-6">
      <PageHeader title="Caixa" description="Entradas e saídas por loja (recebimentos, pagamentos e estornos).">
        <select className="h-10 rounded-md border bg-background px-3 text-sm" value={loja} onChange={(e) => setLoja(e.target.value)}>
          <option value="">Todas as lojas</option>
          {lojas.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
        </select>
      </PageHeader>
      {erro && <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">{erro}</div>}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">Entradas</p><p className="text-2xl font-bold text-emerald-600">{formatCurrency(tot.entradas)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">Saídas</p><p className="text-2xl font-bold text-destructive">{formatCurrency(tot.saidas)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-xs text-muted-foreground">Saldo</p><p className={`text-2xl font-bold ${tot.saldo >= 0 ? "text-primary" : "text-destructive"}`}>{formatCurrency(tot.saldo)}</p></CardContent></Card>
      </div>

      <Card><CardContent className="p-0">
        <div className="overflow-x-auto"><Table className="min-w-[640px]">
          <TableHeader><TableRow>
            <TableHead className="pl-6">Data</TableHead><TableHead>Descrição</TableHead><TableHead>Origem</TableHead>
            <TableHead>Tipo</TableHead><TableHead className="pr-6 text-right">Valor</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {movs.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">Nenhum movimento.</TableCell></TableRow>
            ) : movs.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="pl-6 text-muted-foreground">{m.data ? formatDate(m.data) : "—"}</TableCell>
                <TableCell>{m.descricao || "—"}</TableCell>
                <TableCell className="text-muted-foreground">{m.origem_tipo || "—"}</TableCell>
                <TableCell>
                  {m.tipo === "entrada"
                    ? <Badge variant="success" className="gap-1"><ArrowDownCircle className="h-3 w-3" /> Entrada</Badge>
                    : <Badge variant="destructive" className="gap-1"><ArrowUpCircle className="h-3 w-3" /> Saída</Badge>}
                </TableCell>
                <TableCell className={`pr-6 text-right font-semibold ${m.tipo === "entrada" ? "text-emerald-600" : "text-destructive"}`}>
                  {m.tipo === "entrada" ? "+" : "-"}{formatCurrency(m.valor)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table></div>
      </CardContent></Card>
    </div>
  );
}
