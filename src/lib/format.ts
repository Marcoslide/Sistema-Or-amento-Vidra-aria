/**
 * Formatação centralizada (moeda, número, data, medidas).
 * Mantida isolada para que toda a UI use as mesmas regras de exibição.
 */

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
}

export function formatNumber(value: number, digits = 2): string {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value || 0);
}

// Detecta string "date-only" (YYYY-MM-DD). Esses valores NÃO devem passar por
// new Date("YYYY-MM-DD") (que os interpreta como UTC e recua 1 dia em fusos negativos,
// como America/Sao_Paulo). Tratamos como data local, preservando o dia digitado.
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Converte string date-only em Date LOCAL (sem deslocamento de fuso). Datetime passa direto. */
export function parseDateLocal(value: string | Date): Date {
  if (value instanceof Date) return value;
  const m = value.match(DATE_ONLY);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(value);
}

export function formatDate(value: string | Date): string {
  if (typeof value === "string") {
    const m = value.match(DATE_ONLY);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`; // date-only: formata direto, sem fuso
  }
  const d = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export function formatDateLong(value: string | Date): string {
  const d = parseDateLocal(value);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(d);
}

/** Ex.: 1.20 x 0.80 m */
export function formatMedida(largura: number, altura: number): string {
  return `${formatNumber(largura, 2)} × ${formatNumber(altura, 2)} m`;
}
