"use client";

import { CadastroView, type Column, type Field } from "@/components/cadastro/cadastro-view";

const columns: Column[] = [
  { key: "nome", label: "Fornecedor" },
  { key: "razao", label: "Razão social" },
  { key: "doc", label: "CNPJ/CPF" },
  { key: "categoria", label: "Categoria" },
];
const fields: Field[] = [
  { key: "nome", label: "Nome / fantasia", type: "text", required: true, full: true },
  { key: "razao", label: "Razão social", type: "text", full: true },
  { key: "doc", label: "CNPJ/CPF", type: "text" },
  { key: "categoria", label: "Categoria", type: "text" },
  { key: "ativo", label: "Ativo", type: "checkbox" },
];

export default function FornecedoresPage() {
  return (
    <CadastroView
      entity="fornecedores" title="Fornecedores"
      description="Fornecedor com produtos vinculados não pode ser excluído — apenas inativado."
      table="suppliers" select="id,nome,razao,doc,categoria,ativo"
      columns={columns} fields={fields} searchKeys={["nome", "razao", "doc", "categoria"]}
      novo={() => ({ nome: "", razao: "", doc: "", categoria: "", ativo: true })}
    />
  );
}
