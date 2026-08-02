import { PageHeader } from "@/components/page-header";

// Item do menu V6 restaurado no Bloco 1. O módulo será restaurado em bloco posterior.
export default function ObrasPage() {
  return (
    <div className="space-y-4">
      <PageHeader title="Obras" description="Módulo do contrato V6 — restauração agendada para bloco posterior." />
      <div className="rounded-lg border border-amber-400/40 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Este módulo consta no menu aprovado (V6) e será restaurado num bloco seguinte. Nenhum dado é exibido aqui.
      </div>
    </div>
  );
}
