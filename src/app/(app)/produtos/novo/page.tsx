"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import {
  CATEGORIA_PRODUTO_LABEL,
  UNIDADE_CALCULO_LABEL,
  type CategoriaProduto,
  type UnidadeCalculo,
} from "@/lib/types";

const UNIDADE_HINT: Record<UnidadeCalculo, string> = {
  M2: "Preço multiplicado por largura × altura × quantidade.",
  UNIDADE: "Preço multiplicado apenas pela quantidade de peças.",
  METRO_LINEAR: "Preço multiplicado pelo comprimento (largura) × quantidade.",
  PERIMETRO: "Preço multiplicado pela soma dos lados (2L + 2A) × quantidade.",
};

export default function NovoProdutoPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [unidade, setUnidade] = useState<UnidadeCalculo>("M2");
  const [ativo, setAtivo] = useState(true);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    toast({
      variant: "success",
      title: "Produto cadastrado",
      description: "O produto foi salvo com sucesso (simulado).",
    });
    router.push("/produtos");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/produtos">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <PageHeader
          title="Novo produto"
          description="Defina o produto e sua regra de cálculo de preço."
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Identificação</CardTitle>
              <CardDescription>Nome, categoria e especificações.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="nome">Nome do produto</Label>
                <Input
                  id="nome"
                  placeholder="Ex.: Vidro temperado incolor 8mm"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select defaultValue="VIDRO">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="espessura">Espessura</Label>
                  <Input id="espessura" placeholder="Ex.: 8mm" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cor">Cor</Label>
                  <Input id="cor" placeholder="Ex.: Incolor" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Precificação</CardTitle>
              <CardDescription>
                A regra de cálculo determina como o preço é aplicado no orçamento.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Regra de cálculo</Label>
                <Select
                  value={unidade}
                  onValueChange={(v) => setUnidade(v as UnidadeCalculo)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(
                      Object.keys(UNIDADE_CALCULO_LABEL) as UnidadeCalculo[]
                    ).map((u) => (
                      <SelectItem key={u} value={u}>
                        {UNIDADE_CALCULO_LABEL[u]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="preco">Preço base (R$)</Label>
                <Input
                  id="preco"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  required
                />
              </div>
              <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground sm:col-span-2">
                {UNIDADE_HINT[unidade]}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Disponibilidade</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="text-sm font-medium">Produto ativo</p>
                  <p className="text-xs text-muted-foreground">
                    Disponível para novos orçamentos.
                  </p>
                </div>
                <Switch checked={ativo} onCheckedChange={setAtivo} />
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2">
            <Button type="submit" className="w-full gap-1.5">
              <Save className="h-4 w-4" />
              Salvar produto
            </Button>
            <Button asChild type="button" variant="outline" className="w-full">
              <Link href="/produtos">Cancelar</Link>
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
