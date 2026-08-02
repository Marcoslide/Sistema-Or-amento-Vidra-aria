import { requirePerm } from "@/lib/data/guard";
export default async function CentroCustosLayout({ children }: { children: React.ReactNode }) {
  await requirePerm("fin.centro_custos");
  return <>{children}</>;
}
