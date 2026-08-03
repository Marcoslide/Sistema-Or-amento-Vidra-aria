"use server";

import { createClient } from "@/lib/supabase/server";
import { custoHoraHomem, custoHoraMaquina } from "@/lib/custos/calc";

// ============================================================
// Server actions dos cadastros — validação NO SERVIDOR:
//  - permissão (não basta ocultar botão),
//  - exclusão segura (bloqueio por vínculo, senão inativa),
//  - auditoria.
// RLS do Supabase garante o isolamento por organização/loja.
// ============================================================

type Ref = { table: string; col: string; byName?: boolean; label: string };
type EntityDef = {
  table: string;
  label: string;
  deletePerm: string;
  storeScoped?: boolean;      // possui store_id
  nameCol?: string;           // coluna de nome (default "nome")
  vinculos: Ref[];
};

const REG: Record<string, EntityDef> = {
  clientes: {
    table: "customers", label: "cliente", deletePerm: "cad.excluir_clientes", storeScoped: true, nameCol: "nome",
    vinculos: [{ table: "sales", col: "cliente_id", label: "vendas/orçamentos" }],
  },
  lojas: {
    table: "stores", label: "loja", deletePerm: "adm.excluir_lojas", nameCol: "nome",
    vinculos: [
      { table: "sales", col: "store_id", label: "vendas" },
      { table: "customers", col: "store_id", label: "clientes" },
      { table: "financial_accounts", col: "store_id", label: "contas financeiras" },
      { table: "payables", col: "store_id", label: "contas a pagar" },
      { table: "receivables", col: "store_id", label: "contas a receber" },
      { table: "cash_movements", col: "store_id", label: "movimentos de caixa" },
      { table: "user_stores", col: "store_id", label: "usuários vinculados" },
    ],
  },
  vendedores: {
    table: "sellers", label: "vendedor", deletePerm: "cad.excluir_vendedores",
    vinculos: [{ table: "sales", col: "seller_id", label: "vendas" }],
  },
  fornecedores: {
    table: "suppliers", label: "fornecedor", deletePerm: "cad.excluir_fornecedores",
    vinculos: [{ table: "products", col: "fornecedor", byName: true, label: "produtos" }],
  },
  familias: {
    table: "product_families", label: "família", deletePerm: "cad.excluir_familias",
    vinculos: [{ table: "products", col: "familia", byName: true, label: "produtos" }],
  },
  contas: {
    table: "financial_accounts", label: "conta financeira", deletePerm: "fin.excluir_contas", storeScoped: true,
    vinculos: [
      { table: "receivable_payments", col: "conta", byName: true, label: "recebimentos" },
      { table: "payable_payments", col: "conta_fin", byName: true, label: "pagamentos" },
      { table: "card_operators", col: "conta", byName: true, label: "operadoras" },
    ],
  },
  operadoras: {
    table: "card_operators", label: "operadora", deletePerm: "fin.excluir_operadoras", storeScoped: true,
    vinculos: [{ table: "receivable_payments", col: "operadora", byName: true, label: "recebimentos" }],
  },
  "categorias-financeiras": {
    table: "financial_categories", label: "categoria financeira", deletePerm: "fin.excluir_categorias",
    vinculos: [
      { table: "payables", col: "categoria", byName: true, label: "contas a pagar" },
    ],
  },
  produtos: {
    table: "products", label: "produto", deletePerm: "cad.excluir_produtos",
    nameCol: "descricao",
    vinculos: [{ table: "sale_items", col: "product_id", label: "itens de venda" }],
  },
  "centro-custos": {
    table: "cost_centers", label: "centro de custo", deletePerm: "fin.excluir_centros_custo", storeScoped: true,
    vinculos: [
      { table: "labor_costs", col: "centro_custo_id", label: "hora-homem" },
      { table: "machine_costs", col: "centro_custo_id", label: "hora-máquina" },
      { table: "depreciation_assets", col: "centro_custo_id", label: "bens" },
      { table: "payables", col: "centro_custo_id", label: "contas a pagar" },
      { table: "sale_extra_costs", col: "centro_custo_id", label: "custos de venda" },
    ],
  },
  "hora-homem": {
    table: "labor_costs", label: "hora-homem", deletePerm: "fin.excluir_mao_obra", storeScoped: true, vinculos: [],
  },
  "hora-maquina": {
    table: "machine_costs", label: "hora-máquina", deletePerm: "fin.excluir_maquinas", storeScoped: true, vinculos: [],
  },
  depreciacao: {
    table: "depreciation_assets", label: "bem", deletePerm: "fin.excluir_bens", storeScoped: true, vinculos: [],
  },
};

type Ctx = { supabase: ReturnType<typeof createClient>; uid: string; org: string };

async function ctx(): Promise<Ctx> {
  const supabase = createClient();
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) throw new Error("Sessão não encontrada.");
  const { data: prof } = await supabase.from("profiles").select("organization_id").eq("id", uid).single();
  const org = (prof?.organization_id as string) || "";
  if (!org) throw new Error("Usuário sem organização vinculada.");
  return { supabase, uid, org };
}

async function hasPerm(c: Ctx, perm: string): Promise<boolean> {
  const { data: prof } = await c.supabase.from("profiles").select("role_id").eq("id", c.uid).single();
  const role = prof?.role_id as string | undefined;
  if (!role) return false;
  const { count } = await c.supabase
    .from("role_permissions").select("*", { count: "exact", head: true })
    .eq("organization_id", c.org).eq("role_id", role).eq("permission_key", perm);
  return (count || 0) > 0;
}

async function audit(c: Ctx, modulo: string, acao: string, registro: string) {
  await c.supabase.from("audit_log").insert({
    organization_id: c.org, user_id: c.uid, modulo, acao, registro,
  });
}

async function contarVinculos(c: Ctx, def: EntityDef, row: Record<string, unknown>) {
  const det: Array<{ label: string; n: number }> = [];
  for (const ref of def.vinculos) {
    const value = ref.byName ? (row[def.nameCol || "nome"] as string) : (row.id as string);
    if (value == null) continue;
    const { count } = await c.supabase
      .from(ref.table).select("*", { count: "exact", head: true }).eq(ref.col, value);
    if ((count || 0) > 0) det.push({ label: ref.label, n: count || 0 });
  }
  return { total: det.reduce((s, d) => s + d.n, 0), det };
}

export type DeleteResult =
  | { ok: true }
  | { ok: false; blocked: true; det: Array<{ label: string; n: number }> }
  | { ok: false; error: string };

// Exclusão segura: sem vínculo → apaga; com vínculo → bloqueia (o chamador oferece inativar).
export async function acaoExcluir(entity: string, id: string): Promise<DeleteResult> {
  const def = REG[entity];
  if (!def) return { ok: false, error: "Cadastro inválido." };
  try {
    const c = await ctx();
    if (!(await hasPerm(c, def.deletePerm))) return { ok: false, error: "Sem permissão para excluir." };
    const { data: row } = await c.supabase.from(def.table).select("*").eq("id", id).single();
    if (!row) return { ok: false, error: "Registro não encontrado." };
    const vinc = await contarVinculos(c, def, row as Record<string, unknown>);
    if (vinc.total > 0) return { ok: false, blocked: true, det: vinc.det };
    const { error } = await c.supabase.from(def.table).delete().eq("id", id);
    if (error) return { ok: false, error: error.message };
    await audit(c, def.label, "Excluiu " + def.label, String((row as Record<string, unknown>)[def.nameCol || "nome"] ?? id));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function acaoSetAtivo(entity: string, id: string, ativo: boolean): Promise<{ ok: boolean; error?: string }> {
  const def = REG[entity];
  if (!def) return { ok: false, error: "Cadastro inválido." };
  try {
    const c = await ctx();
    const { error } = await c.supabase.from(def.table).update({ ativo }).eq("id", id);
    if (error) return { ok: false, error: error.message };
    await audit(c, def.label, (ativo ? "Reativou " : "Inativou ") + def.label, id);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function acaoSalvar(entity: string, id: string | null, data: Record<string, unknown>): Promise<{ ok: boolean; error?: string; id?: string }> {
  const def = REG[entity];
  if (!def) return { ok: false, error: "Cadastro inválido." };
  try {
    const c = await ctx();
    // Custo/hora é SEMPRE derivado no servidor (não confiar no valor do formulário).
    if (entity === "hora-homem") data.custo_hora = custoHoraHomem(data);
    else if (entity === "hora-maquina") data.custo_hora = custoHoraMaquina(data);
    const payload = { ...data, organization_id: c.org };
    if (id) {
      const { error } = await c.supabase.from(def.table).update(data).eq("id", id);
      if (error) return { ok: false, error: error.message };
      await audit(c, def.label, "Editou " + def.label, String(data[def.nameCol || "nome"] ?? id));
      return { ok: true, id };
    } else {
      const { data: ins, error } = await c.supabase.from(def.table).insert(payload).select("id").single();
      if (error) return { ok: false, error: error.message };
      await audit(c, def.label, "Criou " + def.label, String(data[def.nameCol || "nome"] ?? ""));
      return { ok: true, id: ins?.id as string };
    }
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function acaoDuplicar(entity: string, id: string): Promise<{ ok: boolean; error?: string }> {
  const def = REG[entity];
  if (!def) return { ok: false, error: "Cadastro inválido." };
  try {
    const c = await ctx();
    const { data: row } = await c.supabase.from(def.table).select("*").eq("id", id).single();
    if (!row) return { ok: false, error: "Registro não encontrado." };
    const clone: Record<string, unknown> = { ...(row as Record<string, unknown>) };
    delete clone.id; delete clone.created_at; delete clone.updated_at;
    const nameCol = def.nameCol || "nome";
    clone[nameCol] = String(clone[nameCol] ?? "") + " (cópia)";
    if ("padrao" in clone) clone.padrao = false;
    clone.ativo = true;
    const { error } = await c.supabase.from(def.table).insert(clone);
    if (error) return { ok: false, error: error.message };
    await audit(c, def.label, "Duplicou " + def.label, String(clone[nameCol]));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
