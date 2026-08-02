// Motor puro de Produção — progresso e guarda de conclusão. Sem React/DOM.

export type StageStatus = "PENDENTE" | "ANDAMENTO" | "CONCLUIDA";
export interface Etapa { aplicavel?: boolean; status: StageStatus }
export interface Terceirizacao { recebido?: boolean; conferido?: boolean }

// Progresso = concluídas / etapas APLICÁVEIS. Etapas não aplicáveis (N/A) ficam FORA do denominador.
export function progressoEtapas(stages: Etapa[]): { aplicaveis: number; concluidas: number; pct: number } {
  const aplicaveis = stages.filter((e) => e.aplicavel !== false);
  const concluidas = aplicaveis.filter((e) => e.status === "CONCLUIDA").length;
  const pct = aplicaveis.length > 0 ? Math.round((concluidas / aplicaveis.length) * 100) : 0;
  return { aplicaveis: aplicaveis.length, concluidas, pct };
}

// Guarda de conclusão: só conclui com 100% das etapas aplicáveis concluídas (nenhuma em
// andamento/pendente) E todas as terceirizações recebidas E conferidas.
export function podeConcluir(stages: Etapa[], terceirizacoes: Terceirizacao[] = []): { ok: boolean; motivo?: string } {
  const pend = stages.filter((e) => e.aplicavel !== false && e.status !== "CONCLUIDA");
  if (pend.length > 0) return { ok: false, motivo: `${pend.length} etapa(s) pendente(s) ou em andamento` };
  const terc = terceirizacoes.filter((t) => !t.recebido || !t.conferido);
  if (terc.length > 0) return { ok: false, motivo: `${terc.length} terceirização(ões) não recebida(s)/conferida(s)` };
  const { pct } = progressoEtapas(stages);
  if (pct < 100 && stages.some((e) => e.aplicavel !== false)) return { ok: false, motivo: "produção abaixo de 100%" };
  return { ok: true };
}
