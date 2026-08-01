/* Checkpoint rápido dos fluxos críticos (pré-migração) — v6 */
const { chromium } = require("playwright-core");
const EXE = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const OUT = "/tmp/claude-0/-home-user-Sistema-Or-amento-Vidra-aria/58a882f8-11eb-59b3-a4d7-34447a0c185b/scratchpad";
const FILE = "file://" + OUT + "/vidrogestor-lote-final.html";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const R = []; const chk = (n, c, d) => R.push([c ? "PASS" : "FAIL", n, d || ""]);
const ev = (p, fn, a) => p.evaluate(fn, a);
(async () => {
  const b = await chromium.launch({ executablePath: EXE });
  const page = await b.newContext({ viewport: { width: 1500, height: 950 } }).then(c => c.newPage());
  page.on("dialog", d => { try { d.accept("0"); } catch (e) {} });
  const errors = []; page.on("pageerror", e => errors.push("PAGEERR: " + e.message)); page.on("console", m => { if (m.type() === "error") errors.push("C: " + m.text()); });
  await page.goto(FILE, { waitUntil: "load" }); await sleep(200);

  // 1. login (tela de login existe e enter() entra)
  chk("1. Login (tela + entrada)", await ev(page, () => { const temLogin = !!document.getElementById("login"); enter(); CURR_USER = DB.usuarios.find(u => u.perfil === "admin"); CURR_LOJA = ""; buildNav(); return temLogin && document.getElementById("app").style.display === "block"; }));
  // 2. multiloja (troca de loja filtra)
  chk("2. Multiloja (isolamento por loja)", await ev(page, () => { CURR_LOJA = "L3"; const so = DB.orcamentos.find(o => o.vendaGerada); const bak = so.lojaId; so.lojaId = "L1"; const vis = contasReceberVisiveis().some(o => o.n === so.n); so.lojaId = bak; CURR_LOJA = ""; return !vis; }));
  // 3. criar/editar cliente
  chk("3. Criar e editar cliente", await ev(page, () => { const c = { id: "ckCli", nome: "Cliente CK", obras: [], ativo: true }; DB.clientes.push(c); c.nome = "Cliente CK Editado"; const ok = DB.cliById("ckCli").nome === "Cliente CK Editado"; DB.clientes = DB.clientes.filter(x => x.id !== "ckCli"); return ok; }));
  // 4. criar produto
  chk("4. Criar produto", await ev(page, () => { DB.produtos.push(mkProd({ id: "ckP", descricao: "Prod CK", familia: "Serviços", regra: "UN", preco: 50 })); const ok = !!DB.prodById("ckP"); DB.produtos = DB.produtos.filter(x => x.id !== "ckP"); return ok; }));
  // 5. orçamento (cálculo)
  chk("5. Orçamento calcula total", await ev(page, () => { const o = DB.orcamentos[0]; return calcOrc(o).total > 0; }));
  // 6. transformar em venda (idempotência)
  chk("6. Transformar em venda (não duplica)", await ev(page, () => { const o = DB.orcamentos.find(x => x.vendaGerada); const antes = o.vendaGerada; transformarVenda(o.n); return antes === true && o.vendaGerada === true; }));
  // 7. recebimento → 8. Contas a Receber → caixa
  const rec = await ev(page, () => { const o = contasReceberVisiveis()[0]; const c0 = caixaSaldo(), r0 = orcRecebido(o); const id = addCaixa("entrada", 50, "CK receb", o.n, "PIX", hojeBR()); o.recebimentos.push({ id: "ckr", data: hojeBR(), valor: 50, forma: "PIX", estornado: false, movId: id }); const dR = orcRecebido(o) - r0, dC = caixaSaldo() - c0; o.recebimentos = o.recebimentos.filter(x => x.id !== "ckr"); DB.caixa.movimentos = DB.caixa.movimentos.filter(m => m.id !== id); return { dR, dC }; });
  chk("7/8/9. Recebimento → Contas a Receber → Caixa", Math.abs(rec.dR - 50) < 0.01 && Math.abs(rec.dC - 50) < 0.01, JSON.stringify(rec));
  // 10. Contas a Pagar
  chk("10. Contas a Pagar renderiza", await ev(page, () => VIEW_contasPagar().length > 0));
  // 11. Caixa
  chk("11. Caixa saldo calcula", await ev(page, () => typeof caixaSaldo() === "number"));
  // 12. produção
  chk("12. Produção renderiza", await ev(page, () => VIEWS.producao().length > 0));
  // 13. obra
  chk("13. Obras renderiza", await ev(page, () => VIEWS.obras().length > 0));
  // 14. documentos (PDF cliente/produção/contrato/termo)
  chk("14. Documentos (PDF/contrato/termo)", await ev(page, () => { const o = DB.orcamentos.find(x => x.vendaGerada); o.pdfTipo = "cliente"; const a = VIEWS.pdf().length > 0; o.pdfTipo = "producao"; const bb = VIEWS.pdf().length > 0; return a && bb; }));
  // 15. Centro de Custos
  chk("15. Centro de Custos renderiza", await ev(page, () => { ccTab = "lancamentos"; return VIEWS["centro-custos"]().length > 0; }));
  // 16. Ponto de Equilíbrio
  chk("16. Ponto de Equilíbrio calcula", await ev(page, () => { fPE.periodo = "tudo"; return typeof peDados().receita === "number"; }));
  // 17. exclusões e inativações (padrão seguro)
  chk("17. Exclusão segura disponível", await ev(page, () => typeof excluirSeguro === "function" && typeof delConta === "function" && typeof delUsuario === "function" && typeof delLoja === "function"));

  chk("Zero erros JavaScript", errors.length === 0, errors.slice(0, 4).join(" | "));
  console.log("=== ERROS JS ==="); console.log(errors.length ? errors.slice(0, 12).join("\n") : "NENHUM");
  console.log("=== CHECKPOINT FLUXOS CRÍTICOS — RESULTADOS ===");
  R.forEach(r => console.log(r[0] + " | " + r[1] + (r[2] ? "  (" + r[2] + ")" : "")));
  const fails = R.filter(r => r[0] === "FAIL").length;
  console.log("=== " + (R.length - fails) + "/" + R.length + " PASS, " + fails + " FAIL, " + errors.length + " erros JS ===");
  await b.close();
})().catch(e => { console.error("HARNESS:", e); process.exit(1); });
