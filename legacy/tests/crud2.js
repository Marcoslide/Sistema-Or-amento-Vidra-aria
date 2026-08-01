/* Sub-lote CRUD 2 — Centro de Custos: exclusão segura + ações */
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
  await ev(page, () => { enter(); CURR_USER = DB.usuarios.find(u => u.perfil === "admin"); CURR_LOJA = ""; });

  // ---- render: menus expandidos em cada aba ----
  const menus = await ev(page, () => { const out = {}; ["centros", "lancamentos", "maquinas", "maoobra", "bens"].forEach(t => { ccTab = t; out[t] = VIEWS["centro-custos"](); }); return {
    centros: /dupCentro\(/.test(out.centros) && /toggleCentro\(/.test(out.centros) && /delCentro\(/.test(out.centros),
    custos: /dupCusto\(/.test(out.lancamentos) && /toggleCusto\(/.test(out.lancamentos) && /delCusto\(/.test(out.lancamentos),
    maquinas: /dupMaquina\(/.test(out.maquinas) && /delMaquina\(/.test(out.maquinas),
    maoobra: /dupMaoObra\(/.test(out.maoobra) && /delMaoObra\(/.test(out.maoobra),
    bens: /dupBem\(/.test(out.bens) && /delBem\(/.test(out.bens) && /baixarBem\(/.test(out.bens) }; });
  chk("Menus expandidos (centros/custos/máquinas/mão de obra/bens)", Object.values(menus).every(Boolean), JSON.stringify(menus));

  // ---- CENTROS ----
  chk("Centro SEM vínculo é excluído", await ev(page, () => { DB.centrosCusto.push({ id: "ccT", nome: "Centro Teste", ativo: true }); delCentro("ccT"); if (window.__ok) window.__ok(); return !DB.centrosCusto.some(x => x.id === "ccT"); }));
  const cenBlk = await ev(page, () => { DB.centrosCusto.push({ id: "ccV", nome: "Centro Vinc", ativo: true }); DB.custos.push({ id: "cuV", desc: "x", centroId: "ccV", valor: 10, ativo: true, participaRateio: false }); const v = vinculosCentro(DB.centrosCusto.find(c => c.id === "ccV")); delCentro("ccV"); const existe = DB.centrosCusto.some(x => x.id === "ccV"); if (window.__inat) window.__inat(); const inat = DB.centrosCusto.find(x => x.id === "ccV").ativo === false; DB.centrosCusto = DB.centrosCusto.filter(x => x.id !== "ccV"); DB.custos = DB.custos.filter(x => x.id !== "cuV"); return { vinc: v.total, existe, inat }; });
  chk("Centro COM vínculo NÃO é excluído (inativa)", cenBlk.vinc > 0 && cenBlk.existe && cenBlk.inat, JSON.stringify(cenBlk));

  // ---- CUSTOS ----
  const custoRateio = await ev(page, () => { DB.custos.push({ id: "cuR", desc: "Custo Rateado", valor: 100, participaRateio: true, ativo: true }); delCusto("cuR"); const existe = DB.custos.some(x => x.id === "cuR"); if (window.__inat) window.__inat(); const inat = DB.custos.find(x => x.id === "cuR").ativo === false; return { existe, inat }; });
  chk("Custo que participa do rateio NÃO é excluído (inativa)", custoRateio.existe && custoRateio.inat, JSON.stringify(custoRateio));
  chk("Estornar rateio libera exclusão", await ev(page, () => { estornarRateioCusto("cuR"); const semRateio = DB.custos.find(x => x.id === "cuR").participaRateio === false; delCusto("cuR"); if (window.__ok) window.__ok(); return semRateio && !DB.custos.some(x => x.id === "cuR"); }));

  // ---- MÃO DE OBRA / MÁQUINA ----
  chk("Mão de obra: duplicar/inativar/excluir", await ev(page, () => { DB.maoObra.push({ id: "moT", nome: "Colab Teste", salario: 1000, ativo: true }); dupMaoObra("moT"); const dup = DB.maoObra.some(x => x.nome === "Colab Teste (cópia)"); toggleMaoObra("moT"); const inat = DB.maoObra.find(x => x.id === "moT").ativo === false; delMaoObra("moT"); if (window.__ok) window.__ok(); const del = !DB.maoObra.some(x => x.id === "moT"); DB.maoObra = DB.maoObra.filter(x => x.nome !== "Colab Teste (cópia)"); return dup && inat && del; }));
  chk("Máquina: duplicar/inativar/excluir", await ev(page, () => { DB.maquinas.push({ id: "mqT", nome: "Maq Teste", aquisicao: 1000, ativo: true }); dupMaquina("mqT"); const dup = DB.maquinas.some(x => x.nome === "Maq Teste (cópia)"); toggleMaquina("mqT"); const inat = DB.maquinas.find(x => x.id === "mqT").ativo === false; delMaquina("mqT"); if (window.__ok) window.__ok(); const del = !DB.maquinas.some(x => x.id === "mqT"); DB.maquinas = DB.maquinas.filter(x => x.nome !== "Maq Teste (cópia)"); return dup && inat && del; }));

  // ---- BENS ----
  const bemNovo = await ev(page, () => { DB.bens.push({ id: "bmNovo", nome: "Bem Novo", aquisicao: 1000, residual: 1000, vidaUtil: 5, unidadeVida: "anos", dataCompra: hojeBR(), ativo: true }); const ac = depAcumuladaBem(DB.bens.find(b => b.id === "bmNovo")); delBem("bmNovo"); if (window.__ok) window.__ok(); return { ac, del: !DB.bens.some(x => x.id === "bmNovo") }; });
  chk("Bem sem depreciação é excluído", bemNovo.del, JSON.stringify(bemNovo));
  const bemDep = await ev(page, () => { DB.bens.push({ id: "bmDep", nome: "Bem Deprec", aquisicao: 12000, residual: 0, vidaUtil: 2, unidadeVida: "anos", dataCompra: "01/01/2025", ativo: true }); const ac = depAcumuladaBem(DB.bens.find(b => b.id === "bmDep")); delBem("bmDep"); const existe = DB.bens.some(x => x.id === "bmDep"); if (window.__inat) window.__inat(); const inat = DB.bens.find(x => x.id === "bmDep").ativo === false; return { ac, existe, inat }; });
  chk("Bem COM depreciação acumulada NÃO é excluído (inativa)", bemDep.ac > 0 && bemDep.existe && bemDep.inat, JSON.stringify(bemDep));
  const bemBaixa = await ev(page, () => { const b = DB.bens.find(x => x.id === "bmDep"); b.ativo = true; const acAntes = depAcumuladaBem(b); baixarBem("bmDep"); const bx = DB.bens.find(x => x.id === "bmDep"); const acDepois = depAcumuladaBem(bx); return { baixado: !!bx.dataBaixa, preservou: Math.abs(acAntes - acDepois) < 0.01 }; });
  chk("Baixar bem registra baixa e preserva depreciação acumulada", bemBaixa.baixado && bemBaixa.preservou, JSON.stringify(bemBaixa));
  await ev(page, () => { DB.bens = DB.bens.filter(x => x.id !== "bmDep"); });

  // ---- PERMISSÃO ----
  chk("Sem permissão não exclui máquina", await ev(page, () => { DB.maquinas.push({ id: "mqP", nome: "MaqP", aquisicao: 1, ativo: true }); const admin = CURR_USER; CURR_USER = { id: "x", nome: "V", perfil: "vendedor", lojas: ["L1"] }; delMaquina("mqP"); const existe = DB.maquinas.some(x => x.id === "mqP"); CURR_USER = admin; DB.maquinas = DB.maquinas.filter(x => x.id !== "mqP"); return existe; }));

  chk("Zero erros JavaScript", errors.length === 0, errors.slice(0, 4).join(" | "));
  console.log("=== ERROS JS ==="); console.log(errors.length ? errors.slice(0, 12).join("\n") : "NENHUM");
  console.log("=== CRUD 2 (Centro de Custos) — RESULTADOS ===");
  R.forEach(r => console.log(r[0] + " | " + r[1] + (r[2] ? "  (" + r[2] + ")" : "")));
  const fails = R.filter(r => r[0] === "FAIL").length;
  console.log("=== " + (R.length - fails) + "/" + R.length + " PASS, " + fails + " FAIL, " + errors.length + " erros JS ===");
  await b.close();
})().catch(e => { console.error("HARNESS:", e); process.exit(1); });
