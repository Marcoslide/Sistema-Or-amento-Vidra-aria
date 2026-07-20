"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  Printer,
  Check,
  User,
  MapPin,
  Layers,
  Pencil,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { orcamentoService } from "@/data/services";
import { totalPagamentos } from "@/lib/calculations";
import { formatCurrency, formatDate, formatNumber } from "@/lib/format";
import {
  FORMA_PAGAMENTO_LABEL,
  STATUS_ORCAMENTO_LABEL,
  type Orcamento,
  type StatusOrcamento,
} from "@/lib/types";
import { cn } from "@/lib/utils";

const FLUXO: StatusOrcamento[] = [
  "ORCAMENTO",
  "APROVADO",
  "EM_PRODUCAO",
  "EXECUTANDO",
  "FINALIZADO",
];

export default function OrcamentoDetalhePage() {
  const params = useParams<{ id: string }>();
  const { toast } = useToast();
  const [orc, setOrc] = useState<Orcamento | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    orcamentoService.obter(params.id).then((data) => {
      setOrc(data);
      setLoading(false);
    });
  }, [params.id]);

  if (loading) {
    return <p className="text-muted-foreground">Carregando orçamento...</p>;
  }
  if (!orc) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">Orçamento não encontrado.</p>
        <Button asChild variant="outline">
          <Link href="/orcamentos">Voltar</Link>
        </Button>
      </div>
    );
  }

  const pago = totalPagamentos(orc);
  const saldo = orc.total - pago;
  const etapaAtual = FLUXO.indexOf(orc.status);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon">
            <Link href="/orcamentos">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">
                Orçamento #{orc.numero}
              </h1>
              <StatusBadge status={orc.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              Criado em {formatDate(orc.criadoEm)} • {orc.vendedorNome}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" className="gap-1.5">
            <Link href={`/orcamentos/${orc.id}/pdf`}>
              <Printer className="h-4 w-4" />
              Ver PDF
            </Link>
          </Button>
          <Button
            className="gap-1.5"
            onClick={() =>
              toast({
                variant: "success",
                title: "Status avançado",
                description: "A obra avançou de etapa (simulado).",
              })
            }
          >
            <Check className="h-4 w-4" />
            Avançar etapa
          </Button>
        </div>
      </div>

      {/* Linha do tempo do fluxo */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {FLUXO.map((etapa, i) => {
              const done = etapaAtual >= 0 && i <= etapaAtual;
              const current = i === etapaAtual;
              return (
                <div
                  key={etapa}
                  className="flex flex-1 items-center gap-3 sm:flex-col sm:gap-2 sm:text-center"
                >
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold",
                      done
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground",
                      current && "ring-4 ring-primary/15",
                    )}
                  >
                    {done ? <Check className="h-4 w-4" /> : i + 1}
                  </div>
                  <span
                    className={cn(
                      "text-xs font-medium",
                      done ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {STATUS_ORCAMENTO_LABEL[etapa]}
                  </span>
                </div>
              );
            })}
          </div>
          {["RETORNO", "RECLAMACAO", "CANCELADO"].includes(orc.status) && (
            <div className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              Este orçamento está marcado como{" "}
              <strong>{STATUS_ORCAMENTO_LABEL[orc.status]}</strong>.
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Ambientes e itens */}
          {orc.ambientes.map((amb) => (
            <Card key={amb.id}>
              <CardHeader className="flex-row items-center gap-2 space-y-0">
                <Layers className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">{amb.nome}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {amb.itens.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-4 rounded-lg border p-3"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-foreground">
                        {item.produtoNome}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {item.medidas
                          .map(
                            (m) =>
                              `${m.quantidade}× ${formatNumber(m.largura)}×${formatNumber(
                                m.altura,
                              )}m`,
                          )
                          .join("  •  ")}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatNumber(item.quantidadeTotal)}{" "}
                        {item.unidade === "M2"
                          ? "m²"
                          : item.unidade === "UNIDADE"
                            ? "un"
                            : "m"}{" "}
                        × {formatCurrency(item.precoUnitario)}
                      </p>
                    </div>
                    <p className="shrink-0 font-semibold">
                      {formatCurrency(item.total)}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}

          {/* Pagamentos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pagamentos</CardTitle>
              <CardDescription>Formas e condições registradas.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {orc.pagamentos.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nenhum pagamento registrado.
                </p>
              ) : (
                orc.pagamentos.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-medium text-foreground">
                        {FORMA_PAGAMENTO_LABEL[p.forma]}
                        {p.parcelas > 1 && ` — ${p.parcelas}x`}
                      </p>
                      {p.observacao && (
                        <p className="text-xs text-muted-foreground">
                          {p.observacao}
                        </p>
                      )}
                    </div>
                    <p className="font-semibold">{formatCurrency(p.valor)}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Coluna lateral: cliente + resumo */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cliente & Obra</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <User className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium text-foreground">{orc.clienteNome}</p>
                </div>
              </div>
              {orc.obraNome && (
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <p className="text-muted-foreground">{orc.obraNome}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Resumo financeiro</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(orc.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">
                  Desconto ({formatNumber(orc.descontoPercentual, 0)}%)
                </span>
                <span className="text-destructive">
                  − {formatCurrency(orc.descontoValor)}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between text-base font-semibold">
                <span>Total</span>
                <span>{formatCurrency(orc.total)}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pago</span>
                <span className="text-success">{formatCurrency(pago)}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span className="text-muted-foreground">Saldo</span>
                <span>{formatCurrency(saldo)}</span>
              </div>
            </CardContent>
          </Card>

          {orc.observacoes && (
            <Card className="bg-muted/40">
              <CardContent className="p-5 text-sm">
                <p className="mb-1 font-medium text-foreground">Observações</p>
                <p className="text-muted-foreground">{orc.observacoes}</p>
              </CardContent>
            </Card>
          )}

          <Button asChild variant="outline" className="w-full gap-1.5">
            <Link href="/orcamentos/novo">
              <Pencil className="h-4 w-4" />
              Editar orçamento
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
