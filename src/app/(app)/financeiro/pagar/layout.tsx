import { requirePerm } from "@/lib/data/guard";
export default async function PagarLayout({ children }: { children: React.ReactNode }) {
  await requirePerm("fin.contas_pagar");
  return <>{children}</>;
}
