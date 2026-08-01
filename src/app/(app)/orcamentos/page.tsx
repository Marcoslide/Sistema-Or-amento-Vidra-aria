"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search, FileText, MoreHorizontal, Copy, Pencil, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate } from "@/lib/format";
import { listVendas, type VendaRow } from "@/lib/data/vendas-core";
import { duplicarOrcamento, excluirOuCancelarVenda } from "@/lib/data/vendas-actions";
import { labelSituacao, variantSituacao } from "@/lib/commercial/situacao";

const FILTROS: Array<{ value: string; label: string }> = [
  { value: "TODOS", label: "Todos" },
  { value: "ORCAMENTO", label: "Orçamentos" },
  { value: "VENDA_CONFIRMADA", label: "Vendas" },
  { value: "PRODUCAO", label: "Produção" },
  { value: "EXECUCAO", label: "Execução" },
  { value: "FINALIZADA", label: "Finalizadas" },
  { value: "CANCELADO", label: "Canceladas" },
];

export default function VendasPage() {
  const [rows, setRows] = useState<VendaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [msg, setMsg] = useState("");
  const [query, setQuery] = useState("");
  const [filtro, setFiltro] = useState("TODOS");

  const carregar = useCallback(() => {
    setLoading(true);
    listVendas()
      .then((d) => { setRows(d); setErro(""); })
      .catch((e) => { setRows([]); setErro((e as Error).message); })
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((o) => {
      const matchQ = !q || (o.cliente_nome || "").toLowerCase().includes(q) || String(o.numero ?? "").includes(q) || (o.vend_nome || "").toLowerCase().includes(q);
      const matchF = filtro === "TODOS" || o.situacao === filtro;
      return matchQ && matchF;
    });
  }, [rows, query, filtro]);

  async function duplicar(id: string) {
    setMsg(""); setErro("");
    const res = await duplicarOrcamento(id);
    if (res.ok) { setMsg("Orçamento duplicado."); carregar(); }
    else setErro(res.error || "Falha ao duplicar.");
  }

  async function excluir(o: VendaRow) {
    setMsg(""); setErro("");
    const alvo = o.venda_gerada ? "Cancelar esta venda? (não será apagada — preserva histórico)" : "Excluir este orçamento?";
    if (!confirm(alvo)) return;
    const res = await excluirOuCancelarVenda(o.id);
    if (res.ok) { setMsg(res.blocked ? "Venda cancelada (preservada no histórico)." : "Orçamento excluído."); carregar(); }
    else setErro(res.error || "Falha na operação.");
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Vendas" description="Do orçamento à finalização — um único fluxo comercial.">
        <Button asChild className="gap-1.5">
          <Link href="/orcamentos/novo"><Plus className="h-4 w-4" /> Novo orçamento</Link>
        </Button>
      </PageHeader>

      {erro && <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">{erro}</div>}
      {msg && <div className="rounded-lg border border-emerald-400/40 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{msg}</div>}

      <div className="flex flex-wrap gap-2">
        {FILTROS.map((f) => {
          const count = f.value === "TODOS" ? rows.length : rows.filter((o) => o.situacao === f.value).length;
          return (
            <button key={f.value} onClick={() => setFiltro(f.value)}
              className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                filtro === f.value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground hover:bg-accent")}>
              {f.label}
              <span className={cn("rounded-full px-1.5 text-xs", filtro === f.value ? "bg-white/20" : "bg-muted")}>{count}</span>
            </button>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="border-b p-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por número, cliente ou vendedor..." className="pl-9" />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Nº</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead>Situação</TableHead>
                <TableHead>Criado</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="pr-6" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="py-10 text-center text-muted-foreground">Carregando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-16 text-center">
                    <FileText className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
                    <p className="text-muted-foreground">Nenhum registro encontrado.</p>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="pl-6">
                      <Link href={`/orcamentos/${o.id}`} className="font-semibold text-primary hover:underline">#{o.numero ?? "—"}</Link>
                    </TableCell>
                    <TableCell><p className="font-medium text-foreground">{o.cliente_nome || "—"}</p></TableCell>
                    <TableCell className="text-muted-foreground">{o.vend_nome || "—"}</TableCell>
                    <TableCell><Badge variant={variantSituacao(o.situacao)}>{labelSituacao(o.situacao)}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{o.created_at ? formatDate(o.created_at) : "—"}</TableCell>
                    <TableCell className="text-right font-semibold">{formatCurrency(o.total)}</TableCell>
                    <TableCell className="pr-6 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild><Link href={`/orcamentos/${o.id}`}><Pencil className="mr-2 h-4 w-4" /> Abrir</Link></DropdownMenuItem>
                          <DropdownMenuItem onClick={() => duplicar(o.id)}><Copy className="mr-2 h-4 w-4" /> Duplicar</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive" onClick={() => excluir(o)}>
                            <Trash2 className="mr-2 h-4 w-4" /> {o.venda_gerada ? "Cancelar venda" : "Excluir"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
