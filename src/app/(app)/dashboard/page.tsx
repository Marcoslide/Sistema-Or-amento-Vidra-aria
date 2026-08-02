"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText,
  CheckCircle2,
  Factory,
  DollarSign,
  ArrowUpRight,
  Plus,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { orcamentoService } from "@/data/services";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  STATUS_ORCAMENTO_LABEL,
  type Orcamento,
  type StatusOrcamento,
} from "@/lib/types";

const PIPELINE: StatusOrcamento[] = [
  "ORCAMENTO",
  "APROVADO",
  "EM_PRODUCAO",
  "EXECUTANDO",
  "FINALIZADO",
];

export default function DashboardPage() {
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    orcamentoService.listar().then((data) => {
      setOrcamentos(data);
      setLoading(false);
    });
  }, []);

  const emAberto = orcamentos.filter((o) =>
    ["ORCAMENTO", "APROVADO"].includes(o.status),
  );
  const emProducao = orcamentos.filter((o) =>
    ["EM_PRODUCAO", "EXECUTANDO"].includes(o.status),
  );
  const aprovadosValor = orcamentos
    .filter((o) => o.status !== "ORCAMENTO" && o.status !== "CANCELADO")
    .reduce((acc, o) => acc + o.total, 0);

  const countByStatus = (s: StatusOrcamento) =>
    orcamentos.filter((o) => o.status === s).length;
  const maxCount = Math.max(1, ...PIPELINE.map(countByStatus));

  const recentes = [...orcamentos]
    .sort(
      (a, b) =>
        new Date(b.atualizadoEm).getTime() - new Date(a.atualizadoEm).getTime(),
    )
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Aviso: o Dashboard ainda não lê do banco de homologação (dados de demonstração). */}
      <div className="flex items-start gap-3 rounded-lg border border-amber-400/50 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        <span className="mt-0.5 rounded bg-amber-200 px-1.5 py-0.5 text-[11px] font-bold uppercase tracking-wide">Demonstração</span>
        <p>
          <strong>Dados de demonstração.</strong> Este painel ainda não está conectado ao banco de
          homologação — os números abaixo são fictícios. Os módulos de Cadastros e Comercial já usam dados reais.
        </p>
      </div>

      <PageHeader
        title="Dashboard"
        description="Visão geral do seu fluxo de orçamentos e obras."
      >
        <Button asChild className="gap-1.5">
          <Link href="/orcamentos/novo">
            <Plus className="h-4 w-4" />
            Novo orçamento
          </Link>
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Orçamentos em aberto"
          value={loading ? "—" : String(emAberto.length)}
          hint="Aguardando aprovação"
          icon={FileText}
        />
        <StatCard
          label="Aprovados no mês"
          value={loading ? "—" : String(countByStatus("APROVADO"))}
          hint="Prontos para produção"
          icon={CheckCircle2}
          tone="success"
        />
        <StatCard
          label="Em produção / obra"
          value={loading ? "—" : String(emProducao.length)}
          hint="Em andamento"
          icon={Factory}
          tone="warning"
        />
        <StatCard
          label="Carteira aprovada"
          value={loading ? "—" : formatCurrency(aprovadosValor)}
          hint="Valor total"
          icon={DollarSign}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Funil do fluxo */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Fluxo de obras</CardTitle>
            <CardDescription>
              Distribuição dos orçamentos por etapa.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {PIPELINE.map((status) => {
              const count = countByStatus(status);
              return (
                <div key={status} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">
                      {STATUS_ORCAMENTO_LABEL[status]}
                    </span>
                    <span className="text-muted-foreground">{count}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${(count / maxCount) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Orçamentos recentes */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div className="space-y-1.5">
              <CardTitle>Movimentações recentes</CardTitle>
              <CardDescription>Últimas atualizações de status.</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm" className="gap-1">
              <Link href="/orcamentos">
                Ver todos <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Nº</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="pr-6 text-right">Atualizado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentes.map((o) => (
                  <TableRow key={o.id} className="cursor-pointer">
                    <TableCell className="pl-6">
                      <Link
                        href={`/orcamentos/${o.id}`}
                        className="font-medium text-primary hover:underline"
                      >
                        #{o.numero}
                      </Link>
                    </TableCell>
                    <TableCell className="max-w-[180px] truncate">
                      {o.clienteNome}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={o.status} />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(o.total)}
                    </TableCell>
                    <TableCell className="pr-6 text-right text-muted-foreground">
                      {formatDate(o.atualizadoEm)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
