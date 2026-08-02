import { requirePerm } from "@/lib/data/guard";
export default async function ProducaoLayout({ children }: { children: React.ReactNode }) {
  await requirePerm("prod.ver");
  return <>{children}</>;
}
