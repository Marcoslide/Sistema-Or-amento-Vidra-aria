import { requirePerm } from "@/lib/data/guard";

export default async function UsuariosLayout({ children }: { children: React.ReactNode }) {
  await requirePerm("adm.usuarios");
  return <>{children}</>;
}
