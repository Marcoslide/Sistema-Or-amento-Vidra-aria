import { requirePerm } from "@/lib/data/guard";
export default async function ReceberLayout({ children }: { children: React.ReactNode }) {
  await requirePerm("fin.contas_receber");
  return <>{children}</>;
}
