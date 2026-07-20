"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search, FileText } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { orcamentoService } from "@/data/services";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  STATUS_ORCAMENTO_LABEL,
  type Orcamento,
  type StatusOrcamento,
} from "@/lib/types";

const FILTROS: Array<{ value: StatusOrcamento | "TODOS"; label: string }> = [
  { value: "TODOS", label: "Todos" },
  { value: "ORCAMENTO", label: "Orçamento" },
  { value: "APROVADO", label: "Aprovado" },
  { value: "EM_PRODUCAO", label: "Em Produção" },
  { value: "EXECUTANDO", label: "Executando" },
  { value: "FINALIZADO", label: "Finalizado" },
  { value: "RECLAMACAO", label: "Reclamação" },
];

export default function OrcamentosPage() {
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filtro, setFiltro] = useState<StatusOrcamento | "TODOS">("TODOS");

  useEffect(() => {
    orcamentoService.listar().then((data) => {
      setOrcamentos(data);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orcamentos.filter((o) => {
      const matchQ =
        !q ||
        o.clienteNome.toLowerCase().includes(q) ||
        String(o.numero).includes(q) ||
        (o.obraNome?.toLowerCase().includes(q) ?? false);
      const matchF = filtro === "TODOS" || o.status === filtro;
      return matchQ && matchF;
    });
  }, [orcamentos, query, filtro]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orçamentos"
        description="Todo o ciclo, do orçamento à conclusão da obra."
      >
        <Button asChild className="gap-1.5">
          <Link href="/orcamentos/novo">
            <Plus className="h-4 w-4" />
            Novo orçamento
          </Link>
        </Button>
      </PageHeader>

      <div className="flex flex-wrap gap-2">
        {FILTROS.map((f) => {
          const count =
            f.value === "TODOS"
              ? orcamentos.length
              : orcamentos.filter((o) => o.status === f.value).length;
          return (
            <button
              key={f.value}
              onClick={() => setFiltro(f.value)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
                filtro === f.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-accent",
              )}
            >
              {f.label}
              <span
                className={cn(
                  "rounded-full px-1.5 text-xs",
                  filtro === f.value ? "bg-white/20" : "bg-muted",
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="border-b p-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por número, cliente ou obra..."
                className="pl-9"
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Nº</TableHead>
                <TableHead>Cliente / Obra</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criado</TableHead>
                <TableHead className="pr-6 text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    Carregando orçamentos...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-16 text-center">
                    <FileText className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
                    <p className="text-muted-foreground">
                      Nenhum orçamento encontrado.
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="pl-6">
                      <Link
                        href={`/orcamentos/${o.id}`}
                        className="font-semibold text-primary hover:underline"
                      >
                        #{o.numero}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <p className="font-medium text-foreground">{o.clienteNome}</p>
                      {o.obraNome && (
                        <p className="text-xs text-muted-foreground">{o.obraNome}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {o.vendedorNome}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={o.status} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(o.criadoEm)}
                    </TableCell>
                    <TableCell className="pr-6 text-right font-semibold">
                      {formatCurrency(o.total)}
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
