"use client";

import { CadastroView } from "@/components/cadastro/cadastro-view";

export default function DepreciacaoPage() {
  return (
    <CadastroView
      entity="depreciacao"
      title="Depreciação"
      description="Bens, vida útil e valor contábil."
      table="depreciation_assets"
      select="id,nome,custo_original,data_compra,vida_util_meses,valor_residual,deprec_acumulada,valor_contabil,status,baixado,centro_custo_id,store_id,ativo"
      nameKey="nome"
      lojaFilter
      searchKeys={["nome", "status"]}
      columns={[
        { key: "nome", label: "Bem" },
        { key: "custo_original", label: "Custo", align: "right", render: (r) => `R$ ${Number(r.custo_original || 0).toFixed(2)}` },
        { key: "valor_contabil", label: "Valor contábil", align: "right", render: (r) => `R$ ${Number(r.valor_contabil || 0).toFixed(2)}` },
        { key: "status", label: "Situação" },
      ]}
      fields={[
        { key: "nome", label: "Bem", type: "text", full: true, required: true },
        { key: "custo_original", label: "Custo original (R$)", type: "number" },
        { key: "data_compra", label: "Data de compra (AAAA-MM-DD)", type: "text" },
        { key: "vida_util_meses", label: "Vida útil (meses)", type: "number" },
        { key: "valor_residual", label: "Valor residual (R$)", type: "number" },
        { key: "deprec_acumulada", label: "Depreciação acumulada (R$)", type: "number" },
        { key: "valor_contabil", label: "Valor contábil (R$)", type: "number" },
        { key: "status", label: "Status", type: "select", options: [{ value: "ativo", label: "ativo" }, { value: "baixado", label: "baixado" }] },
        { key: "baixado", label: "Baixado", type: "checkbox" },
        { key: "centro_custo_id", label: "Centro de custo", type: "select", optionsFrom: "centrocustos" },
        { key: "store_id", label: "Loja", type: "select", optionsFrom: "lojas" },
      ]}
      novo={() => ({ nome: "", custo_original: 0, vida_util_meses: 60, valor_residual: 0, deprec_acumulada: 0, valor_contabil: 0, status: "ativo", baixado: false, ativo: true })}
    />
  );
}
