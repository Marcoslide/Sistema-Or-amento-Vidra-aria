"use client";

import { useEffect, useState } from "react";
import { Plus, CreditCard } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { contaService, operadoraService } from "@/data/services";
import { formatNumber } from "@/lib/format";
import type { ContaRecebimento, Operadora } from "@/lib/types";

export default function OperadorasPage() {
  const [operadoras, setOperadoras] = useState<Operadora[]>([]);
  const [contas, setContas] = useState<ContaRecebimento[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    operadoraService.listar().then(setOperadoras);
    contaService.listar().then(setContas);
  }, []);

  const contaNome = (id: string) =>
    contas.find((c) => c.id === id)?.nome ?? "—";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Operadoras de Cartão"
        description="Parcelamentos, taxas e conta de recebimento de cada operadora."
      >
        <Button
          className="gap-1.5"
          onClick={() =>
            toast({
              variant: "info",
              title: "Nova operadora",
              description: "Formulário disponível na versão completa.",
            })
          }
        >
          <Plus className="h-4 w-4" />
          Nova operadora
        </Button>
      </PageHeader>

      <div className="grid gap-6 md:grid-cols-2">
        {operadoras.map((op) => (
          <Card key={op.id}>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base">{op.nome}</CardTitle>
                  <CardDescription>
                    Recebe em: {contaNome(op.contaRecebimentoId)}
                  </CardDescription>
                </div>
              </div>
              {op.ativo ? (
                <Badge variant="success">Ativa</Badge>
              ) : (
                <Badge variant="muted">Inativa</Badge>
              )}
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-lg border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/40 text-[11px] uppercase tracking-wide text-muted-foreground">
                      <th className="px-3 py-2 text-left font-medium">Parcelas</th>
                      <th className="px-3 py-2 text-right font-medium">Taxa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {op.parcelamentos.map((p) => (
                      <tr key={p.parcelas} className="border-b last:border-0">
                        <td className="px-3 py-2">
                          {p.parcelas}x {p.parcelas === 1 && "(à vista)"}
                        </td>
                        <td className="px-3 py-2 text-right font-medium">
                          {formatNumber(p.taxa)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
