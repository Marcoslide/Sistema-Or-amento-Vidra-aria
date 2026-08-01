"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GalleryVerticalEnd, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseEnv } from "@/lib/supabase/env";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    if (!hasSupabaseEnv()) {
      setErro("Supabase não está configurado neste ambiente. Configure as variáveis de ambiente para entrar.");
      return;
    }
    setCarregando(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    setCarregando(false);
    if (error) {
      setErro("E-mail ou senha inválidos.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
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
              Especializado em vidraçarias e esquadrias — Conceito Glass.
            </p>
          </div>

          <span className="text-xs text-sidebar-foreground/50">Ambiente de homologação (staging)</span>
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
            <h2 className="text-2xl font-semibold tracking-tight">Acessar o sistema</h2>
            <p className="text-sm text-muted-foreground">Entre com suas credenciais para continuar.</p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" required placeholder="voce@empresa.com"
                value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="senha">Senha</Label>
              <Input id="senha" type="password" required placeholder="••••••••"
                value={senha} onChange={(e) => setSenha(e.target.value)} />
            </div>

            {erro && <p className="text-sm text-destructive">{erro}</p>}

            <Button type="submit" className="w-full gap-1.5" disabled={carregando}>
              {carregando ? "Entrando…" : "Entrar"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            Autenticação real via Supabase. Sem sessão, o acesso é redirecionado para o login.
          </p>
        </div>
      </div>
    </div>
  );
}
