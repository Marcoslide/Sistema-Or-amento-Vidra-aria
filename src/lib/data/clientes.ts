"use client";

import { createClient } from "@/lib/supabase/client";
import { isMock, ConnectionError } from "@/lib/data/mode";
import { clienteService } from "@/data/services";
import type { Cliente } from "@/lib/types";

// Linha da tabela `customers` (Supabase) mapeada para o shape de exibição do app.
type CustomerRow = {
  id: string; nome: string; doc: string | null; email: string | null;
  tel: string | null; cidade: string | null; uf: string | null; ativo: boolean;
};

function rowToCliente(r: CustomerRow): Cliente {
  return {
    id: r.id,
    tipo: (r.doc && r.doc.replace(/\D/g, "").length > 11 ? "PJ" : "PF") as Cliente["tipo"],
    nome: r.nome,
    documento: r.doc || "",
    email: r.email || undefined,
    telefone: r.tel || "",
    endereco: { cep: "", logradouro: "", numero: "", bairro: "", cidade: r.cidade || "", uf: r.uf || "" } as Cliente["endereco"],
    obras: [],
    criadoEm: "",
  };
}

// Lista clientes. Em modo Supabase, erro NÃO cai em mock: propaga ConnectionError.
// Mock só em modo dev declarado (sem variáveis de ambiente).
export async function listarClientes(): Promise<Cliente[]> {
  if (isMock()) return clienteService.listar();
  const supabase = createClient();
  const { data, error } = await supabase
    .from("customers")
    .select("id,nome,doc,email,tel,cidade,uf,ativo")
    .eq("ativo", true)
    .order("nome");
  if (error) throw new ConnectionError("Não foi possível carregar os clientes: " + error.message);
  return (data as CustomerRow[]).map(rowToCliente);
}

async function minhaOrganizacao(): Promise<string | null> {
  const supabase = createClient();
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) return null;
  const { data } = await supabase.from("profiles").select("organization_id").eq("id", uid).single();
  return (data?.organization_id as string) || null;
}

// Cria cliente (organização vem do perfil do usuário logado; RLS garante o isolamento).
export async function criarCliente(input: { nome: string; doc?: string; email?: string; tel?: string; cidade?: string; uf?: string; storeId?: string }) {
  const supabase = createClient();
  const org = await minhaOrganizacao();
  if (!org) throw new ConnectionError("Usuário sem organização vinculada.");
  const { error } = await supabase.from("customers").insert({
    organization_id: org,
    store_id: input.storeId || null,
    nome: input.nome, doc: input.doc || null, email: input.email || null,
    tel: input.tel || null, cidade: input.cidade || null, uf: input.uf || null,
  });
  if (error) throw new ConnectionError("Não foi possível salvar o cliente: " + error.message);
}
