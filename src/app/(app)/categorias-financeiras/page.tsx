"use client";

import { CadastroView, type Column, type Field } from "@/components/cadastro/cadastro-view";

const TIPOS = [
  { value: "receita", label: "Receita" },
  { value: "despesa", label: "Despesa" },
];

const columns: Column[] = [
  { key: "nome", label: "Categoria" },
  { key: "tipo", label: "Tipo", render: (r) => (TIPOS.find((t) => t.value === r.tipo)?.label || String(r.tipo || "—")) },
];
const fields: Field[] = [
  { key: "nome", label: "Nome", type: "text", required: true, full: true },
  { key: "tipo", label: "Tipo", type: "select", options: TIPOS },
  { key: "ativo", label: "Ativa", type: "checkbox" },
];

export default function CategoriasFinanceirasPage() {
  return (
    <CadastroView
      entity="categorias-financeiras" title="Categorias financeiras"
      description="Categorias de receita e despesa usadas em Contas a Pagar/Receber. Categoria em uso não pode ser excluída — apenas inativada."
      table="financial_categories" select="id,nome,tipo,ativo"
      columns={columns} fields={fields} searchKeys={["nome"]}
      novo={() => ({ nome: "", tipo: "despesa", ativo: true })}
    />
  );
}
