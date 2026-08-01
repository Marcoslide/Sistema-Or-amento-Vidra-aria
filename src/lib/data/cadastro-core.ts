"use client";

import { createClient } from "@/lib/supabase/client";
import { ConnectionError } from "@/lib/data/mode";

// Leituras dos cadastros (RLS-scoped). Erro NUNCA vira mock: propaga ConnectionError.

export async function listRows<T = Record<string, unknown>>(
  table: string,
  select: string,
  order: string = "nome"
): Promise<T[]> {
  const s = createClient();
  const { data, error } = await s.from(table).select(select).order(order);
  if (error) throw new ConnectionError(`Não foi possível carregar (${table}): ${error.message}`);
  return (data || []) as unknown as T[];
}

// Lista somente ativos — usado para popular selects (lojas/contas ativas etc.).
export async function listAtivos(
  table: string,
  select: string = "id,nome"
): Promise<Array<{ id: string; nome: string }>> {
  const s = createClient();
  const { data, error } = await s.from(table).select(select).eq("ativo", true).order("nome");
  if (error) throw new ConnectionError(error.message);
  return (data || []) as unknown as Array<{ id: string; nome: string }>;
}
