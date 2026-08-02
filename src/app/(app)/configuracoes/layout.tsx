import { requirePerm } from "@/lib/data/guard";

export default async function ConfiguracoesLayout({ children }: { children: React.ReactNode }) {
  await requirePerm("adm.config");
  return <>{children}</>;
}
