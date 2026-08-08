// Progresso da obra — fonte única de verdade: itens do checklist (obra_checklist).
// Mesma convenção do módulo Produção (progressoEtapas): concluídos / total, arredondado.
// Nunca editável manualmente — sempre derivado do andamento real.
export type ChecklistItem = { feito: boolean };

export function progressoChecklist(itens: ChecklistItem[]): number {
  if (!itens.length) return 0;
  const feitos = itens.filter((i) => i.feito).length;
  return Math.round((feitos / itens.length) * 100);
}
