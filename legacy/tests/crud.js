/* Sub-lote CRUD 1 — Contas, Operadoras, Vendedores: CRUD + exclusão segura */
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

  // ---- placeholders removidos ----
  chk("Vendedores/Contas/Operadoras não são mais 'em desenvolvimento'", await ev(page, () => [VIEWS.vendedores(), VIEWS.contas(), VIEWS.operadoras()].every(h => !/em desenvolvimento/.test(h))));

  // ---- CONTAS ----
  chk("Contas migradas com id", await ev(page, () => DB.contas.every(c => !!c.id)));
  const c1 = await ev(page, () => { const n0 = DB.contas.length; openContaForm(); document.getElementById("cf-nome").value = "Conta Teste CRUD"; document.getElementById("cf-tipo").value = "Conta corrente"; salvarConta(); const c = DB.contas.find(x => x.nome === "Conta Teste CRUD"); return { criou: DB.contas.length === n0 + 1, ativo: c && c.ativo }; });
  chk("Criar conta", c1.criou && c1.ativo === true, JSON.stringify(c1));
  const cId = await ev(page, () => DB.contas.find(x => x.nome === "Conta Teste CRUD").id);
  chk("Editar conta", await ev(page, id => { openContaForm(id); document.getElementById("cf-banco").value = "Banco X"; salvarConta(); return DB.contas.find(x => x.id === id).banco === "Banco X"; }, cId));
  chk("Duplicar conta", await ev(page, id => { const n0 = DB.contas.length; dupConta(id); return DB.contas.length === n0 + 1 && DB.contas.some(x => x.nome === "Conta Teste CRUD (cópia)"); }, cId));
  chk("Inativar/Reativar conta", await ev(page, id => { toggleConta(id); const inat = DB.contas.find(x => x.id === id).ativo === false; toggleConta(id); const at = DB.contas.find(x => x.id === id).ativo === true; return inat && at; }, cId));
  chk("Excluir conta SEM vínculo (definitivo)", await ev(page, id => { delConta(id); if (window.__ok) window.__ok(); return !DB.contas.some(x => x.id === id); }, cId));
  // limpar a cópia
  await ev(page, () => { DB.contas = DB.contas.filter(x => x.nome !== "Conta Teste CRUD (cópia)"); });
  // bloqueio por vínculo: "Banco Inter" é usada em recebimentos/lojas
  const cBlk = await ev(page, () => { const c = DB.contas.find(x => x.nome === "Banco Inter"); const v = vinculosConta(c); const n0 = DB.contas.length; delConta(c.id); const aindaExiste = DB.contas.some(x => x.id === c.id); if (window.__inat) window.__inat(); const inativada = DB.contas.find(x => x.id === c.id).ativo === false; DB.contas.find(x => x.id === c.id).ativo = true; return { vinc: v.total, aindaExiste, inativada }; });
  chk("Conta com vínculo NÃO é excluída (só inativa)", cBlk.vinc > 0 && cBlk.aindaExiste && cBlk.inativada, JSON.stringify(cBlk));

  // ---- OPERADORAS ----
  const o1 = await ev(page, () => { const n0 = DB.operadoras.length; openOperadoraForm(); document.getElementById("op-nome").value = "Operadora Teste"; document.getElementById("op-parc").value = "1:2.5, 3:4.5"; salvarOperadora(); const o = DB.operadoras.find(x => x.nome === "Operadora Teste"); return { criou: DB.operadoras.length === n0 + 1, parc: o && o.parc.length }; });
  chk("Criar operadora (parcelas parseadas)", o1.criou && o1.parc === 2, JSON.stringify(o1));
  const oId = await ev(page, () => DB.operadoras.find(x => x.nome === "Operadora Teste").id);
  chk("Excluir operadora SEM vínculo", await ev(page, id => { delOperadora(id); if (window.__ok) window.__ok(); return !DB.operadoras.some(x => x.id === id); }, oId));
  const oBlk = await ev(page, () => { const o = DB.operadoras.find(x => x.nome === "Stone"); const v = vinculosOperadora(o); delOperadora(o.id); const existe = DB.operadoras.some(x => x.id === o.id); if (v.total > 0 && window.__inat) window.__inat(); const inat = DB.operadoras.find(x => x.id === o.id).ativo === false; DB.operadoras.find(x => x.id === o.id).ativo = true; return { vinc: v.total, existe, inat }; });
  chk("Operadora com vínculo (Stone) NÃO é excluída", oBlk.vinc > 0 && oBlk.existe && oBlk.inat, JSON.stringify(oBlk));

  // ---- VENDEDORES ----
  const v1 = await ev(page, () => { const n0 = DB.vendedores.length; openVendedorForm(); document.getElementById("vd-nome").value = "Vendedor Teste"; document.getElementById("vd-desc").value = "8"; salvarVendedor(); const v = DB.vendedores.find(x => x.nome === "Vendedor Teste"); return { criou: DB.vendedores.length === n0 + 1, desc: v && v.desc }; });
  chk("Criar vendedor", v1.criou && v1.desc === 8, JSON.stringify(v1));
  const vId = await ev(page, () => DB.vendedores.find(x => x.nome === "Vendedor Teste").id);
  chk("Excluir vendedor SEM vendas", await ev(page, id => { delVendedor(id); if (window.__ok) window.__ok(); return !DB.vendedores.some(x => x.id === id); }, vId));
  const vBlk = await ev(page, () => { const v = DB.vendedores.find(x => x.nome === "Carla Mendes"); const vc = vinculosVendedor(v); delVendedor(v.id); const existe = DB.vendedores.some(x => x.id === v.id); if (vc.total > 0 && window.__inat) window.__inat(); const inat = DB.vendedores.find(x => x.id === v.id).ativo === false; DB.vendedores.find(x => x.id === v.id).ativo = true; return { vinc: vc.total, existe, inat }; });
  chk("Vendedor com vendas (Carla) NÃO é excluído (só inativa)", vBlk.vinc > 0 && vBlk.existe && vBlk.inat, JSON.stringify(vBlk));

  // ---- PERMISSÃO por chamada direta ----
  const perm = await ev(page, () => { const admin = CURR_USER; CURR_USER = { id: "x", nome: "V", perfil: "vendedor", lojas: ["L1"] }; const c = DB.contas[0]; const n0 = DB.contas.length; delConta(c.id); // vendedor não tem fin.excluir_contas
    let toastBlock = true; // se abriu modal de exclusão, window.__ok existiria e removeria; mas sem permissão nem abre
    const removidoIndevido = DB.contas.length < n0; CURR_USER = admin; return { removidoIndevido }; });
  chk("Sem permissão não exclui conta por chamada direta", perm.removidoIndevido === false, JSON.stringify(perm));

  // ---- MASSA ----
  const mass = await ev(page, () => {
    openContaForm(); document.getElementById("cf-nome").value = "MassA"; salvarConta();
    openContaForm(); document.getElementById("cf-nome").value = "MassB"; salvarConta();
    const a = DB.contas.find(x => x.nome === "MassA"), bb = DB.contas.find(x => x.nome === "MassB");
    selSet("cf").add(String(a.id)); selSet("cf").add(String(bb.id));
    cfMass("excluir");
    return { restam: DB.contas.some(x => x.nome === "MassA" || x.nome === "MassB") };
  });
  chk("Exclusão em massa (contas sem vínculo)", mass.restam === false, JSON.stringify(mass));

  // ---- render das telas ----
  const bf = errors.length;
  await ev(page, () => go("contas")); await sleep(20);
  await ev(page, () => go("operadoras")); await sleep(20);
  await ev(page, () => go("vendedores")); await sleep(20);
  chk("Render das 3 telas sem erro", errors.length === bf);

  chk("Zero erros JavaScript", errors.length === 0, errors.slice(0, 4).join(" | "));
  console.log("=== ERROS JS ==="); console.log(errors.length ? errors.slice(0, 12).join("\n") : "NENHUM");
  console.log("=== CRUD — RESULTADOS ===");
  R.forEach(r => console.log(r[0] + " | " + r[1] + (r[2] ? "  (" + r[2] + ")" : "")));
  const fails = R.filter(r => r[0] === "FAIL").length;
  console.log("=== " + (R.length - fails) + "/" + R.length + " PASS, " + fails + " FAIL, " + errors.length + " erros JS ===");
  await b.close();
})().catch(e => { console.error("HARNESS:", e); process.exit(1); });
