"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search, Package } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { produtoService } from "@/data/services";
import { formatCurrency } from "@/lib/format";
import {
  CATEGORIA_PRODUTO_LABEL,
  UNIDADE_CALCULO_LABEL,
  type CategoriaProduto,
  type Produto,
} from "@/lib/types";

export default function ProdutosPage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [categoria, setCategoria] = useState<string>("TODAS");

  useEffect(() => {
    produtoService.listar().then((data) => {
      setProdutos(data);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return produtos.filter((p) => {
      const matchQ = !q || p.nome.toLowerCase().includes(q);
      const matchCat = categoria === "TODAS" || p.categoria === categoria;
      return matchQ && matchCat;
    });
  }, [produtos, query, categoria]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Produtos"
        description="Catálogo de produtos e serviços com regra de cálculo."
      >
        <Button asChild className="gap-1.5">
          <Link href="/produtos/novo">
            <Plus className="h-4 w-4" />
            Novo produto
          </Link>
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="p-0">
          <div className="flex flex-col gap-3 border-b p-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar produto..."
                className="pl-9"
              />
            </div>
            <Select value={categoria} onValueChange={setCategoria}>
              <SelectTrigger className="sm:w-56">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODAS">Todas as categorias</SelectItem>
                {(
                  Object.keys(CATEGORIA_PRODUTO_LABEL) as CategoriaProduto[]
                ).map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {CATEGORIA_PRODUTO_LABEL[cat]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Produto</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Cálculo</TableHead>
                <TableHead>Especificação</TableHead>
                <TableHead className="text-right">Preço base</TableHead>
                <TableHead className="pr-6 text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    Carregando produtos...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                    Nenhum produto encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="pl-6">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Package className="h-4 w-4" />
                        </div>
                        <span className="font-medium text-foreground">{p.nome}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {CATEGORIA_PRODUTO_LABEL[p.categoria]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {UNIDADE_CALCULO_LABEL[p.unidade]}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {[p.espessura, p.cor].filter(Boolean).join(" • ") || "—"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(p.precoBase)}
                    </TableCell>
                    <TableCell className="pr-6 text-right">
                      {p.ativo ? (
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
