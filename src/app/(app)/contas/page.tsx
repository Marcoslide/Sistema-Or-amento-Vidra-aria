"use client";

import { CadastroView, type Column, type Field } from "@/components/cadastro/cadastro-view";

const TIPOS = ["Caixa", "Conta corrente", "Conta poupança", "Carteira digital", "Conta de recebimento", "Adquirente", "Banco", "Outro"]
  .map((t) => ({ value: t, label: t }));

const columns: Column[] = [
  { key: "nome", label: "Conta" },
  { key: "tipo", label: "Tipo" },
  { key: "banco", label: "Banco" },
  { key: "saldo_inicial", label: "Saldo inicial", align: "right", render: (r) => Number(r.saldo_inicial || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) },
];
const fields: Field[] = [
  { key: "nome", label: "Nome da conta", type: "text", required: true, full: true },
  { key: "tipo", label: "Tipo", type: "select", options: TIPOS },
  { key: "store_id", label: "Loja / operação", type: "select", optionsFrom: "lojas" },
  { key: "banco", label: "Banco", type: "text" },
  { key: "agencia", label: "Agência", type: "text" },
  { key: "numero", label: "Número da conta", type: "text" },
  { key: "digito", label: "Dígito", type: "text" },
  { key: "titular", label: "Titular", type: "text" },
  { key: "doc", label: "CPF/CNPJ do titular", type: "text" },
  { key: "saldo_inicial", label: "Saldo inicial", type: "number" },
  { key: "aceita_entrada", label: "Aceita entradas", type: "checkbox" },
  { key: "aceita_saida", label: "Aceita saídas", type: "checkbox" },
  { key: "padrao", label: "Conta padrão", type: "checkbox" },
  { key: "ativo", label: "Ativa", type: "checkbox" },
  { key: "obs", label: "Observações", type: "textarea", full: true },
];

export default function ContasPage() {
  return (
    <CadastroView
      entity="contas" title="Contas de Recebimento"
      description="Contas financeiras. Conta com movimentação não pode ser excluída — apenas inativada. Conta inativa não aparece em novos lançamentos."
      table="financial_accounts" select="id,nome,tipo,banco,agencia,numero,digito,titular,doc,store_id,saldo_inicial,aceita_entrada,aceita_saida,padrao,obs,ativo"
      columns={columns} fields={fields} searchKeys={["nome", "banco", "titular"]} lojaFilter
      novo={() => ({ nome: "", tipo: "Conta corrente", store_id: "", banco: "", agencia: "", numero: "", digito: "", titular: "", doc: "", saldo_inicial: 0, aceita_entrada: true, aceita_saida: true, padrao: false, obs: "", ativo: true })}
    />
  );
}
