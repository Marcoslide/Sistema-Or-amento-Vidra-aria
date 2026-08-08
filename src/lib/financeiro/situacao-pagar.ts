// Situação de uma conta a pagar — fonte única para filtro/exibição. Puro e testável.
export type SituacaoPagar = "aberta" | "vencida" | "vence_hoje" | "paga" | "parcial" | "cancelada";

export function situacaoConta(c: { saldo: number; pago: number; vencimento: string | null; cancelada: boolean }, hojeIso?: string): SituacaoPagar {
  if (c.cancelada) return "cancelada";
  if (c.saldo <= 0) return "paga";
  if (c.pago > 0) return "parcial";
  const hoje = hojeIso || new Date().toISOString().slice(0, 10);
  if (c.vencimento && c.vencimento < hoje) return "vencida";
  if (c.vencimento === hoje) return "vence_hoje";
  return "aberta";
}
