// Situação comercial da venda (ciclo). Rótulos e variantes de badge centralizados.
export type Situacao =
  | "ORCAMENTO" | "VENDA_CONFIRMADA" | "PRODUCAO" | "PRONTO_EXECUCAO" | "EXECUCAO" | "FINALIZADA" | "CANCELADO";

export const SITUACAO_LABEL: Record<string, string> = {
  ORCAMENTO: "Orçamento",
  VENDA_CONFIRMADA: "Venda confirmada",
  PRODUCAO: "Em produção",
  PRONTO_EXECUCAO: "Pronto para execução",
  EXECUCAO: "Em execução",
  FINALIZADA: "Finalizada",
  CANCELADO: "Cancelada",
};

export const SITUACAO_VARIANT: Record<string, "default" | "secondary" | "success" | "warning" | "destructive" | "muted"> = {
  ORCAMENTO: "muted",
  VENDA_CONFIRMADA: "default",
  PRODUCAO: "warning",
  PRONTO_EXECUCAO: "default",
  EXECUCAO: "warning",
  FINALIZADA: "success",
  CANCELADO: "destructive",
};

// Próximos passos permitidos no ciclo (avanço comercial manual após virar venda).
// IMPORTANTE: a passagem PRODUÇÃO → PRONTO_EXECUCAO NÃO é manual — só ocorre via
// conclusão da produção (fn_concluir_producao), que valida etapas e terceirizações.
// Por isso PRODUCAO não oferece avanço manual para PRONTO_EXECUCAO (apenas cancelar).
export const SITUACAO_PROXIMAS: Record<string, string[]> = {
  VENDA_CONFIRMADA: ["PRODUCAO", "CANCELADO"],
  PRODUCAO: ["CANCELADO"],
  PRONTO_EXECUCAO: ["EXECUCAO", "CANCELADO"],
  EXECUCAO: ["FINALIZADA", "CANCELADO"],
};

export const labelSituacao = (s?: string | null) => (s && SITUACAO_LABEL[s]) || s || "—";
export const variantSituacao = (s?: string | null) => (s && SITUACAO_VARIANT[s]) || "muted";
