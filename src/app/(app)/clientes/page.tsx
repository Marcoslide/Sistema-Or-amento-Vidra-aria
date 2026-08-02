"use client";

import { CadastroView } from "@/components/cadastro/cadastro-view";

// Listagem de Clientes com CRUD completo e exclusão segura (mesmo padrão dos demais cadastros):
// editar (diálogo), inativar/reativar, exclusão segura (bloqueia se houver vendas → oferece inativar),
// busca, filtro por loja e seleção em massa. A CRIAÇÃO homologada continua em /clientes/novo.
export default function ClientesPage() {
  return (
    <CadastroView
      entity="clientes"
      title="Clientes"
      description="Cadastro de clientes, obras e endereços."
      table="customers"
      select="id,nome,doc,tel,email,cidade,uf,store_id,ativo"
      orderBy="nome"
      nameKey="nome"
      novoHref="/clientes/novo"
      lojaFilter
      searchKeys={["nome", "doc", "tel", "email", "cidade"]}
      columns={[
        { key: "nome", label: "Cliente" },
        { key: "doc", label: "Documento" },
        { key: "tel", label: "Telefone" },
        { key: "cidade", label: "Cidade", render: (r) => `${r.cidade || "—"}${r.uf ? "/" + r.uf : ""}` },
      ]}
      fields={[
        { key: "nome", label: "Nome / Razão social", type: "text", full: true, required: true },
        { key: "doc", label: "CPF / CNPJ", type: "text" },
        { key: "tel", label: "Telefone", type: "text" },
        { key: "email", label: "E-mail", type: "text" },
        { key: "cep", label: "CEP", type: "text" },
        { key: "logradouro", label: "Logradouro", type: "text", full: true },
        { key: "numero", label: "Número", type: "text" },
        { key: "bairro", label: "Bairro", type: "text" },
        { key: "cidade", label: "Cidade", type: "text" },
        { key: "uf", label: "UF", type: "text" },
        { key: "store_id", label: "Loja", type: "select", optionsFrom: "lojas" },
      ]}
      novo={() => ({ nome: "", doc: "", tel: "", email: "", cidade: "", uf: "", ativo: true })}
    />
  );
}
