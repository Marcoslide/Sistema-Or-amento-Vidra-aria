/**
 * Camada de serviços — ponto único de acesso a dados para a UI.
 *
 * As telas SEMPRE importam daqui (nunca dos mocks diretamente).
 * Na fase 2, cada serviço passa a chamar a API NestJS; a assinatura
 * pública permanece a mesma.
 */
import { InMemoryRepository } from "@/data/repositories/in-memory-repository";
import { clientesMock } from "@/data/mock/clientes";
import { produtosMock } from "@/data/mock/produtos";
import { orcamentosMock } from "@/data/mock/orcamentos";
import {
  contasRecebimentoMock,
  operadorasMock,
  vendedoresMock,
} from "@/data/mock/equipe";
import { calcularItem, calcularOrcamento, totalPagamentos } from "@/lib/calculations";
import type {
  Cliente,
  ContaRecebimento,
  Operadora,
  Orcamento,
  Produto,
  Vendedor,
} from "@/lib/types";

const clientesRepo = new InMemoryRepository<Cliente>(clientesMock);
const produtosRepo = new InMemoryRepository<Produto>(produtosMock);
const orcamentosRepo = new InMemoryRepository<Orcamento>(orcamentosMock);
const vendedoresRepo = new InMemoryRepository<Vendedor>(vendedoresMock);
const contasRepo = new InMemoryRepository<ContaRecebimento>(contasRecebimentoMock);
const operadorasRepo = new InMemoryRepository<Operadora>(operadorasMock);

/** Recalcula todos os campos derivados de um orçamento. */
export function normalizarOrcamento(orc: Orcamento): Orcamento {
  const ambientes = orc.ambientes.map((amb) => ({
    ...amb,
    itens: amb.itens.map(calcularItem),
  }));
  const resumo = calcularOrcamento(
    ambientes,
    orc.descontoPercentual,
    totalPagamentos(orc),
  );
  return {
    ...orc,
    ambientes,
    subtotal: resumo.subtotal,
    descontoValor: resumo.descontoValor,
    total: resumo.total,
  };
}

export const clienteService = {
  listar: () => clientesRepo.findAll(),
  obter: (id: string) => clientesRepo.findById(id),
  criar: (c: Cliente) => clientesRepo.create(c),
};

export const produtoService = {
  listar: () => produtosRepo.findAll(),
  obter: (id: string) => produtosRepo.findById(id),
  criar: (p: Produto) => produtosRepo.create(p),
};

export const orcamentoService = {
  async listar(): Promise<Orcamento[]> {
    const all = await orcamentosRepo.findAll();
    return all.map(normalizarOrcamento);
  },
  async obter(id: string): Promise<Orcamento | null> {
    const orc = await orcamentosRepo.findById(id);
    return orc ? normalizarOrcamento(orc) : null;
  },
  criar: (o: Orcamento) => orcamentosRepo.create(o),
};

export const vendedorService = {
  listar: () => vendedoresRepo.findAll(),
};

export const contaService = {
  listar: () => contasRepo.findAll(),
};

export const operadoraService = {
  listar: () => operadorasRepo.findAll(),
};
