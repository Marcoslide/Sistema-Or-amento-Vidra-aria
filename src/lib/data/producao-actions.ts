"use server";

import { getCtx, ctxHasPerm, ctxAudit } from "@/lib/data/server-ctx";
import { progressoEtapas, type Etapa } from "@/lib/production/calc";

type R = { ok: boolean; error?: string; id?: string };

function dbErro(ctx: string, tecnico: string): string {
  console.error(`[producao] ${ctx}:`, tecnico);
  if (/etapas pendentes|em andamento/i.test(tecnico)) return "Não é possível concluir: há etapas pendentes ou em andamento.";
  if (/terceiriza/i.test(tecnico)) return "Não é possível concluir: há terceirizações não recebidas/conferidas.";
  if (/venda confirmada/i.test(tecnico)) return "Só é possível produzir uma venda confirmada.";
  if (/duplicate key|unique/i.test(tecnico)) return "Já existe uma ordem de produção para esta venda.";
  if (/row-level security|permission denied/i.test(tecnico)) return "Sem permissão para esta operação nesta loja.";
  return "Não foi possível concluir a operação. Tente novamente; se persistir, avise o administrador.";
}

// ---------------- Leituras ----------------
export type OPRow = {
  id: string; numero: number | null; cliente_nome: string | null; status: string; prioridade: string;
  prazo: string | null; responsavel: string | null; store_id: string; pct: number; sale_id: string | null;
};
export async function getProducaoData(): Promise<{ ok: boolean; error?: string; ordens?: OPRow[]; canIniciar?: boolean }> {
  try {
    const c = await getCtx();
    if (!(await ctxHasPerm(c, "prod.ver"))) return { ok: false, error: "Sem permissão para Produção." };
    const { data: ords } = await c.supabase.from("production_orders")
      .select("id,numero,cliente_nome,status,prioridade,prazo,responsavel,store_id,sale_id").order("created_at", { ascending: false });
    const ids = (ords || []).map((o) => o.id as string);
    const { data: stages } = ids.length
      ? await c.supabase.from("production_stages").select("order_id,aplicavel,status").in("order_id", ids)
      : { data: [] as { order_id: string; aplicavel: boolean; status: string }[] };
    const byOrder: Record<string, Etapa[]> = {};
    (stages || []).forEach((s) => { (byOrder[s.order_id as string] ||= []).push({ aplicavel: s.aplicavel, status: s.status as Etapa["status"] }); });
    const ordens: OPRow[] = (ords || []).map((o) => ({
      id: o.id as string, numero: (o.numero as number) ?? null, cliente_nome: (o.cliente_nome as string) || null,
      status: o.status as string, prioridade: (o.prioridade as string) || "normal", prazo: (o.prazo as string) || null,
      responsavel: (o.responsavel as string) || null, store_id: o.store_id as string, sale_id: (o.sale_id as string) || null,
      pct: progressoEtapas(byOrder[o.id as string] || []).pct,
    }));
    return { ok: true, ordens, canIniciar: await ctxHasPerm(c, "prod.iniciar") };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

export type EtapaRow = { id: string; nome: string; ordem: number; aplicavel: boolean; status: string };
export type ItemRow = { id: string; descricao: string | null; regra: string | null; largura: number | null; altura: number | null; unidade: string; quantidade: number; status: string; vidro: string | null; espelho: string | null; acabamento: string | null };
export type TercRow = { id: string; fornecedor: string | null; servico: string | null; data_envio: string | null; previsao: string | null; status: string; recebido: boolean; conferido: boolean };
export type ApontRow = { id: string; etapa: string | null; funcionario: string | null; duracao_min: number; quantidade: number; created_at: string };
export type OPFull = {
  ordem: { id: string; numero: number | null; cliente_nome: string | null; status: string; prioridade: string; prazo: string | null; responsavel: string | null; obs: string | null; sale_id: string | null };
  etapas: EtapaRow[]; itens: ItemRow[]; terceirizacoes: TercRow[]; apontamentos: ApontRow[]; pct: number;
  perms: { apontar: boolean; terceirizar: boolean; conferir: boolean; concluir: boolean };
};
export async function getOP(id: string): Promise<{ ok: boolean; error?: string; data?: OPFull }> {
  try {
    const c = await getCtx();
    if (!(await ctxHasPerm(c, "prod.ver"))) return { ok: false, error: "Sem permissão para Produção." };
    const { data: o } = await c.supabase.from("production_orders").select("*").eq("id", id).maybeSingle();
    if (!o) return { ok: false, error: "Ordem não encontrada." };
    const [{ data: et }, { data: it }, { data: te }, { data: ap }] = await Promise.all([
      c.supabase.from("production_stages").select("id,nome,ordem,aplicavel,status").eq("order_id", id).order("ordem"),
      c.supabase.from("production_order_items").select("id,descricao,regra,largura,altura,unidade,quantidade,status,vidro,espelho,acabamento").eq("order_id", id),
      c.supabase.from("production_outsourcing").select("id,fornecedor,servico,data_envio,previsao,status,recebido,conferido").eq("order_id", id),
      c.supabase.from("production_time_entries").select("id,etapa,funcionario,duracao_min,quantidade,created_at").eq("order_id", id).order("created_at", { ascending: false }),
    ]);
    const etapas = (et || []).map((s) => ({ id: s.id as string, nome: s.nome as string, ordem: Number(s.ordem) || 0, aplicavel: s.aplicavel !== false, status: s.status as string }));
    return {
      ok: true,
      data: {
        ordem: { id: o.id as string, numero: (o.numero as number) ?? null, cliente_nome: (o.cliente_nome as string) || null, status: o.status as string, prioridade: (o.prioridade as string) || "normal", prazo: (o.prazo as string) || null, responsavel: (o.responsavel as string) || null, obs: (o.obs as string) || null, sale_id: (o.sale_id as string) || null },
        etapas,
        itens: (it || []).map((x) => ({ id: x.id as string, descricao: (x.descricao as string) || null, regra: (x.regra as string) || null, largura: x.largura != null ? Number(x.largura) : null, altura: x.altura != null ? Number(x.altura) : null, unidade: (x.unidade as string) || "cm", quantidade: Number(x.quantidade) || 0, status: (x.status as string) || "PENDENTE", vidro: (x.vidro as string) || null, espelho: (x.espelho as string) || null, acabamento: (x.acabamento as string) || null })),
        terceirizacoes: (te || []).map((x) => ({ id: x.id as string, fornecedor: (x.fornecedor as string) || null, servico: (x.servico as string) || null, data_envio: (x.data_envio as string) || null, previsao: (x.previsao as string) || null, status: (x.status as string) || "ENVIADO", recebido: Boolean(x.recebido), conferido: Boolean(x.conferido) })),
        apontamentos: (ap || []).map((x) => ({ id: x.id as string, etapa: (x.etapa as string) || null, funcionario: (x.funcionario as string) || null, duracao_min: Number(x.duracao_min) || 0, quantidade: Number(x.quantidade) || 0, created_at: x.created_at as string })),
        pct: progressoEtapas(etapas.map((e) => ({ aplicavel: e.aplicavel, status: e.status as Etapa["status"] }))).pct,
        perms: {
          apontar: await ctxHasPerm(c, "prod.apontar"), terceirizar: await ctxHasPerm(c, "prod.terceirizar"),
          conferir: await ctxHasPerm(c, "prod.conferir"), concluir: await ctxHasPerm(c, "prod.concluir") || await ctxHasPerm(c, "prod.iniciar"),
        },
      },
    };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}

// ---------------- Escritas ----------------
export async function iniciarProducao(saleId: string): Promise<R> {
  try {
    const c = await getCtx();
    if (!(await ctxHasPerm(c, "prod.iniciar"))) return { ok: false, error: "Sem permissão para iniciar produção." };
    const { data, error } = await c.supabase.rpc("fn_iniciar_producao", { p_sale_id: saleId, p_etapas: null });
    if (error) return { ok: false, error: dbErro("fn_iniciar_producao", error.message) };
    await ctxAudit(c, "Produção", "Iniciou produção", saleId);
    return { ok: true, id: (data as { order_id?: string })?.order_id };
  } catch (e) { return { ok: false, error: dbErro("iniciarProducao", (e as Error).message) }; }
}

export async function mudarEtapa(stageId: string, status: string): Promise<R> {
  try {
    const c = await getCtx();
    if (!(await ctxHasPerm(c, "prod.apontar")) && !(await ctxHasPerm(c, "prod.iniciar"))) return { ok: false, error: "Sem permissão." };
    const { error } = await c.supabase.from("production_stages").update({ status, updated_by: c.uid, updated_at: new Date().toISOString() }).eq("id", stageId);
    if (error) return { ok: false, error: dbErro("update stage", error.message) };
    await ctxAudit(c, "Produção", "Etapa → " + status, stageId);
    return { ok: true };
  } catch (e) { return { ok: false, error: dbErro("mudarEtapa", (e as Error).message) }; }
}

export async function setEtapaAplicavel(stageId: string, aplicavel: boolean): Promise<R> {
  try {
    const c = await getCtx();
    if (!(await ctxHasPerm(c, "prod.iniciar"))) return { ok: false, error: "Sem permissão." };
    const { error } = await c.supabase.from("production_stages").update({ aplicavel }).eq("id", stageId);
    if (error) return { ok: false, error: dbErro("update stage aplicavel", error.message) };
    return { ok: true };
  } catch (e) { return { ok: false, error: dbErro("setEtapaAplicavel", (e as Error).message) }; }
}

export async function addTerceirizacao(orderId: string, dados: { fornecedor: string; servico: string; previsao?: string }): Promise<R> {
  try {
    const c = await getCtx();
    if (!(await ctxHasPerm(c, "prod.terceirizar"))) return { ok: false, error: "Sem permissão." };
    const { error } = await c.supabase.from("production_outsourcing").insert({ organization_id: c.org, order_id: orderId, fornecedor: dados.fornecedor, servico: dados.servico, previsao: dados.previsao || null, status: "ENVIADO" });
    if (error) return { ok: false, error: dbErro("insert terceirizacao", error.message) };
    await ctxAudit(c, "Produção", "Terceirização criada", orderId);
    return { ok: true };
  } catch (e) { return { ok: false, error: dbErro("addTerceirizacao", (e as Error).message) }; }
}

export async function receberTerceirizacao(id: string, campo: "recebido" | "conferido", valor: boolean): Promise<R> {
  try {
    const c = await getCtx();
    const perm = campo === "conferido" ? "prod.conferir" : "prod.terceirizar";
    if (!(await ctxHasPerm(c, perm))) return { ok: false, error: "Sem permissão." };
    const patch: Record<string, unknown> = { [campo]: valor };
    if (campo === "recebido" && valor) patch.status = "RECEBIDO";
    const { error } = await c.supabase.from("production_outsourcing").update(patch).eq("id", id);
    if (error) return { ok: false, error: dbErro("update terceirizacao", error.message) };
    return { ok: true };
  } catch (e) { return { ok: false, error: dbErro("receberTerceirizacao", (e as Error).message) }; }
}

export async function apontar(orderId: string, dados: { etapa?: string; funcionario: string; duracao_min: number; quantidade: number; obs?: string }): Promise<R> {
  try {
    const c = await getCtx();
    if (!(await ctxHasPerm(c, "prod.apontar"))) return { ok: false, error: "Sem permissão para apontar." };
    const { error } = await c.supabase.from("production_time_entries").insert({
      organization_id: c.org, order_id: orderId, etapa: dados.etapa || null, funcionario: dados.funcionario,
      duracao_min: Math.trunc(dados.duracao_min) || 0, quantidade: dados.quantidade || 0, obs: dados.obs || null, created_by: c.uid,
    });
    if (error) return { ok: false, error: dbErro("insert apontamento", error.message) };
    await ctxAudit(c, "Produção", "Apontamento", orderId);
    return { ok: true };
  } catch (e) { return { ok: false, error: dbErro("apontar", (e as Error).message) }; }
}

export async function concluirProducao(orderId: string): Promise<R> {
  try {
    const c = await getCtx();
    if (!(await ctxHasPerm(c, "prod.concluir")) && !(await ctxHasPerm(c, "prod.iniciar"))) return { ok: false, error: "Sem permissão para concluir." };
    const { error } = await c.supabase.rpc("fn_concluir_producao", { p_order_id: orderId });
    if (error) return { ok: false, error: dbErro("fn_concluir_producao", error.message) };
    await ctxAudit(c, "Produção", "Concluiu produção", orderId);
    return { ok: true };
  } catch (e) { return { ok: false, error: dbErro("concluirProducao", (e as Error).message) }; }
}

// ---------------- Dashboard ----------------
export type DashProducao = { aguardando: number; emAndamento: number; concluidas: number; atrasadas: number; tercPendentes: number };
export async function getDashboardProducao(): Promise<{ ok: boolean; error?: string; data?: DashProducao }> {
  try {
    const c = await getCtx();
    if (!(await ctxHasPerm(c, "prod.ver"))) return { ok: false, error: "Sem permissão." };
    const { data: ords } = await c.supabase.from("production_orders").select("status,prazo");
    const hoje = new Date().toISOString().slice(0, 10);
    const aguardando = (ords || []).filter((o) => o.status === "AGUARDANDO").length;
    const emAndamento = (ords || []).filter((o) => o.status === "EM_PRODUCAO").length;
    const concluidas = (ords || []).filter((o) => o.status === "CONCLUIDA").length;
    const atrasadas = (ords || []).filter((o) => o.status !== "CONCLUIDA" && o.prazo && (o.prazo as string) < hoje).length;
    const { count: tercPendentes } = await c.supabase.from("production_outsourcing").select("*", { count: "exact", head: true }).or("recebido.eq.false,conferido.eq.false");
    return { ok: true, data: { aguardando, emAndamento, concluidas, atrasadas, tercPendentes: tercPendentes || 0 } };
  } catch (e) { return { ok: false, error: (e as Error).message }; }
}
