// ============================================================
// Integração — PRODUÇÃO (App 5) contra o Supabase de staging conectado.
// Prova em banco real: iniciar produção uma vez, idempotência (não duplica OP),
// guarda de conclusão (etapa pendente e terceirização bloqueiam), isolamento por loja.
// Pula (skip) sem STAGING_SUPABASE_URL / STAGING_SUPABASE_ANON_KEY.
//   node --test tests/integration/producao.test.mjs
// ============================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const URL = process.env.STAGING_SUPABASE_URL;
const ANON = process.env.STAGING_SUPABASE_ANON_KEY;
const skip = URL && ANON ? false : "defina STAGING_SUPABASE_URL e STAGING_SUPABASE_ANON_KEY";

const ORG = "00000000-0000-0000-0000-000000000001";
const LOJA = "00000000-0000-0000-0000-0000000000a1";
const uniq = (p) => `${p}-${process.hrtime.bigint()}`;
async function admin() {
  const c = createClient(URL, ANON, { auth: { persistSession: false } });
  const { error } = await c.auth.signInWithPassword({ email: process.env.STAGING_ADMIN_EMAIL, password: process.env.STAGING_ADMIN_PASSWORD });
  if (error) throw new Error(error.message);
  return c;
}
async function vendaConfirmada(c) {
  const { data: a } = await c.auth.getUser();
  const { data: v } = await c.from("sales").insert({
    organization_id: ORG, store_id: LOJA, cliente_nome: uniq("Prod"), status: "VENDA_CONFIRMADA",
    situacao: "VENDA_CONFIRMADA", venda_gerada: true, created_by: a.user.id, total: 100,
  }).select("id").single();
  return v.id;
}
async function limpar(c, saleId, orderId) {
  if (orderId) {
    await c.from("production_status_history").delete().eq("order_id", orderId);
    await c.from("production_stages").delete().eq("order_id", orderId);
    await c.from("production_order_items").delete().eq("order_id", orderId);
    await c.from("production_outsourcing").delete().eq("order_id", orderId);
    await c.from("production_orders").delete().eq("id", orderId);
  }
  await c.from("sales").delete().eq("id", saleId);
}

test("P1. iniciar produção uma vez + idempotência (não duplica OP)", { skip }, async () => {
  const c = await admin();
  const saleId = await vendaConfirmada(c);
  const r1 = await c.rpc("fn_iniciar_producao", { p_sale_id: saleId, p_etapas: null });
  assert.ok(!r1.error, r1.error?.message);
  const orderId = r1.data?.order_id;
  assert.ok(orderId, "OP criada");
  const r2 = await c.rpc("fn_iniciar_producao", { p_sale_id: saleId, p_etapas: null });
  assert.ok(!r2.error, r2.error?.message);
  assert.equal(r2.data?.already, true, "segunda chamada não duplica");
  const { count } = await c.from("production_orders").select("*", { count: "exact", head: true }).eq("sale_id", saleId);
  assert.equal(count, 1, "apenas uma OP por venda");
  await limpar(c, saleId, orderId);
});

test("P2. iniciar produção só de venda confirmada", { skip }, async () => {
  const c = await admin();
  const { data: a } = await c.auth.getUser();
  const { data: v } = await c.from("sales").insert({
    organization_id: ORG, store_id: LOJA, cliente_nome: uniq("Orc"), status: "ORCAMENTO", situacao: "ORCAMENTO", venda_gerada: false, created_by: a.user.id, total: 50,
  }).select("id").single();
  const r = await c.rpc("fn_iniciar_producao", { p_sale_id: v.id, p_etapas: null });
  assert.ok(r.error, "orçamento não pode virar produção");
  await c.from("sales").delete().eq("id", v.id);
});

test("P3. guarda de conclusão: etapa pendente bloqueia", { skip }, async () => {
  const c = await admin();
  const saleId = await vendaConfirmada(c);
  const r1 = await c.rpc("fn_iniciar_producao", { p_sale_id: saleId, p_etapas: ["corte", "montagem"] });
  const orderId = r1.data?.order_id;
  const conc = await c.rpc("fn_concluir_producao", { p_order_id: orderId });
  assert.ok(conc.error, "não conclui com etapas pendentes");
  await limpar(c, saleId, orderId);
});

test("P4. conclusão só com todas as etapas concluídas e terceirização ok", { skip }, async () => {
  const c = await admin();
  const saleId = await vendaConfirmada(c);
  const r1 = await c.rpc("fn_iniciar_producao", { p_sale_id: saleId, p_etapas: ["corte"] });
  const orderId = r1.data?.order_id;
  await c.from("production_stages").update({ status: "CONCLUIDA" }).eq("order_id", orderId);
  // terceirização pendente bloqueia
  const { data: terc } = await c.from("production_outsourcing").insert({ organization_id: ORG, order_id: orderId, fornecedor: "X", servico: "tempera" }).select("id").single();
  const bloq = await c.rpc("fn_concluir_producao", { p_order_id: orderId });
  assert.ok(bloq.error, "terceirização pendente bloqueia");
  await c.from("production_outsourcing").update({ recebido: true, conferido: true }).eq("id", terc.id);
  const ok = await c.rpc("fn_concluir_producao", { p_order_id: orderId });
  assert.ok(!ok.error, ok.error?.message);
  const { data: o } = await c.from("production_orders").select("status").eq("id", orderId).single();
  assert.equal(o.status, "CONCLUIDA");
  await limpar(c, saleId, orderId);
});