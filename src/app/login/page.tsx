"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { GalleryVerticalEnd, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function LoginPage() {
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    router.push("/dashboard");
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Painel visual */}
      <div className="relative hidden overflow-hidden bg-sidebar lg:block">
        <div
          className="absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--sidebar-foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--sidebar-foreground)) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="relative flex h-full flex-col justify-between p-12 text-sidebar-foreground">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <GalleryVerticalEnd className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-semibold">VidroGestor</span>
          </div>

          <div className="max-w-md space-y-4">
            <h1 className="text-3xl font-semibold leading-tight">
              Do orçamento à obra, tudo em um só lugar.
            </h1>
            <p className="text-sidebar-foreground/70">
              Especializado em vidraçarias e esquadrias. Monte orçamentos em
              minutos, acompanhe cada etapa e transmita profissionalismo.
            </p>
          </div>

          <div className="flex gap-8 text-sm">
            <div>
              <p className="text-2xl font-semibold text-white">6</p>
              <p className="text-sidebar-foreground/60">Orçamentos ativos</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-white">5 min</p>
              <p className="text-sidebar-foreground/60">Para orçar</p>
            </div>
            <div>
              <p className="text-2xl font-semibold text-white">100%</p>
              <p className="text-sidebar-foreground/60">Do seu segmento</p>
            </div>
          </div>
        </div>
      </div>

      {/* Formulário */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm space-y-8">
          <div className="space-y-2 lg:hidden">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <GalleryVerticalEnd className="h-5 w-5 text-primary-foreground" />
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight">
              Acessar o sistema
            </h2>
            <p className="text-sm text-muted-foreground">
              Entre com suas credenciais para continuar.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="voce@vidraria.com"
                defaultValue="carla@vidraria.com"
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="senha">Senha</Label>
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                >
                  Esqueci minha senha
                </button>
              </div>
              <Input
                id="senha"
                type="password"
                placeholder="••••••••"
                defaultValue="demo1234"
              />
            </div>

            <Button type="submit" className="w-full gap-1.5">
              Entrar
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            Protótipo de validação — qualquer credencial acessa o sistema.{" "}
            <Link href="/dashboard" className="text-primary hover:underline">
              Pular login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
