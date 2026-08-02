import { requirePerm } from "@/lib/data/guard";
export default async function PELayout({ children }: { children: React.ReactNode }) {
  await requirePerm("fin.ponto_equilibrio");
  return <>{children}</>;
}
