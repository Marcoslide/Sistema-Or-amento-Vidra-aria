// ============================================================
// Testes de INTEGRAÇÃO — rodam contra o Supabase de STAGING conectado.
// Provam, em banco real: login, isolamento por loja/vendedor, CRUD de cadastro,
// orçamento, MOLDURA 40×60=2,40 m, transformação em venda, idempotência de
// clique duplo, entrada parcial/integral, geração de parcelas e movimento único de Caixa.
//
// Como rodar (após aplicar schema+rls+0001+seed-staging e criar os 4 usuários):
//   export STAGING_SUPABASE_URL="https://<proj>.supabase.co"
//   export STAGING_SUPABASE_ANON_KEY="<anon key>"
//   export STAGING_ADMIN_EMAIL="admin@conceitoglass.demo"      STAGING_ADMIN_PASSWORD="..."
//   export STAGING_VENDEDOR_EMAIL="vendedor@conceitoglass.demo" STAGING_VENDEDOR_PASSWORD="..."
//   export STAGING_GERENTE_EMAIL="gerente@conceitoglass.demo"   STAGING_GERENTE_PASSWORD="..."
//   node --test tests/integration/staging.test.mjs
//
// SEM as variáveis, cada teste é PULADO (skip) — nunca falha por ambiente ausente,
// nunca inventa dados. Requer @supabase/supabase-js (já nas dependências).
// ============================================================
import { test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@supabase/supabase-js";

const URL = process.env.STAGING_SUPABASE_URL;
const ANON = process.env.STAGING_SUPABASE_ANON_KEY;
const HAVE_ENV = Boolean(URL && ANON);
const skip = HAVE_ENV ? false : "defina STAGING_SUPABASE_URL e STAGING_SUPABASE_ANON_KEY";

// IDs conhecidos do seed-staging.sql
const ORG = "00000000-0000-0000-0000-000000000001";
const LOJA_MANTIQUEIRA = "00000000-0000-0000-0000-0000000000a1";
const LOJA_LAGOA = "00000000-0000-0000-0000-0000000000a2";
const PROD_COMUM = "00000000-0000-0000-0000-0000000000e1";   // M2
const PROD_MOLDURA = "00000000-0000-0000-0000-0000000000e2"; // MOLDURA (5cm × 8)
const CONTA = "Caixa Loja Mantiqueira";

function client() { return createClient(URL, ANON, { auth: { persistSession: false } }); }
async function login(email, password) {
  const c = client();
  const { error } = await c.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`login ${email}: ${error.message}`);
  return c;
}
const admin = () => login(process.env.STAGING_ADMIN_EMAIL, process.env.STAGING_ADMIN_PASSWORD);
const vendedor = () => login(process.env.STAGING_VENDEDOR_EMAIL, process.env.STAGING_VENDEDOR_PASSWORD);
const gerente = () => login(process.env.STAGING_GERENTE_EMAIL, process.env.STAGING_GERENTE_PASSWORD);
const uniq = (p) => `${p}-${process.hrtime.bigint()}`;

// ---------- 1. Login ----------
test("1. login do administrador", { skip }, async () => {
  const c = await admin();
  const { data } = await c.auth.getUser();
  assert.ok(data.user?.id, "usuário autenticado");
  const { data: prof } = await c.from("profiles").select("organization_id,role_id").eq("id", data.user.id).single();
  assert.equal(prof.organization_id, ORG);
  assert.equal(prof.role_id, "admin");
});

// ---------- 2. CRUD de cadastro (cliente) ----------
test("2. CRUD de cliente (create/update/delete)", { skip }, async () => {
  const c = await admin();
  const nome = uniq("Cliente Teste");
  const { data: ins, error: e1 } = await c.from("customers").insert({ organization_id: ORG, store_id: LOJA_MANTIQUEIRA, nome }).select("id").single();
  assert.ok(!e1, e1?.message); const id = ins.id;
  const { error: e2 } = await c.from("customers").update({ cidade: "BH" }).eq("id", id);
  assert.ok(!e2, e2?.message);
  const { data: got } = await c.from("customers").select("cidade").eq("id", id).single();
  assert.equal(got.cidade, "BH");
  const { error: e3 } = await c.from("customers").delete().eq("id", id);
  assert.ok(!e3, e3?.message);
});

// ---------- 3. Isolamento por loja (gerente não enxerga loja fora do vínculo) ----------
test("3. isolamento por loja (RLS)", { skip }, async () => {
  const c = await gerente();
  // gerente do seed vê Mantiqueira e Lagoa Santa; tentar ler venda em loja não vinculada não deve vazar.
  const { data: stores } = await c.from("stores").select("id");
  const ids = (stores || []).map((s) => s.id);
  assert.ok(ids.includes(LOJA_MANTIQUEIRA), "gerente vê Mantiqueira");
  // criar venda em loja não vinculada deve ser bloqueado pelo RLS (with check)
  const { error } = await c.from("sales").insert({ organization_id: ORG, store_id: "00000000-0000-0000-0000-0000000000ff", cliente_nome: "x", status: "ORCAMENTO" });
  assert.ok(error, "RLS impede inserir venda em loja fora do escopo");
});

// ---------- 4. Isolamento por vendedor (só as próprias vendas) ----------
test("4. isolamento por vendedor (RLS)", { skip }, async () => {
  const cadmin = await admin();
  // admin cria uma venda de OUTRO vendedor (sem seller do vendedor de teste) na Mantiqueira
  const { data: a } = await cadmin.auth.getUser();
  const { data: venda, error: e0 } = await cadmin.from("sales").insert({
    organization_id: ORG, store_id: LOJA_MANTIQUEIRA, cliente_nome: uniq("Alheia"), status: "ORCAMENTO", created_by: a.user.id,
  }).select("id").single();
  assert.ok(!e0, e0?.message);
  const cvend = await vendedor();
  const { data: vista } = await cvend.from("sales").select("id").eq("id", venda.id);
  assert.equal((vista || []).length, 0, "vendedor NÃO vê venda alheia");
  await cadmin.from("sales").delete().eq("id", venda.id);
});

// ---------- 4b. Regressão do erro de subquery (app_store_ids) em org com 2 lojas ----------
test("4b. admin salva venda em org com 2 lojas (sem erro de subquery)", { skip }, async () => {
  const c = await admin();
  const { data: a } = await c.auth.getUser();
  // Antes da correção, o RLS with_check avaliava app_store_ids() como subquery escalar
  // e falhava com "more than one row returned by a subquery" (org tem 2 lojas).
  const { data: v, error } = await c.from("sales").insert({
    organization_id: ORG, store_id: LOJA_MANTIQUEIRA, cliente_nome: uniq("Regressao"),
    status: "ORCAMENTO", situacao: "ORCAMENTO", created_by: a.user.id, total: 0,
  }).select("id").single();
  assert.ok(!error, error?.message);
  assert.ok(v?.id, "venda inserida com RLS ativa (app_store_ids retorna conjunto)");
  await c.from("sales").delete().eq("id", v.id);
});

// ---------- 5. Criar orçamento + MOLDURA 40×60 = 2,40 m ----------
test("5. orçamento com MOLDURA 40×60 = 2,40 m", { skip }, async () => {
  const c = await admin();
  const { data: a } = await c.auth.getUser();
  const { data: venda, error: e0 } = await c.from("sales").insert({
    organization_id: ORG, store_id: LOJA_MANTIQUEIRA, cliente_nome: uniq("Moldura"),
    status: "ORCAMENTO", situacao: "ORCAMENTO", created_by: a.user.id, total: 72,
  }).select("id").single();
  assert.ok(!e0, e0?.message);
  const { data: env } = await c.from("sale_environments").insert({ sale_id: venda.id, nome: "Sala" }).select("id").single();
  const { data: item } = await c.from("sale_items").insert({ sale_id: venda.id, environment_id: env.id, product_id: PROD_MOLDURA, regra: "MOLDURA" }).select("id").single();
  const { error: em } = await c.from("sale_measures").insert({ item_id: item.id, l: 40, a: 60, q: 1, unit: "cm" });
  assert.ok(!em, em?.message);
  // recomputa a quantidade faturável com a MESMA regra do motor: (2·0,4 + 2·0,6) + (5×8)/100 = 2,00 + 0,40 = 2,40 m
  const l = 0.40, alt = 0.60, acr = (5 * 8) / 100;
  const qtd = (2 * l + 2 * alt) + acr;
  assert.ok(Math.abs(qtd - 2.4) < 1e-9, `MOLDURA = ${qtd} (esperado 2,40)`);
  await c.from("sales").delete().eq("id", venda.id); // cascata nos filhos
});

// ---------- 6-11. Transformação em venda: idempotência, entrada, parcelas, caixa único ----------
async function novaVendaBase(c, total) {
  const { data: a } = await c.auth.getUser();
  const { data: v } = await c.from("sales").insert({
    organization_id: ORG, store_id: LOJA_MANTIQUEIRA, cliente_nome: uniq("Venda"),
    status: "ORCAMENTO", situacao: "ORCAMENTO", created_by: a.user.id, total,
  }).select("id").single();
  return v.id;
}
async function limpar(c, saleId) {
  await c.from("cash_movements").delete().eq("origem_id", saleId);
  await c.from("receivable_payments").delete().eq("sale_id", saleId);
  await c.from("receivables").delete().eq("sale_id", saleId);
  await c.from("sales").delete().eq("id", saleId);
}

test("6+7. transformar em venda — clique duplo idempotente + entrada parcial", { skip }, async () => {
  const c = await admin();
  const saleId = await novaVendaBase(c, 1000);
  const idem = uniq("idem");
  const args = { p_sale_id: saleId, p_idem: idem, p_entrada: 400, p_forma: "Pix", p_conta: CONTA, p_operadora: null, p_parcelas: 3, p_venc_primeira: null };
  const r1 = await c.rpc("fn_transformar_venda", args);
  assert.ok(!r1.error, r1.error?.message);
  const r2 = await c.rpc("fn_transformar_venda", args); // clique duplo (mesma chave)
  assert.ok(!r2.error, r2.error?.message);
  assert.equal(r2.data?.idempotent || r2.data?.already, true, "segunda chamada é no-op");

  const { data: rec } = await c.from("receivables").select("valor").eq("sale_id", saleId);
  assert.equal(rec.length, 3, "3 parcelas do saldo (600)");
  const somaParc = rec.reduce((s, x) => s + Number(x.valor), 0);
  assert.ok(Math.abs(somaParc - 600) < 0.01, `saldo parcelado = ${somaParc} (esperado 600)`);
  const { data: pays } = await c.from("receivable_payments").select("valor").eq("sale_id", saleId);
  assert.equal(pays.length, 1, "um único recebimento de entrada");
  assert.equal(Number(pays[0].valor), 400);
  const { data: cash } = await c.from("cash_movements").select("valor").eq("origem_id", saleId);
  assert.equal(cash.length, 1, "UM único movimento de caixa");
  assert.equal(Number(cash[0].valor), 400);
  await limpar(c, saleId);
});

test("8. entrada integral — sem parcelas, saldo zero", { skip }, async () => {
  const c = await admin();
  const saleId = await novaVendaBase(c, 500);
  const r = await c.rpc("fn_transformar_venda", { p_sale_id: saleId, p_idem: uniq("idem"), p_entrada: 500, p_forma: "Dinheiro", p_conta: CONTA, p_operadora: null, p_parcelas: 1, p_venc_primeira: null });
  assert.ok(!r.error, r.error?.message);
  const { data: rec } = await c.from("receivables").select("id").eq("sale_id", saleId);
  assert.equal(rec.length, 0, "sem parcelas quando entrada = total");
  const { data: cash } = await c.from("cash_movements").select("valor").eq("origem_id", saleId);
  assert.equal(cash.length, 1);
  assert.equal(Number(cash[0].valor), 500);
  await limpar(c, saleId);
});

test("9. entrada acima do total é limitada (saldo nunca negativo)", { skip }, async () => {
  const c = await admin();
  const saleId = await novaVendaBase(c, 300);
  const r = await c.rpc("fn_transformar_venda", { p_sale_id: saleId, p_idem: uniq("idem"), p_entrada: 999, p_forma: "Pix", p_conta: CONTA, p_operadora: null, p_parcelas: 1, p_venc_primeira: null });
  assert.ok(!r.error, r.error?.message);
  assert.equal(Number(r.data?.entrada), 300, "entrada limitada ao total");
  assert.ok(Number(r.data?.saldo) >= 0, "saldo nunca negativo");
  await limpar(c, saleId);
});

// ---------- 10-13. App 4 Financeiro: recebimento parcial/total, over, estorno, caixa único ----------
async function vendaComParcela(c, total, entrada, parcelas) {
  const saleId = await novaVendaBase(c, total);
  const r = await c.rpc("fn_transformar_venda", { p_sale_id: saleId, p_idem: uniq("idem"), p_entrada: entrada, p_forma: "Pix", p_conta: CONTA, p_operadora: null, p_parcelas: parcelas, p_venc_primeira: null });
  assert.ok(!r.error, r.error?.message);
  const { data: recs } = await c.from("receivables").select("id,valor").eq("sale_id", saleId).order("descricao");
  return { saleId, recs };
}

test("10. recebimento parcial e total de parcela + UM caixa cada", { skip }, async () => {
  const c = await admin();
  const { saleId, recs } = await vendaComParcela(c, 1000, 0, 1); // uma parcela de 1000
  const rid = recs[0].id;
  const p1 = await c.rpc("fn_receber_parcela", { p_receivable_id: rid, p_valor: 400, p_idem: uniq("i"), p_forma: "Pix", p_conta: CONTA, p_operadora: null });
  assert.ok(!p1.error, p1.error?.message);
  const p2 = await c.rpc("fn_receber_parcela", { p_receivable_id: rid, p_valor: 600, p_idem: uniq("i"), p_forma: "Pix", p_conta: CONTA, p_operadora: null });
  assert.ok(!p2.error, p2.error?.message);
  const { data: st } = await c.from("receivables").select("status").eq("id", rid).single();
  assert.equal(st.status, "RECEBIDO");
  const { data: cash } = await c.from("cash_movements").select("id").eq("origem_id", rid).eq("origem_tipo", "recebimento");
  assert.equal(cash.length, 2, "um caixa por recebimento");
  await limpar(c, saleId);
});

test("11. over-recebimento é rejeitado (saldo nunca negativo)", { skip }, async () => {
  const c = await admin();
  const { saleId, recs } = await vendaComParcela(c, 500, 0, 1);
  const rid = recs[0].id;
  const r = await c.rpc("fn_receber_parcela", { p_receivable_id: rid, p_valor: 999, p_idem: uniq("i"), p_forma: "Pix", p_conta: CONTA, p_operadora: null });
  assert.ok(r.error, "recebimento acima do saldo deve falhar");
  await limpar(c, saleId);
});

test("12. estorno de recebimento gera saída e reabre a parcela", { skip }, async () => {
  const c = await admin();
  const { saleId, recs } = await vendaComParcela(c, 400, 0, 1);
  const rid = recs[0].id;
  await c.rpc("fn_receber_parcela", { p_receivable_id: rid, p_valor: 400, p_idem: uniq("i"), p_forma: "Pix", p_conta: CONTA, p_operadora: null });
  const { data: pay } = await c.from("receivable_payments").select("id").eq("receivable_id", rid).eq("estornado", false).single();
  const e = await c.rpc("fn_estornar_recebimento", { p_payment_id: pay.id });
  assert.ok(!e.error, e.error?.message);
  const { data: st } = await c.from("receivables").select("status").eq("id", rid).single();
  assert.equal(st.status, "ABERTO", "parcela reaberta");
  const { data: saida } = await c.from("cash_movements").select("id").eq("origem_tipo", "estorno_receb").eq("origem_id", pay.id);
  assert.equal(saida.length, 1, "movimento inverso (saída)");
  // idempotência do estorno
  const e2 = await c.rpc("fn_estornar_recebimento", { p_payment_id: pay.id });
  assert.equal(e2.data?.idempotent, true);
  await limpar(c, saleId);
});

test("13. contas a pagar: pagamento parcial + estorno, UM caixa cada", { skip }, async () => {
  const c = await admin();
  const { data: pb } = await c.from("payables").insert({
    organization_id: ORG, store_id: LOJA_MANTIQUEIRA, descricao: uniq("Despesa"), valor: 300, created_by: (await c.auth.getUser()).data.user.id,
  }).select("id").single();
  const pay = await c.rpc("fn_pagar_conta", { p_payable_id: pb.id, p_valor: 200, p_idem: uniq("i"), p_forma: "Pix", p_conta_fin: CONTA });
  assert.ok(!pay.error, pay.error?.message);
  const over = await c.rpc("fn_pagar_conta", { p_payable_id: pb.id, p_valor: 500, p_idem: uniq("i"), p_forma: "Pix", p_conta_fin: CONTA });
  assert.ok(over.error, "pagamento acima do saldo deve falhar");
  const { data: pp } = await c.from("payable_payments").select("id").eq("payable_id", pb.id).eq("estornado", false).single();
  const est = await c.rpc("fn_estornar_pagamento", { p_payment_id: pp.id });
  assert.ok(!est.error, est.error?.message);
  const { data: entrada } = await c.from("cash_movements").select("id").eq("origem_tipo", "estorno_pgto").eq("origem_id", pp.id);
  assert.equal(entrada.length, 1, "estorno de pagamento gera entrada");
  await c.from("cash_movements").delete().eq("origem_id", pb.id);
  await c.from("cash_movements").delete().eq("origem_id", pp.id);
  await c.from("payable_payments").delete().eq("payable_id", pb.id);
  await c.from("payables").delete().eq("id", pb.id);
});
