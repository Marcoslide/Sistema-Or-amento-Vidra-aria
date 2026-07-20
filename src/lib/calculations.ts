/**
 * Regras de cálculo do orçamento.
 *
 * Isoladas aqui para serem reaproveitadas idênticas no backend.
 * Nenhum componente deve recalcular preço por conta própria —
 * sempre passar por estas funções.
 */

import type {
  Ambiente,
  ItemOrcamento,
  MedidaItem,
  Orcamento,
  UnidadeCalculo,
} from "./types";

/** Quantidade "faturável" de uma única medida, conforme a unidade do produto. */
export function quantidadeMedida(
  unidade: UnidadeCalculo,
  medida: MedidaItem,
): number {
  const { largura, altura, quantidade } = medida;
  switch (unidade) {
    case "M2":
      return largura * altura * quantidade;
    case "UNIDADE":
      return quantidade;
    case "METRO_LINEAR":
      // usa a largura como comprimento de referência
      return largura * quantidade;
    case "PERIMETRO":
      return (2 * largura + 2 * altura) * quantidade;
  }
}

/** Quantidade total do item somando todas as suas medidas. */
export function quantidadeItem(item: ItemOrcamento): number {
  return item.medidas.reduce(
    (acc, m) => acc + quantidadeMedida(item.unidade, m),
    0,
  );
}

/** Recalcula quantidade total e valor de um item. Retorna novo objeto. */
export function calcularItem(item: ItemOrcamento): ItemOrcamento {
  const quantidadeTotal = quantidadeItem(item);
  const total = round2(quantidadeTotal * item.precoUnitario);
  return { ...item, quantidadeTotal: round2(quantidadeTotal), total };
}

export function totalAmbiente(ambiente: Ambiente): number {
  return round2(ambiente.itens.reduce((acc, i) => acc + i.total, 0));
}

export interface ResumoOrcamento {
  subtotal: number;
  descontoValor: number;
  total: number;
  totalPago: number;
  saldo: number;
  quantidadeItens: number;
}

/** Consolida os números do orçamento (subtotal, desconto, total, saldo). */
export function calcularOrcamento(
  ambientes: Ambiente[],
  descontoPercentual: number,
  totalPago: number,
): ResumoOrcamento {
  const subtotal = round2(
    ambientes.reduce((acc, a) => acc + totalAmbiente(a), 0),
  );
  const descontoValor = round2((subtotal * descontoPercentual) / 100);
  const total = round2(subtotal - descontoValor);
  const quantidadeItens = ambientes.reduce(
    (acc, a) => acc + a.itens.length,
    0,
  );
  return {
    subtotal,
    descontoValor,
    total,
    totalPago: round2(totalPago),
    saldo: round2(total - totalPago),
    quantidadeItens,
  };
}

export function totalPagamentos(orcamento: Pick<Orcamento, "pagamentos">): number {
  return round2(orcamento.pagamentos.reduce((acc, p) => acc + p.valor, 0));
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
