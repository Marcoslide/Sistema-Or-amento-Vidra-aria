"use client";

import { CadastroView, type Column, type Field } from "@/components/cadastro/cadastro-view";

const TIPOS = [
  { value: "credito", label: "Crédito" },
  { value: "debito", label: "Débito" },
  { value: "ambos", label: "Crédito e débito" },
];

const columns: Column[] = [
  { key: "nome", label: "Operadora" },
  { key: "tipo", label: "Tipo", render: (r) => (TIPOS.find((t) => t.value === r.tipo)?.label || String(r.tipo || "—")) },
  { key: "conta", label: "Conta de recebimento" },
  { key: "prazo", label: "Prazo" },
];
const fields: Field[] = [
  { key: "nome", label: "Nome", type: "text", required: true, full: true },
  { key: "store_id", label: "Loja / operação", type: "select", optionsFrom: "lojas" },
  { key: "conta", label: "Conta de recebimento", type: "select", optionsFrom: "contas" },
  { key: "tipo", label: "Tipo", type: "select", options: TIPOS },
  { key: "bandeiras", label: "Bandeiras", type: "text" },
  { key: "prazo", label: "Prazo de recebimento", type: "text" },
  { key: "antecipacao", label: "Permite antecipação", type: "checkbox" },
  { key: "taxa_antecip", label: "Taxa de antecipação (%)", type: "number" },
  { key: "ativo", label: "Ativa", type: "checkbox" },
  { key: "obs", label: "Observações", type: "textarea", full: true },
];

export default function OperadorasPage() {
  return (
    <CadastroView
      entity="operadoras" title="Operadoras de Cartão"
      description="Operadora usada em recebimentos não pode ser excluída — apenas inativada. As faixas de parcelas/taxas serão editadas junto do módulo financeiro."
      table="card_operators" select="id,nome,store_id,conta,tipo,bandeiras,prazo,antecipacao,taxa_antecip,obs,ativo"
      columns={columns} fields={fields} searchKeys={["nome", "conta", "bandeiras"]} lojaFilter
      novo={() => ({ nome: "", store_id: "", conta: "", tipo: "ambos", bandeiras: "", prazo: "", antecipacao: false, taxa_antecip: 0, obs: "", ativo: true })}
    />
  );
}
