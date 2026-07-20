import { Badge } from "@/components/ui/badge";
import { STATUS_ORCAMENTO_LABEL, type StatusOrcamento } from "@/lib/types";
import type { BadgeProps } from "@/components/ui/badge";

const STATUS_VARIANT: Record<StatusOrcamento, BadgeProps["variant"]> = {
  ORCAMENTO: "muted",
  APROVADO: "default",
  EM_PRODUCAO: "warning",
  EXECUTANDO: "warning",
  FINALIZADO: "success",
  RETORNO: "secondary",
  RECLAMACAO: "destructive",
  CANCELADO: "destructive",
};

export function StatusBadge({ status }: { status: StatusOrcamento }) {
  return (
    <Badge variant={STATUS_VARIANT[status]}>
      {STATUS_ORCAMENTO_LABEL[status]}
    </Badge>
  );
}
