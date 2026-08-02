import { requirePerm } from "@/lib/data/guard";
export default async function ObrasLayout({ children }: { children: React.ReactNode }) {
  await requirePerm("obras.ver");
  return <>{children}</>;
}
