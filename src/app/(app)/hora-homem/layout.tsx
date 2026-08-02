import { requirePerm } from "@/lib/data/guard";
export default async function HoraHomemLayout({ children }: { children: React.ReactNode }) {
  await requirePerm("fin.ver_custos");
  return <>{children}</>;
}
