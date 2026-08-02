import { PageHeader } from "@/components/page-header";
import { Construction } from "lucide-react";

// Placeholder padrão para módulos do contrato V6 ainda não restaurados nesta versão de homologação.
// A rota EXISTE e é navegável (nada quebrado); apenas sinaliza que o conteúdo está em desenvolvimento.
export function EmDesenvolvimento({
  titulo,
  descricao,
}: {
  titulo: string;
  descricao?: string;
}) {
  return (
    <div className="space-y-4">
      <PageHeader title={titulo} description={descricao ?? "Módulo do contrato V6."} />
      <div className="flex items-center gap-3 rounded-lg border border-amber-400/40 bg-amber-50 px-4 py-4 text-sm text-amber-800">
        <Construction className="h-5 w-5 shrink-0" />
        <span>
          <strong>Em desenvolvimento.</strong> Este módulo consta no menu aprovado (V6) e será
          liberado numa próxima entrega. Nesta versão de homologação ele ainda não exibe dados.
        </span>
      </div>
    </div>
  );
}
