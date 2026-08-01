// Situação comercial da venda (ciclo). Rótulos e variantes de badge centralizados.
export type Situacao =
  | "ORCAMENTO" | "VENDA_CONFIRMADA" | "PRODUCAO" | "EXECUCAO" | "FINALIZADA" | "CANCELADO";

export const SITUACAO_LABEL: Record<string, string> = {
  ORCAMENTO: "Orçamento",
  VENDA_CONFIRMADA: "Venda confirmada",
  PRODUCAO: "Em produção",
  EXECUCAO: "Em execução",
  FINALIZADA: "Finalizada",
  CANCELADO: "Cancelada",
};

export const SITUACAO_VARIANT: Record<string, "default" | "secondary" | "success" | "warning" | "destructive" | "muted"> = {
  ORCAMENTO: "muted",
  VENDA_CONFIRMADA: "default",
  PRODUCAO: "warning",
  EXECUCAO: "warning",
  FINALIZADA: "success",
  CANCELADO: "destructive",
};

// Próximos passos permitidos no ciclo (avanço comercial após virar venda).
export const SITUACAO_PROXIMAS: Record<string, string[]> = {
  VENDA_CONFIRMADA: ["PRODUCAO", "CANCELADO"],
  PRODUCAO: ["EXECUCAO", "CANCELADO"],
  EXECUCAO: ["FINALIZADA", "CANCELADO"],
};

export const labelSituacao = (s?: string | null) => (s && SITUACAO_LABEL[s]) || s || "—";
export const variantSituacao = (s?: string | null) => (s && SITUACAO_VARIANT[s]) || "muted";
