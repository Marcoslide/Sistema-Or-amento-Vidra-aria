"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { useToast } from "@/components/ui/toast";

export default function NovoClientePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [tipo, setTipo] = useState("PF");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    toast({
      variant: "success",
      title: "Cliente cadastrado",
      description: "O cliente foi salvo com sucesso (simulado).",
    });
    router.push("/clientes");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/clientes">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <PageHeader
          title="Novo cliente"
          description="Preencha os dados do cliente e, se desejar, uma obra."
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Dados do cliente</CardTitle>
              <CardDescription>Informações principais de contato.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Tipo de pessoa</Label>
                <Select value={tipo} onValueChange={setTipo}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PF">Pessoa Física</SelectItem>
                    <SelectItem value="PJ">Pessoa Jurídica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="documento">
                  {tipo === "PJ" ? "CNPJ" : "CPF"}
                </Label>
                <Input
                  id="documento"
                  placeholder={tipo === "PJ" ? "00.000.000/0000-00" : "000.000.000-00"}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="nome">
                  {tipo === "PJ" ? "Razão social" : "Nome completo"}
                </Label>
                <Input id="nome" placeholder="Nome do cliente" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input id="telefone" placeholder="(00) 00000-0000" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" type="email" placeholder="cliente@email.com" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Endereço</CardTitle>
              <CardDescription>Endereço principal / de cobrança.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-6">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="cep">CEP</Label>
                <Input id="cep" placeholder="00000-000" />
              </div>
              <div className="space-y-2 sm:col-span-4">
                <Label htmlFor="logradouro">Logradouro</Label>
                <Input id="logradouro" placeholder="Rua / Avenida" />
              </div>
              <div className="space-y-2 sm:col-span-1">
                <Label htmlFor="numero">Número</Label>
                <Input id="numero" placeholder="Nº" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="complemento">Complemento</Label>
                <Input id="complemento" placeholder="Apto, bloco..." />
              </div>
              <div className="space-y-2 sm:col-span-3">
                <Label htmlFor="bairro">Bairro</Label>
                <Input id="bairro" placeholder="Bairro" />
              </div>
              <div className="space-y-2 sm:col-span-4">
                <Label htmlFor="cidade">Cidade</Label>
                <Input id="cidade" placeholder="Cidade" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="uf">UF</Label>
                <Input id="uf" placeholder="SP" maxLength={2} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Observações</CardTitle>
              <CardDescription>Anotações internas sobre o cliente.</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Ex.: cliente indicado por..., preferências, histórico..."
                rows={5}
              />
            </CardContent>
          </Card>

          <Card className="bg-muted/40">
            <CardContent className="space-y-3 p-5 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Dica</p>
              <p>
                Você poderá adicionar obras a este cliente depois de salvá-lo, ou
                diretamente ao criar um orçamento.
              </p>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2">
            <Button type="submit" className="w-full gap-1.5">
              <Save className="h-4 w-4" />
              Salvar cliente
            </Button>
            <Button asChild type="button" variant="outline" className="w-full">
              <Link href="/clientes">Cancelar</Link>
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
