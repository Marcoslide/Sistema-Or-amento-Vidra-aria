import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

let _seq = 0;
/** Gera um id local para itens de UI (substituído pelo id do backend). */
export function uid(prefix = "id"): string {
  _seq += 1;
  return `${prefix}-${Date.now().toString(36)}-${_seq}`;
}
