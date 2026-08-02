import { requirePerm } from "@/lib/data/guard";
export default async function HoraMaquinaLayout({ children }: { children: React.ReactNode }) {
  await requirePerm("fin.ver_custos");
  return <>{children}</>;
}
