"use client";

import { useEffect, useState } from "react";
import { Plus, Landmark, Wallet, Building } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { contaService } from "@/data/services";
import type { ContaRecebimento } from "@/lib/types";

const TIPO_LABEL: Record<ContaRecebimento["tipo"], string> = {
  BANCO: "Banco",
  CAIXA: "Caixa",
  CARTEIRA_DIGITAL: "Carteira digital",
};

export default function ContasPage() {
  const [contas, setContas] = useState<ContaRecebimento[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    contaService.listar().then(setContas);
  }, []);

  const icon = (tipo: ContaRecebimento["tipo"]) =>
    tipo === "CAIXA" ? Wallet : tipo === "BANCO" ? Building : Landmark;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Contas de Recebimento"
        description="Contas usadas para receber os pagamentos da empresa."
      >
        <Button
          className="gap-1.5"
          onClick={() =>
            toast({
              variant: "info",
              title: "Nova conta",
              description: "Formulário disponível na versão completa.",
            })
          }
        >
          <Plus className="h-4 w-4" />
          Nova conta
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {contas.map((c) => {
          const Icon = icon(c.tipo);
          return (
            <Card key={c.id}>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{c.nome}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {TIPO_LABEL[c.tipo]}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {c.ativo ? (
                  <Badge variant="success">Ativa</Badge>
                ) : (
                  <Badge variant="muted">Inativa</Badge>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
