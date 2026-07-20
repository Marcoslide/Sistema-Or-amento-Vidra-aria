/**
 * Tipos de domínio do sistema.
 *
 * Esta é a "fonte da verdade" do modelo de negócio. O backend
 * (NestJS + Prisma) deverá implementar exatamente este contrato,
 * de forma que as telas não precisem ser reescritas na integração.
 */

// ---------------------------------------------------------------------------
// Enums / uniões
// ---------------------------------------------------------------------------

/** Regra de cálculo de preço do produto. */
export type UnidadeCalculo =
  | "M2" // metro quadrado (largura × altura)
  | "UNIDADE" // por peça
  | "METRO_LINEAR" // comprimento
  | "PERIMETRO"; // soma dos lados (2×L + 2×A)

export const UNIDADE_CALCULO_LABEL: Record<UnidadeCalculo, string> = {
  M2: "Metro quadrado (m²)",
  UNIDADE: "Unidade (peça)",
  METRO_LINEAR: "Metro linear (m)",
  PERIMETRO: "Perímetro (m)",
};

/** Status do orçamento — acompanha todo o ciclo até a obra. */
export type StatusOrcamento =
  | "ORCAMENTO"
  | "APROVADO"
  | "EM_PRODUCAO"
  | "EXECUTANDO"
  | "FINALIZADO"
  | "RETORNO"
  | "RECLAMACAO"
  | "CANCELADO";

export const STATUS_ORCAMENTO_LABEL: Record<StatusOrcamento, string> = {
  ORCAMENTO: "Orçamento",
  APROVADO: "Aprovado",
  EM_PRODUCAO: "Em Produção",
  EXECUTANDO: "Executando",
  FINALIZADO: "Finalizado",
  RETORNO: "Retorno",
  RECLAMACAO: "Reclamação",
  CANCELADO: "Cancelado",
};

export type CategoriaProduto =
  | "VIDRO"
  | "ESPELHO"
  | "ESQUADRIA"
  | "BOX"
  | "GUARDA_CORPO"
  | "FERRAGEM"
  | "SERVICO";

export const CATEGORIA_PRODUTO_LABEL: Record<CategoriaProduto, string> = {
  VIDRO: "Vidro",
  ESPELHO: "Espelho",
  ESQUADRIA: "Esquadria",
  BOX: "Box",
  GUARDA_CORPO: "Guarda-corpo",
  FERRAGEM: "Ferragem",
  SERVICO: "Serviço",
};

export type TipoPessoa = "PF" | "PJ";

export type FormaPagamento =
  | "DINHEIRO"
  | "PIX"
  | "CARTAO_CREDITO"
  | "CARTAO_DEBITO"
  | "BOLETO"
  | "TRANSFERENCIA";

export const FORMA_PAGAMENTO_LABEL: Record<FormaPagamento, string> = {
  DINHEIRO: "Dinheiro",
  PIX: "Pix",
  CARTAO_CREDITO: "Cartão de Crédito",
  CARTAO_DEBITO: "Cartão de Débito",
  BOLETO: "Boleto",
  TRANSFERENCIA: "Transferência",
};

// ---------------------------------------------------------------------------
// Entidades
// ---------------------------------------------------------------------------

export interface Endereco {
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
}

export interface Obra {
  id: string;
  clienteId: string;
  nome: string;
  endereco: Endereco;
  observacao?: string;
}

export interface Cliente {
  id: string;
  tipo: TipoPessoa;
  nome: string;
  documento: string; // CPF ou CNPJ
  email?: string;
  telefone: string;
  endereco: Endereco;
  obras: Obra[];
  criadoEm: string;
}

export interface Produto {
  id: string;
  nome: string;
  categoria: CategoriaProduto;
  unidade: UnidadeCalculo;
  precoBase: number; // preço por unidade de cálculo
  espessura?: string; // ex.: "8mm"
  cor?: string;
  ativo: boolean;
}

export interface Vendedor {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  descontoMaximo: number; // % máximo que pode conceder
  ativo: boolean;
}

export interface ContaRecebimento {
  id: string;
  nome: string; // ex.: "Banco Inter", "Caixa"
  tipo: "BANCO" | "CAIXA" | "CARTEIRA_DIGITAL";
  ativo: boolean;
}

export interface OperadoraParcela {
  parcelas: number;
  taxa: number; // %
}

export interface Operadora {
  id: string;
  nome: string; // ex.: "Stone"
  contaRecebimentoId: string;
  parcelamentos: OperadoraParcela[];
  ativo: boolean;
}

// ----- Orçamento (o núcleo do sistema) -----

export interface MedidaItem {
  id: string;
  largura: number; // m
  altura: number; // m
  quantidade: number;
}

export interface ItemOrcamento {
  id: string;
  produtoId: string;
  produtoNome: string;
  categoria: CategoriaProduto;
  unidade: UnidadeCalculo;
  precoUnitario: number;
  medidas: MedidaItem[];
  observacao?: string;
  // Derivados de cálculo (persistidos para histórico/PDF):
  quantidadeTotal: number; // m², peças ou m conforme unidade
  total: number;
}

export interface Ambiente {
  id: string;
  nome: string; // ex.: "Banheiro suíte"
  itens: ItemOrcamento[];
}

export interface Pagamento {
  id: string;
  forma: FormaPagamento;
  valor: number;
  parcelas: number;
  operadoraId?: string;
  contaRecebimentoId?: string;
  observacao?: string;
}

export interface Orcamento {
  id: string;
  numero: number;
  clienteId: string;
  clienteNome: string;
  obraId?: string;
  obraNome?: string;
  vendedorId: string;
  vendedorNome: string;
  status: StatusOrcamento;
  ambientes: Ambiente[];
  pagamentos: Pagamento[];
  descontoPercentual: number;
  descontoValor: number; // calculado
  subtotal: number; // soma dos itens
  total: number; // subtotal - desconto
  validadeDias: number;
  observacoes?: string;
  criadoEm: string;
  atualizadoEm: string;
}
