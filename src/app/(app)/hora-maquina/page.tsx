"use client";

import { CadastroView } from "@/components/cadastro/cadastro-view";

export default function HoraMaquinaPage() {
  return (
    <CadastroView
      entity="hora-maquina"
      title="Hora-Máquina"
      description="Custo de máquina por hora produtiva."
      table="machine_costs"
      select="id,nome,aquisicao,vida_util_meses,valor_residual,depreciacao_mes,energia,manutencao,seguro,consumiveis,operador,horas_disponiveis,horas_produtivas,custo_hora,tipo,centro_custo_id,store_id,ativo"
      nameKey="nome"
      lojaFilter
      searchKeys={["nome"]}
      columns={[
        { key: "nome", label: "Máquina" },
        { key: "custo_hora", label: "Custo/hora", align: "right", render: (r) => `R$ ${Number(r.custo_hora || 0).toFixed(2)}` },
      ]}
      fields={[
        { key: "nome", label: "Máquina", type: "text", full: true, required: true },
        { key: "aquisicao", label: "Custo de aquisição (R$)", type: "number" },
        { key: "vida_util_meses", label: "Vida útil (meses)", type: "number" },
        { key: "valor_residual", label: "Valor residual (R$)", type: "number" },
        { key: "depreciacao_mes", label: "Depreciação/mês (R$)", type: "number" },
        { key: "energia", label: "Energia (R$)", type: "number" },
        { key: "manutencao", label: "Manutenção (R$)", type: "number" },
        { key: "seguro", label: "Seguro (R$)", type: "number" },
        { key: "consumiveis", label: "Consumíveis (R$)", type: "number" },
        { key: "operador", label: "Operador (R$)", type: "number" },
        { key: "horas_disponiveis", label: "Horas disponíveis", type: "number" },
        { key: "horas_produtivas", label: "Horas produtivas", type: "number" },
        { key: "tipo", label: "Tipo", type: "select", options: [{ value: "valor", label: "valor" }, { value: "percentual", label: "percentual" }] },
        { key: "centro_custo_id", label: "Centro de custo", type: "select", optionsFrom: "centrocustos" },
        { key: "store_id", label: "Loja", type: "select", optionsFrom: "lojas" },
      ]}
      novo={() => ({ nome: "", aquisicao: 0, vida_util_meses: 120, valor_residual: 0, depreciacao_mes: 0, energia: 0, manutencao: 0, seguro: 0, consumiveis: 0, operador: 0, horas_disponiveis: 176, horas_produtivas: 140, custo_hora: 0, tipo: "valor", ativo: true })}
    />
  );
}
