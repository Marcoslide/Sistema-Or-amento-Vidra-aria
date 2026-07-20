"use client";

import { Building2, Palette, SlidersHorizontal, Save } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";

export default function ConfiguracoesPage() {
  const { toast } = useToast();
  const salvar = () =>
    toast({
      variant: "success",
      title: "Configurações salvas",
      description: "Suas preferências foram atualizadas (simulado).",
    });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configurações"
        description="Dados da empresa e preferências do sistema."
      />

      <Tabs defaultValue="empresa">
        <TabsList>
          <TabsTrigger value="empresa" className="gap-1.5">
            <Building2 className="h-4 w-4" />
            Empresa
          </TabsTrigger>
          <TabsTrigger value="orcamento" className="gap-1.5">
            <SlidersHorizontal className="h-4 w-4" />
            Orçamento
          </TabsTrigger>
          <TabsTrigger value="aparencia" className="gap-1.5">
            <Palette className="h-4 w-4" />
            Aparência
          </TabsTrigger>
        </TabsList>

        <TabsContent value="empresa">
          <Card>
            <CardHeader>
              <CardTitle>Dados da empresa</CardTitle>
              <CardDescription>
                Aparecem no cabeçalho dos orçamentos em PDF.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="empresa">Nome / Razão social</Label>
                <Input
                  id="empresa"
                  defaultValue="VidroGestor Vidraçaria & Esquadrias"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input id="cnpj" defaultValue="12.345.678/0001-90" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tel">Telefone</Label>
                <Input id="tel" defaultValue="(11) 3000-1000" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="end">Endereço</Label>
                <Input
                  id="end"
                  defaultValue="Rua das Indústrias, 450 — São Paulo/SP"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orcamento">
          <Card>
            <CardHeader>
              <CardTitle>Preferências de orçamento</CardTitle>
              <CardDescription>Padrões aplicados a novos orçamentos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="validade">Validade padrão (dias)</Label>
                  <Input id="validade" type="number" defaultValue={15} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="desc">Desconto máximo geral (%)</Label>
                  <Input id="desc" type="number" defaultValue={15} />
                </div>
              </div>
              <div className="space-y-3 pt-2">
                {[
                  {
                    t: "Exigir obra no orçamento",
                    d: "Bloqueia a geração sem uma obra vinculada.",
                    on: false,
                  },
                  {
                    t: "Mostrar medidas no PDF",
                    d: "Exibe largura × altura de cada item no documento.",
                    on: true,
                  },
                  {
                    t: "Numeração automática",
                    d: "O sistema gera o número sequencial do orçamento.",
                    on: true,
                  },
                ].map((item) => (
                  <div
                    key={item.t}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div>
                      <p className="text-sm font-medium">{item.t}</p>
                      <p className="text-xs text-muted-foreground">{item.d}</p>
                    </div>
                    <Switch defaultChecked={item.on} />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="aparencia">
          <Card>
            <CardHeader>
              <CardTitle>Aparência</CardTitle>
              <CardDescription>Identidade visual do sistema.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Cor principal</Label>
                <div className="flex gap-2">
                  {[
                    "hsl(221 83% 45%)",
                    "hsl(160 84% 39%)",
                    "hsl(262 83% 58%)",
                    "hsl(199 89% 48%)",
                    "hsl(0 72% 51%)",
                  ].map((c, i) => (
                    <button
                      key={c}
                      className="h-9 w-9 rounded-full ring-offset-2 transition-all hover:scale-110 data-[active=true]:ring-2 data-[active=true]:ring-primary"
                      data-active={i === 0}
                      style={{ background: c }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="text-sm font-medium">Modo compacto</p>
                  <p className="text-xs text-muted-foreground">
                    Reduz espaçamentos para telas menores.
                  </p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button className="gap-1.5" onClick={salvar}>
          <Save className="h-4 w-4" />
          Salvar alterações
        </Button>
      </div>
    </div>
  );
}
