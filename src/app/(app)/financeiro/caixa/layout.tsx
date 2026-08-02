import { requirePerm } from "@/lib/data/guard";
export default async function CaixaLayout({ children }: { children: React.ReactNode }) {
  await requirePerm("fin.caixa");
  return <>{children}</>;
}
