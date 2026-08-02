// Helpers puros de permissão (sem React/ícones) — testáveis isoladamente.
// A autorização REAL é sempre revalidada no servidor (guards + server actions);
// isto controla apenas o que a UI mostra.

export type Permissao = string;
export interface ComPerm { perm?: Permissao }
export interface GrupoNav<T extends ComPerm = ComPerm> { title: string; items: T[] }

export const temPerm = (perms: Permissao[], p?: Permissao): boolean => !p || perms.includes(p);

// Filtra grupos/itens do menu; item sem `perm` é público; grupos vazios somem.
export function filtrarNav<T extends ComPerm>(groups: GrupoNav<T>[], perms: Permissao[]): GrupoNav<T>[] {
  return groups
    .map((g) => ({ ...g, items: g.items.filter((it) => temPerm(perms, it.perm)) }))
    .filter((g) => g.items.length > 0);
}

// Visibilidade de custo/margem no orçamento (vendedor NÃO vê).
export const podeVerCusto = (perms: Permissao[]) => perms.includes("fin.ver_custos");
export const podeVerMargem = (perms: Permissao[]) => perms.includes("fin.ver_margem");
