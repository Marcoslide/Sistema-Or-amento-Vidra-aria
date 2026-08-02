"use client";

import { createClient } from "@/lib/supabase/client";
import { ConnectionError } from "@/lib/data/mode";

// ============ Comercial — leituras (client, RLS-scoped) ============
// Erro NUNCA vira mock: propaga ConnectionError para a UI exibir.

export type VendaRow = {
  id: string; numero: number | null; situacao: string | null; status: string;
  cliente_nome: string | null; vend_nome: string | null; store_id: string;
  total: number; venda_gerada: boolean; created_at: string;
};

export async function listVendas(): Promise<VendaRow[]> {
  const s = createClient();
  const { data, error } = await s
    .from("sales")
    .select("id,numero,situacao,status,cliente_nome,vend_nome,store_id,total,venda_gerada,created_at")
    .order("created_at", { ascending: false });
  if (error) throw new ConnectionError("Não foi possível carregar as vendas: " + error.message);
  return (data || []).map((r) => ({
    id: r.id as string, numero: r.numero as number | null,
    situacao: (r.situacao as string) || (r.status as string), status: r.status as string,
    cliente_nome: r.cliente_nome as string | null, vend_nome: r.vend_nome as string | null,
    store_id: r.store_id as string, total: Number(r.total) || 0,
    venda_gerada: Boolean(r.venda_gerada), created_at: r.created_at as string,
  }));
}

// ---- lista rica (paridade V6): recebido/saldo por venda + nome da loja ----
export type VendaRica = VendaRow & { loja_nome: string; recebido: number; saldo: number };
export async function listVendasRicas(): Promise<VendaRica[]> {
  const s = createClient();
  const base = await listVendas();
  if (!base.length) return [];
  const ids = base.map((v) => v.id);
  const [{ data: recs }, { data: pays }, { data: stores }] = await Promise.all([
    s.from("receivables").select("sale_id,valor").in("sale_id", ids),
    s.from("receivable_payments").select("sale_id,valor,estornado").in("sale_id", ids),
    s.from("stores").select("id,nome"),
  ]);
  const totRecBy: Record<string, number> = {};
  (recs || []).forEach((r) => { const k = r.sale_id as string; if (k) totRecBy[k] = (totRecBy[k] || 0) + (Number(r.valor) || 0); });
  const pagoBy: Record<string, number> = {};
  (pays || []).forEach((p) => { const k = p.sale_id as string; if (k && !p.estornado) pagoBy[k] = (pagoBy[k] || 0) + (Number(p.valor) || 0); });
  const lojaBy: Record<string, string> = {};
  (stores || []).forEach((x) => { lojaBy[x.id as string] = x.nome as string; });
  return base.map((v) => {
    // recebido: baixas da venda; base de cobrança: títulos gerados (ou total, se ainda não houver títulos)
    const recebido = Math.round((pagoBy[v.id] || 0) * 100) / 100;
    const cobravel = totRecBy[v.id] != null && totRecBy[v.id] > 0 ? totRecBy[v.id] : (v.venda_gerada ? v.total : 0);
    const saldo = Math.round(Math.max(0, cobravel - recebido) * 100) / 100;
    return { ...v, loja_nome: lojaBy[v.store_id] || "—", recebido, saldo };
  });
}

// ---- opções para o construtor de orçamento ----
export type Opt = { id: string; nome: string };
export type ProdutoOpt = {
  id: string; descricao: string; regra: string; preco: number; custoBase: number;
  larguraMolduraCm: number; multiplicadorCorte: number; familia: string | null;
};

export async function listLojasSel(): Promise<Opt[]> {
  const s = createClient();
  const { data, error } = await s.from("stores").select("id,nome").eq("ativo", true).order("nome");
  if (error) throw new ConnectionError("Não foi possível carregar as lojas: " + error.message);
  return (data || []).map((r) => ({ id: r.id as string, nome: r.nome as string }));
}

export async function listClientesSel(): Promise<Opt[]> {
  const s = createClient();
  const { data, error } = await s.from("customers").select("id,nome").eq("ativo", true).order("nome");
  if (error) throw new ConnectionError("Não foi possível carregar os clientes: " + error.message);
  return (data || []).map((r) => ({ id: r.id as string, nome: r.nome as string }));
}

export async function listVendedoresSel(): Promise<Opt[]> {
  const s = createClient();
  const { data, error } = await s.from("sellers").select("id,nome").eq("ativo", true).order("nome");
  if (error) throw new ConnectionError("Não foi possível carregar os vendedores: " + error.message);
  return (data || []).map((r) => ({ id: r.id as string, nome: r.nome as string }));
}

export async function listProdutosSel(): Promise<ProdutoOpt[]> {
  const s = createClient();
  const { data, error } = await s
    .from("products")
    .select("id,descricao,regra,preco,custo_base,largura_moldura_cm,multiplicador_corte,familia")
    .eq("ativo", true).order("descricao");
  if (error) throw new ConnectionError("Não foi possível carregar os produtos: " + error.message);
  return (data || []).map((r) => ({
    id: r.id as string, descricao: r.descricao as string, regra: (r.regra as string) || "UN",
    preco: Number(r.preco) || 0, custoBase: Number(r.custo_base) || 0,
    larguraMolduraCm: Number(r.largura_moldura_cm) || 0, multiplicadorCorte: Number(r.multiplicador_corte) || 8,
    familia: (r.familia as string) || null,
  }));
}

// Contexto do usuário logado: vendedor vinculado (vendedor automático) e lojas permitidas.
export type MeuContexto = { sellerId: string | null; vendNome: string | null; lojaIds: string[] };
export async function meuContexto(): Promise<MeuContexto> {
  const s = createClient();
  const { data: u } = await s.auth.getUser();
  const uid = u.user?.id;
  if (!uid) throw new ConnectionError("Sessão não encontrada.");
  const { data: prof } = await s.from("profiles").select("seller_id").eq("id", uid).single();
  const sellerId = (prof?.seller_id as string) || null;
  let vendNome: string | null = null;
  if (sellerId) {
    const { data: sel } = await s.from("sellers").select("nome").eq("id", sellerId).maybeSingle();
    vendNome = (sel?.nome as string) || null;
  }
  const { data: us } = await s.from("user_stores").select("store_id").eq("user_id", uid);
  const lojaIds = (us || []).map((x) => x.store_id as string);
  return { sellerId, vendNome, lojaIds };
}

// ---- carregar um orçamento completo (para edição/duplicação/PDF) ----
export type MedidaFull = { l: number; a: number; q: number; unit: string };
export type ItemFull = {
  id: string; product_id: string | null; regra: string; desc_pct: number;
  preco_override: number | null; medidas: MedidaFull[];
};
export type AmbienteFull = { id: string; nome: string; itens: ItemFull[] };
export type VendaFull = {
  id: string; numero: number | null; situacao: string; status: string; venda_gerada: boolean;
  store_id: string; cliente_id: string | null; cliente_nome: string;
  seller_id: string | null; vend_nome: string;
  obra_nome: string; obra_endereco: string;
  desc_pct: number; acrescimo: number; frete: number; instalacao: number;
  obs: string; obs_interna: string; prazo_dias: number | null; condicao: unknown;
  total: number; custo_prev: number; margem_prev: number; created_at: string;
  ambientes: AmbienteFull[];
};

export type HistoricoRow = { id: string; campo: string; de: string | null; para: string | null; obs: string | null; created_at: string };
export async function getHistorico(saleId: string): Promise<HistoricoRow[]> {
  const s = createClient();
  const { data, error } = await s
    .from("sale_status_history")
    .select("id,campo,de,para,obs,created_at")
    .eq("sale_id", saleId).order("created_at", { ascending: false });
  if (error) throw new ConnectionError("Não foi possível carregar o histórico: " + error.message);
  return (data || []).map((r) => ({
    id: r.id as string, campo: r.campo as string, de: (r.de as string) || null,
    para: (r.para as string) || null, obs: (r.obs as string) || null, created_at: r.created_at as string,
  }));
}

export async function getVenda(id: string): Promise<VendaFull | null> {
  const s = createClient();
  const { data: o, error } = await s.from("sales").select("*").eq("id", id).maybeSingle();
  if (error) throw new ConnectionError("Não foi possível carregar a venda: " + error.message);
  if (!o) return null;
  const { data: envs } = await s.from("sale_environments").select("id,nome").eq("sale_id", id);
  const envIds = (envs || []).map((e) => e.id as string);
  const { data: items } = envIds.length
    ? await s.from("sale_items").select("*").in("environment_id", envIds)
    : { data: [] as Record<string, unknown>[] };
  const itemIds = (items || []).map((i) => i.id as string);
  const { data: measures } = itemIds.length
    ? await s.from("sale_measures").select("*").in("item_id", itemIds)
    : { data: [] as Record<string, unknown>[] };
  const ambientes: AmbienteFull[] = (envs || []).map((e) => ({
    id: e.id as string, nome: e.nome as string,
    itens: (items || []).filter((i) => i.environment_id === e.id).map((i) => ({
      id: i.id as string, product_id: (i.product_id as string) || null, regra: (i.regra as string) || "UN",
      desc_pct: Number(i.desc_pct) || 0, preco_override: i.preco_override != null ? Number(i.preco_override) : null,
      medidas: (measures || []).filter((m) => m.item_id === i.id).map((m) => ({
        l: Number(m.l) || 0, a: Number(m.a) || 0, q: Number(m.q) || 1, unit: (m.unit as string) || "cm",
      })),
    })),
  }));
  return {
    id: o.id as string, numero: o.numero as number | null,
    situacao: (o.situacao as string) || (o.status as string), status: o.status as string,
    venda_gerada: Boolean(o.venda_gerada), store_id: o.store_id as string,
    cliente_id: (o.cliente_id as string) || null, cliente_nome: (o.cliente_nome as string) || "",
    seller_id: (o.seller_id as string) || null, vend_nome: (o.vend_nome as string) || "",
    obra_nome: (o.obra_nome as string) || "", obra_endereco: (o.obra_endereco as string) || "",
    desc_pct: Number(o.desc_pct) || 0, acrescimo: Number(o.acrescimo) || 0,
    frete: Number(o.frete) || 0, instalacao: Number(o.instalacao) || 0,
    obs: (o.obs as string) || "", obs_interna: (o.obs_interna as string) || "",
    prazo_dias: o.prazo_dias != null ? Number(o.prazo_dias) : null, condicao: o.condicao ?? null,
    total: Number(o.total) || 0, custo_prev: Number(o.custo_prev) || 0, margem_prev: Number(o.margem_prev) || 0,
    created_at: o.created_at as string, ambientes,
  };
}
