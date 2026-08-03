"use server";

import { getCtx } from "@/lib/data/server-ctx";

// Contadores dos itens de menu (paridade V6: navCount). Resiliente: zeros em falha.
export type NavCounts = { vendas: number; obras: number; receber: number; pagar: number };

export async function getNavCounts(): Promise<NavCounts> {
  const zero: NavCounts = { vendas: 0, obras: 0, receber: 0, pagar: 0 };
  try {
    const c = await getCtx();
    const hoje = new Date().toISOString().slice(0, 10);
    const [vendas, obras, receber, pagar] = await Promise.all([
      // Vendas em andamento (não finalizadas/canceladas)
      c.supabase.from("sales").select("id", { count: "exact", head: true })
        .not("situacao", "in", "(FINALIZADA,CANCELADO)"),
      // Obras não concluídas
      c.supabase.from("obras").select("id", { count: "exact", head: true }).neq("status", "concluida"),
      // Contas a receber vencidas (em aberto e vencimento passado)
      c.supabase.from("receivables").select("id", { count: "exact", head: true }).eq("status", "ABERTO").lt("vencimento", hoje),
      // Contas a pagar vencidas/a vencer hoje (não canceladas)
      c.supabase.from("payables").select("id", { count: "exact", head: true }).eq("cancelada", false).lte("vencimento", hoje),
    ]);
    return {
      vendas: vendas.count || 0,
      obras: obras.count || 0,
      receber: receber.count || 0,
      pagar: pagar.count || 0,
    };
  } catch {
    return zero;
  }
}
