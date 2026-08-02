"use client";

import { CadastroView } from "@/components/cadastro/cadastro-view";

const TIPOS = ["fixo", "variavel", "administrativo", "marketing", "aluguel", "energia", "pessoal", "maquinas", "depreciacao", "outros"];
const CRITERIOS = ["faturamento", "quantidade", "horas", "m2", "ml", "personalizado"];

export default function CentroCustosPage() {
  return (
    <CadastroView
      entity="centro-custos"
      title="Centro de Custos"
      description="Custos fixos e variáveis, rateio e critérios."
      table="cost_centers"
      select="id,nome,tipo,valor,percentual,base_valor,periodicidade,participa_rateio,criterio_rateio,store_id,ativo"
      nameKey="nome"
      lojaFilter
      searchKeys={["nome", "tipo"]}
      columns={[
        { key: "nome", label: "Centro de custo" },
        { key: "tipo", label: "Tipo" },
        { key: "valor", label: "Valor", align: "right", render: (r) => `R$ ${Number(r.valor || 0).toFixed(2)}` },
        { key: "criterio_rateio", label: "Rateio" },
      ]}
      fields={[
        { key: "nome", label: "Nome", type: "text", full: true, required: true },
        { key: "tipo", label: "Tipo", type: "select", options: TIPOS.map((t) => ({ value: t, label: t })) },
        { key: "base_valor", label: "Base em valor fixo (senão %)", type: "checkbox" },
        { key: "valor", label: "Valor (R$)", type: "number" },
        { key: "percentual", label: "Percentual (%)", type: "number" },
        { key: "periodicidade", label: "Periodicidade", type: "select", options: [{ value: "mensal", label: "mensal" }, { value: "anual", label: "anual" }] },
        { key: "participa_rateio", label: "Participa do rateio", type: "checkbox" },
        { key: "criterio_rateio", label: "Critério de rateio", type: "select", options: CRITERIOS.map((t) => ({ value: t, label: t })) },
        { key: "store_id", label: "Loja", type: "select", optionsFrom: "lojas" },
      ]}
      novo={() => ({ nome: "", tipo: "fixo", base_valor: true, valor: 0, percentual: 0, periodicidade: "mensal", participa_rateio: true, criterio_rateio: "faturamento", ativo: true })}
    />
  );
}
