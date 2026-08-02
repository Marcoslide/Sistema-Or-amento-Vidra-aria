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
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { criarCliente } from "@/lib/data/clientes";

export default function NovoClientePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [tipo, setTipo] = useState("PF");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (salvando) return; // anti clique-duplo
    setErro("");
    const fd = new FormData(e.currentTarget);
    const nome = String(fd.get("nome") || "").trim();
    if (!nome) { setErro("Informe o nome do cliente."); return; }

    setSalvando(true);
    try {
      await criarCliente({
        nome,
        doc: String(fd.get("documento") || "").trim() || undefined,
        tel: String(fd.get("telefone") || "").trim() || undefined,
        email: String(fd.get("email") || "").trim() || undefined,
        cep: String(fd.get("cep") || "").trim() || undefined,
        logradouro: String(fd.get("logradouro") || "").trim() || undefined,
        numero: String(fd.get("numero") || "").trim() || undefined,
        complemento: String(fd.get("complemento") || "").trim() || undefined,
        bairro: String(fd.get("bairro") || "").trim() || undefined,
        cidade: String(fd.get("cidade") || "").trim() || undefined,
        uf: String(fd.get("uf") || "").trim().toUpperCase() || undefined,
      });
      toast({ variant: "success", title: "Cliente cadastrado", description: `${nome} foi salvo.` });
      router.push("/clientes");
      router.refresh();
    } catch (err) {
      const msg = (err as Error).message || "Falha ao salvar o cliente.";
      setErro(msg);
      toast({ variant: "warning", title: "Erro ao salvar", description: msg });
    } finally {
      setSalvando(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center gap-3">
        <Button asChild variant="ghost" size="icon">
          <Link href="/clientes"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <PageHeader title="Novo cliente" description="Preencha os dados do cliente e, se desejar, uma obra." />
      </div>

      {erro && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">{erro}</div>
      )}

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
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PF">Pessoa Física</SelectItem>
                    <SelectItem value="PJ">Pessoa Jurídica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="documento">{tipo === "PJ" ? "CNPJ" : "CPF"}</Label>
                <Input id="documento" name="documento" placeholder={tipo === "PJ" ? "00.000.000/0000-00" : "000.000.000-00"} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="nome">{tipo === "PJ" ? "Razão social" : "Nome completo"}</Label>
                <Input id="nome" name="nome" placeholder="Nome do cliente" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone</Label>
                <Input id="telefone" name="telefone" placeholder="(00) 00000-0000" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" name="email" type="email" placeholder="cliente@email.com" />
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
                <Input id="cep" name="cep" placeholder="00000-000" />
              </div>
              <div className="space-y-2 sm:col-span-4">
                <Label htmlFor="logradouro">Logradouro</Label>
                <Input id="logradouro" name="logradouro" placeholder="Rua / Avenida" />
              </div>
              <div className="space-y-2 sm:col-span-1">
                <Label htmlFor="numero">Número</Label>
                <Input id="numero" name="numero" placeholder="Nº" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="complemento">Complemento</Label>
                <Input id="complemento" name="complemento" placeholder="Apto, bloco..." />
              </div>
              <div className="space-y-2 sm:col-span-3">
                <Label htmlFor="bairro">Bairro</Label>
                <Input id="bairro" name="bairro" placeholder="Bairro" />
              </div>
              <div className="space-y-2 sm:col-span-4">
                <Label htmlFor="cidade">Cidade</Label>
                <Input id="cidade" name="cidade" placeholder="Cidade" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="uf">UF</Label>
                <Input id="uf" name="uf" placeholder="SP" maxLength={2} />
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
              <Textarea name="obs" placeholder="Ex.: cliente indicado por..., preferências, histórico..." rows={5} />
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2">
            <Button type="submit" className="w-full gap-1.5" disabled={salvando}>
              <Save className="h-4 w-4" />
              {salvando ? "Salvando..." : "Salvar cliente"}
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
