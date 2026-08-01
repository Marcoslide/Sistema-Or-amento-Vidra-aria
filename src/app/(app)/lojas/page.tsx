"use client";

import { CadastroView, type Column, type Field } from "@/components/cadastro/cadastro-view";

const columns: Column[] = [
  { key: "nome", label: "Loja" },
  { key: "tipo", label: "Tipo" },
  { key: "cidade", label: "Cidade", render: (r) => `${r.cidade || "—"}${r.uf ? "/" + r.uf : ""}` },
  { key: "cnpj", label: "CNPJ" },
];
const fields: Field[] = [
  { key: "nome", label: "Nome", type: "text", required: true, full: true },
  { key: "tipo", label: "Tipo", type: "select", options: [{ value: "loja", label: "Loja" }, { value: "fabrica", label: "Fábrica / Produção" }] },
  { key: "cnpj", label: "CNPJ", type: "text" },
  { key: "cidade", label: "Cidade", type: "text" },
  { key: "uf", label: "UF", type: "text" },
  { key: "resp", label: "Responsável", type: "text" },
  { key: "ativo", label: "Ativa", type: "checkbox" },
];

export default function LojasPage() {
  return (
    <CadastroView
      entity="lojas" title="Lojas e operações"
      description="Cadastro de lojas/operações. Loja com vínculo não pode ser excluída — apenas inativada."
      table="stores" select="id,nome,tipo,cnpj,cidade,uf,resp,ativo"
      columns={columns} fields={fields} searchKeys={["nome", "cnpj", "cidade"]}
      novo={() => ({ nome: "", tipo: "loja", cnpj: "", cidade: "", uf: "", resp: "", ativo: true })}
    />
  );
}
