"use client";

import { CadastroView, type Column, type Field } from "@/components/cadastro/cadastro-view";

const columns: Column[] = [
  { key: "nome", label: "Vendedor" },
  { key: "email", label: "E-mail" },
  { key: "tel", label: "Telefone" },
  { key: "desc_max", label: "Desc. máx", align: "right", render: (r) => `${Number(r.desc_max || 0)}%` },
];
const fields: Field[] = [
  { key: "nome", label: "Nome", type: "text", required: true, full: true },
  { key: "email", label: "E-mail", type: "text" },
  { key: "tel", label: "Telefone", type: "text" },
  { key: "desc_max", label: "Limite de desconto (%)", type: "number" },
  { key: "meta", label: "Meta (R$)", type: "number" },
  { key: "comissao", label: "Comissão (%)", type: "number" },
  { key: "ativo", label: "Ativo", type: "checkbox" },
];

export default function VendedoresPage() {
  return (
    <CadastroView
      entity="vendedores" title="Vendedores"
      description="Cada vendedor vê apenas as próprias vendas. Vendedor com vendas não pode ser excluído — apenas inativado."
      table="sellers" select="id,nome,email,tel,desc_max,meta,comissao,ativo"
      columns={columns} fields={fields} searchKeys={["nome", "email", "tel"]}
      novo={() => ({ nome: "", email: "", tel: "", desc_max: 0, meta: 0, comissao: 0, ativo: true })}
    />
  );
}
