import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./env";

// Cliente admin (service role) — SOMENTE no servidor, para operações de auth (convidar/criar/excluir usuário).
// Nunca expõe a chave ao cliente. Ausência da chave desabilita a criação de usuários (mensagem clara).
export function hasServiceRole(): boolean {
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY && SUPABASE_URL);
}

export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  return createClient(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
