"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search, Building2, User, MapPin, Briefcase } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { listarClientes } from "@/lib/data/clientes";
import type { Cliente } from "@/lib/types";

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    listarClientes()
      .then((data) => { setClientes(data); setErro(""); })
      .catch((e) => { setClientes([]); setErro(e?.message || "Falha de conexão com o banco de dados."); })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return clientes;
    return clientes.filter(
      (c) =>
        c.nome.toLowerCase().includes(q) ||
        c.documento.includes(q) ||
        c.telefone.includes(q),
    );
  }, [clientes, query]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes"
        description="Cadastro de clientes, obras e endereços."
      >
        <Button asChild className="gap-1.5">
          <Link href="/clientes/novo">
            <Plus className="h-4 w-4" />
            Novo cliente
          </Link>
        </Button>
      </PageHeader>

      {erro && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {erro} — verifique a conexão. Os dados não são exibidos para não mostrar informação desatualizada.
        </div>
      )}

      <Card>
        <CardContent className="p-0">
          <div className="border-b p-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por nome, documento ou telefone..."
                className="pl-9"
              />
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Cliente</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Cidade</TableHead>
                <TableHead className="pr-6 text-right">Obras</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    Carregando clientes...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    Nenhum cliente encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
                          {c.tipo === "PJ" ? (
                            <Building2 className="h-4 w-4" />
                          ) : (
                            <User className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{c.nome}</p>
                          <Badge variant="muted" className="mt-0.5">
                            {c.tipo === "PJ" ? "Pessoa Jurídica" : "Pessoa Física"}
                          </Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.documento}
                    </TableCell>
                    <TableCell>
                      <p className="text-foreground">{c.telefone}</p>
                      {c.email && (
                        <p className="text-xs text-muted-foreground">{c.email}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />
                        {c.endereco.cidade}/{c.endereco.uf}
                      </span>
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      <span className="inline-flex items-center gap-1.5 font-medium">
                        <Briefcase className="h-3.5 w-3.5 text-muted-foreground" />
                        {c.obras.length}
                      </span>
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
