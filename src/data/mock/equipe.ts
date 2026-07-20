import type { ContaRecebimento, Operadora, Vendedor } from "@/lib/types";

export const vendedoresMock: Vendedor[] = [
  {
    id: "vnd-1",
    nome: "Carla Mendes",
    email: "carla@vidraria.com",
    telefone: "(11) 98800-1122",
    descontoMaximo: 10,
    ativo: true,
  },
  {
    id: "vnd-2",
    nome: "Diego Farias",
    email: "diego@vidraria.com",
    telefone: "(11) 98700-3344",
    descontoMaximo: 7,
    ativo: true,
  },
  {
    id: "vnd-3",
    nome: "Patrícia Lopes",
    email: "patricia@vidraria.com",
    telefone: "(11) 98600-5566",
    descontoMaximo: 15,
    ativo: true,
  },
  {
    id: "vnd-4",
    nome: "Rodrigo Alves",
    email: "rodrigo@vidraria.com",
    telefone: "(11) 98500-7788",
    descontoMaximo: 5,
    ativo: false,
  },
];

export const contasRecebimentoMock: ContaRecebimento[] = [
  { id: "cta-1", nome: "Caixa da loja", tipo: "CAIXA", ativo: true },
  { id: "cta-2", nome: "Banco Inter", tipo: "BANCO", ativo: true },
  { id: "cta-3", nome: "Itaú Empresas", tipo: "BANCO", ativo: true },
  { id: "cta-4", nome: "Stone (carteira)", tipo: "CARTEIRA_DIGITAL", ativo: true },
];

export const operadorasMock: Operadora[] = [
  {
    id: "ope-1",
    nome: "Stone",
    contaRecebimentoId: "cta-4",
    ativo: true,
    parcelamentos: [
      { parcelas: 1, taxa: 2.2 },
      { parcelas: 2, taxa: 3.4 },
      { parcelas: 3, taxa: 4.1 },
      { parcelas: 6, taxa: 6.9 },
      { parcelas: 12, taxa: 12.5 },
    ],
  },
  {
    id: "ope-2",
    nome: "Cielo",
    contaRecebimentoId: "cta-3",
    ativo: true,
    parcelamentos: [
      { parcelas: 1, taxa: 2.5 },
      { parcelas: 3, taxa: 4.5 },
      { parcelas: 6, taxa: 7.2 },
      { parcelas: 10, taxa: 11.0 },
    ],
  },
];
