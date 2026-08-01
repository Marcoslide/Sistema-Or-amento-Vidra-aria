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

const columns: Column[] = [
  { key: "nome", label: "Família" },
  { key: "codigo", label: "Código" },
  { key: "regra", label: "Regra", render: (r) => (REGRAS.find((x) => x.value === r.regra)?.label || String(r.regra || "—")) },
  { key: "unidade", label: "Unidade" },
];
const fields: Field[] = [
  { key: "nome", label: "Nome", type: "text", required: true, full: true },
  { key: "codigo", label: "Código", type: "text" },
  { key: "regra", label: "Regra de cálculo padrão", type: "select", options: REGRAS },
  { key: "unidade", label: "Unidade", type: "text" },
  { key: "multiplicador_padrao", label: "Multiplicador técnico (Moldura)", type: "number", showWhen: (v) => v.regra === "MOLDURA" },
  { key: "ativo", label: "Ativa", type: "checkbox" },
];

export default function FamiliasPage() {
  return (
    <CadastroView
      entity="familias" title="Famílias"
      description="A regra de cálculo pertence à família (inclui MOLDURA). Família com produtos não pode ser excluída — apenas inativada."
      table="product_families" select="id,nome,codigo,regra,unidade,multiplicador_padrao,ativo"
      columns={columns} fields={fields} searchKeys={["nome", "codigo"]}
      novo={() => ({ nome: "", codigo: "", regra: "UN", unidade: "un", multiplicador_padrao: 8, ativo: true })}
    />
  );
}
