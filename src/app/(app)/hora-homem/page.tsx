"use client";

import { CadastroView } from "@/components/cadastro/cadastro-view";

export default function HoraHomemPage() {
  return (
    <CadastroView
      entity="hora-homem"
      title="Hora-Homem"
      description="Custo de mão de obra por hora produtiva."
      table="labor_costs"
      select="id,nome,salario,encargos,beneficios,adicionais,tipo_adicional,horas_contratadas,horas_produtivas,produtividade,custo_hora,centro_custo_id,store_id,ativo"
      nameKey="nome"
      lojaFilter
      searchKeys={["nome"]}
      columns={[
        { key: "nome", label: "Colaborador / função" },
        { key: "salario", label: "Salário", align: "right", render: (r) => `R$ ${Number(r.salario || 0).toFixed(2)}` },
        { key: "custo_hora", label: "Custo/hora", align: "right", render: (r) => `R$ ${Number(r.custo_hora || 0).toFixed(2)}` },
      ]}
      fields={[
        { key: "nome", label: "Colaborador / função", type: "text", full: true, required: true },
        { key: "salario", label: "Salário (R$)", type: "number" },
        { key: "encargos", label: "Encargos (R$)", type: "number" },
        { key: "beneficios", label: "Benefícios (R$)", type: "number" },
        { key: "adicionais", label: "Adicionais (R$)", type: "number" },
        { key: "tipo_adicional", label: "Tipo do adicional", type: "select", options: [{ value: "valor", label: "valor" }, { value: "percentual", label: "percentual" }] },
        { key: "horas_contratadas", label: "Horas contratadas", type: "number" },
        { key: "horas_produtivas", label: "Horas produtivas", type: "number" },
        { key: "produtividade", label: "Produtividade (%)", type: "number" },
        { key: "centro_custo_id", label: "Centro de custo", type: "select", optionsFrom: "centrocustos" },
        { key: "store_id", label: "Loja", type: "select", optionsFrom: "lojas" },
      ]}
      novo={() => ({ nome: "", salario: 0, encargos: 0, beneficios: 0, adicionais: 0, tipo_adicional: "valor", horas_contratadas: 220, horas_produtivas: 176, produtividade: 80, custo_hora: 0, ativo: true })}
    />
  );
}
