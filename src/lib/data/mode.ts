import { hasSupabaseEnv } from "@/lib/supabase/env";

// Modo de dados:
//  - "supabase": há variáveis de ambiente → SEMPRE usar o banco. Falha = erro de conexão (nunca mock).
//  - "mock": não há variáveis → modo de desenvolvimento declarado (dados fictícios).
export function dataMode(): "supabase" | "mock" {
  return hasSupabaseEnv() ? "supabase" : "mock";
}
export const isMock = () => dataMode() === "mock";

// Erro de conexão/consulta ao banco — a UI deve exibir isto, jamais silenciar com mock.
export class ConnectionError extends Error {
  constructor(message = "Falha de conexão com o banco de dados.") {
    super(message);
    this.name = "ConnectionError";
  }
}
