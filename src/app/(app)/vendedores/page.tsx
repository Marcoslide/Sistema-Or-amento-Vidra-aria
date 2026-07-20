"use client";

import { useEffect, useState } from "react";
import { Plus, UserCog, Percent } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/toast";
import { vendedorService } from "@/data/services";
import type { Vendedor } from "@/lib/types";

const iniciais = (nome: string) =>
  nome
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

export default function VendedoresPage() {
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    vendedorService.listar().then((data) => {
      setVendedores(data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vendedores"
        description="Cada vendedor acessa apenas as próprias vendas. Defina o desconto máximo por vendedor."
      >
        <Button
          className="gap-1.5"
          onClick={() =>
            toast({
              variant: "info",
              title: "Cadastro de vendedor",
              description: "Formulário disponível na versão completa.",
            })
          }
        >
          <Plus className="h-4 w-4" />
          Novo vendedor
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Vendedor</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Desconto máx.</TableHead>
                <TableHead className="pr-6 text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : (
                vendedores.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>{iniciais(v.nome)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-foreground">{v.nome}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-foreground">{v.email}</p>
                      <p className="text-xs text-muted-foreground">{v.telefone}</p>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 font-medium">
                        <Percent className="h-3.5 w-3.5 text-muted-foreground" />
                        {v.descontoMaximo}%
                      </span>
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      {v.ativo ? (
                        <Badge variant="success">Ativo</Badge>
                      ) : (
                        <Badge variant="muted">Inativo</Badge>
                      )}
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
