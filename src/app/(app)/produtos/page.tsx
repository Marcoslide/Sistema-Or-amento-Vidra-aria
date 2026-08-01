"use client";

import { CadastroView, type Column, type Field } from "@/components/cadastro/cadastro-view";

const REGRAS = [
  { value: "M2", label: "Metro quadrado (m²)" },
  { value: "ML", label: "Metro linear (m)" },
  { value: "PERIMETRO", label: "Perímetro (m)" },
  { value: "UN", label: "Unidade (peça)" },
  { value: "BARRA", label: "Barra" },
  { value: "CHAPA", label: "Chapa" },
  { value: "KIT", label: "Kit" },
  { value: "MOLDURA", label: "Moldura (metro linear)" },
];

const brl = (n: unknown) => Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const columns: Column[] = [
  { key: "descricao", label: "Produto" },
  { key: "familia", label: "Família" },
  { key: "regra", label: "Regra", render: (r) => (REGRAS.find((x) => x.value === r.regra)?.label || String(r.regra || "—")) },
  { key: "preco", label: "Preço", align: "right", render: (r) => brl(r.preco) },
];
const fields: Field[] = [
  { key: "descricao", label: "Descrição", type: "text", required: true, full: true },
  { key: "codigo", label: "Código", type: "text" },
  { key: "familia", label: "Família", type: "select", optionsFrom: "familias" },
  { key: "fornecedor", label: "Fornecedor", type: "select", optionsFrom: "fornecedores" },
  { key: "regra", label: "Regra de cálculo", type: "select", options: REGRAS },
  { key: "preco", label: "Preço de venda (por unidade da regra)", type: "number" },
  { key: "custo_base", label: "Custo base", type: "number" },
  // Campos MOLDURA (persistidos para o módulo de orçamento):
  { key: "largura_moldura_cm", label: "Largura da moldura (cm)", type: "number", showWhen: (v) => v.regra === "MOLDURA" },
  { key: "multiplicador_corte", label: "Multiplicador técnico de corte", type: "number", showWhen: (v) => v.regra === "MOLDURA" },
  { key: "ativo", label: "Ativo", type: "checkbox" },
];

export default function ProdutosPage() {
  return (
    <CadastroView
      entity="produtos" title="Produtos"
      description="Cadastre a família antes do produto (a regra de cálculo pertence à família). Produto usado em vendas não pode ser excluído — apenas inativado."
      table="products" select="id,descricao,codigo,familia,fornecedor,regra,preco,custo_base,largura_moldura_cm,multiplicador_corte,ativo"
      orderBy="descricao" nameKey="descricao"
      columns={columns} fields={fields} searchKeys={["descricao", "codigo", "familia"]}
      novo={() => ({ descricao: "", codigo: "", familia: "", fornecedor: "", regra: "UN", preco: 0, custo_base: 0, largura_moldura_cm: 0, multiplicador_corte: 8, ativo: true })}
    />
  );
}
