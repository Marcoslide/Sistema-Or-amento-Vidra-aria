const { chromium } = require("playwright-core");
const EXE = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const OUT = "/tmp/claude-0/-home-user-Sistema-Or-amento-Vidra-aria/58a882f8-11eb-59b3-a4d7-34447a0c185b/scratchpad";
const FILE = "file://" + OUT + "/vidrogestor-lote-final.html";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const R = []; const chk = (n, c, d) => R.push([c ? "PASS" : "FAIL", n, d || ""]);
const ev = (page, fn, arg) => page.evaluate(fn, arg);
const asUser = (page, perfil, vendedorId) => page.evaluate(a => { const u = DB.usuarios.find(x => x.perfil===a.perfil && (!a.vendedorId || x.vendedorId===a.vendedorId)); if(u){CURR_USER=u;CURR_LOJA=isMultiloja(u)?"":(scopeLojas(u)[0]||"");} return u?u.nome:null; }, { perfil, vendedorId });
(async () => {
  const b = await chromium.launch({ executablePath: EXE });
  const page = await b.newContext({ viewport: { width: 1500, height: 950 } }).then(c => c.newPage());
  page.on("dialog", d => d.dismiss().catch(()=>{}));
  const errors = [];
  page.on("pageerror", e => errors.push("PAGEERR: " + e.message));
  page.on("console", m => { if (m.type() === "error") errors.push("CONSOLE: " + m.text()); });
  await page.goto(FILE, { waitUntil: "load" }); await sleep(200);
  await ev(page, () => enter()); await sleep(150);

  // 8. todos registros têm lojaId
  const lojaIds = await ev(page, () => ({
    orc: DB.orcamentos.every(o=>!!o.lojaId), obra: DB.obras.every(o=>!!o.lojaId),
    cp: DB.contasPagar.every(c=>!!c.lojaId), cx: DB.caixa.movimentos.every(m=>!!m.lojaId),
    vend: DB.orcamentos.every(o=>!!o.vendedorId)
  }));
  chk("8. Todos registros têm lojaId (orç, obra, conta a pagar, caixa) + vendedorId", lojaIds.orc&&lojaIds.obra&&lojaIds.cp&&lojaIds.cx&&lojaIds.vend, JSON.stringify(lojaIds));

  // 3. admin vê consolidado
  await ev(page, () => { CURR_USER=DB.usuarios.find(u=>u.perfil==="admin"); CURR_LOJA=""; });
  const adminN = await ev(page, () => orcVisiveis().length);
  const totalN = await ev(page, () => DB.orcamentos.length);
  chk("3. Administrador vê consolidado (todas as vendas)", adminN===totalN, adminN+"/"+totalN);

  // 9. seletor global filtra (admin em L2)
  await ev(page, () => { CURR_LOJA="L2"; });
  const soL2 = await ev(page, () => orcVisiveis().every(o=>o.lojaId==="L2")&&orcVisiveis().length>0);
  const soL2obra = await ev(page, () => DB.obras.filter(obraVisivel).every(o=>o.lojaId==="L2"));
  chk("9. Seletor global de operação filtra vendas e obras (L2)", soL2 && soL2obra);
  await ev(page, () => { CURR_LOJA=""; });

  // 1. vendedor só vê suas vendas
  await asUser(page,"vendedor","v2");
  const vend = await ev(page, () => ({ todas:orcVisiveis().every(o=>o.vendedorId==="v2"), n:orcVisiveis().length, existeOutro:DB.orcamentos.some(o=>o.vendedorId!=="v2") }));
  chk("1. Vendedor vê somente as próprias vendas", vend.todas && vend.n>0 && vend.existeOutro, JSON.stringify(vend));

  // 6. lista Vendas mostra só as do vendedor
  await ev(page, () => go("vendas")); await sleep(40);
  const rowsVend = await ev(page, () => { const meus=orcVisiveis().map(o=>"#"+o.n); const linhas=[...document.querySelectorAll("tbody tr")].map(tr=>(tr.querySelector(".lk")||{}).textContent).filter(Boolean); return {linhas,meus}; });
  chk("6. Lista Vendas (vendedor) mostra apenas registros próprios", rowsVend.linhas.length===rowsVend.meus.length && rowsVend.linhas.every(l=>rowsVend.meus.includes(l)), JSON.stringify(rowsVend));

  // 7. abrir registro não autorizado é bloqueado
  const alheio = await ev(page, () => (DB.orcamentos.find(o=>o.vendedorId!=="v2")||{}).n);
  await ev(page, () => go("vendas")); await sleep(20);
  await ev(page, n => openOrc(n), alheio); await sleep(30);
  chk("7. Abrir venda de outro vendedor é bloqueado (não navega)", await ev(page, () => cur)!=="acompanhamento");
  // busca global não retorna alheio
  await ev(page, n => buscaGlobal(String(n),true), alheio); await sleep(40);
  const buscaAlheio = await ev(page, n => { const html=(document.getElementById("gs-list")||{}).innerHTML||""; return html.includes("#"+n); }, alheio);
  chk("6b. Busca global (vendedor) não retorna registro de outro vendedor", buscaAlheio===false);
  await ev(page, () => closeModal());

  // 2. gerente só vê sua loja
  await asUser(page,"gerente");
  const ger = await ev(page, () => { const ls=CURR_USER.lojas; return { ok:orcVisiveis().every(o=>ls.includes(o.lojaId)), n:orcVisiveis().length, temOutra:DB.orcamentos.some(o=>!ls.includes(o.lojaId)) }; });
  chk("2. Gerente vê somente a própria loja", ger.ok && ger.temOutra, JSON.stringify(ger));

  // 4. financeiro acessa apenas lojas autorizadas
  await asUser(page,"financeiro");
  await ev(page, () => { CURR_LOJA="L3"; });
  const finCP = await ev(page, () => DB.contasPagar.filter(cpVisivel).every(c=>c.lojaId==="L3"));
  chk("4. Financeiro acessa apenas a loja selecionada/autorizada (L3)", finCP);
  await ev(page, () => { CURR_LOJA=""; });

  // 5. produção não vê valores
  await ev(page, () => { CURR_USER={id:"px",nome:"Op Produção",perfil:"producao",lojas:["L1"],vendedorId:"",status:"ATIVO"}; CURR_LOJA="L1"; });
  const verVal = await ev(page, () => can("fin.ver_valores"));
  await ev(page, () => go("vendas")); await sleep(40);
  const vendasHtml = await ev(page, () => document.querySelector(".view").innerHTML);
  chk("5. Produção não vê valores (sem coluna Total/Financeiro na lista de Vendas)", verVal===false && !/>Total<\/th>/.test(vendasHtml) && !/>Financeiro<\/th>/.test(vendasHtml));
  const menuProd = await ev(page, () => NAV.map(g=>g[1].filter(i=>navVisivel(i[0])).map(i=>i[0])).flat());
  chk("5b. Menu de produção não expõe Contas/Caixa/Configurações", !menuProd.includes("contas-pagar")&&!menuProd.includes("contas-receber")&&!menuProd.includes("caixa")&&!menuProd.includes("configuracoes"), JSON.stringify(menuProd));

  // 10. troca de usuário reposiciona operação e reflete no topo
  await ev(page, () => { CURR_USER=DB.usuarios.find(u=>u.perfil==="admin"); });
  await ev(page, () => trocarUsuario(DB.usuarios.find(u=>u.perfil==="gerente").id)); await sleep(40);
  const topo = await ev(page, () => document.getElementById("tb-user").textContent);
  const lojaSelGer = await ev(page, () => CURR_LOJA);
  chk("10. Trocar p/ gerente: topo atualiza e operação = loja do gerente", topo.includes("Gerente") && lojaSelGer==="L1", topo+" | "+lojaSelGer);

  chk("11. Zero erros JavaScript", errors.length===0, errors.slice(0,3).join(" | "));
  console.log("=== ERROS JS ==="); console.log(errors.length ? errors.slice(0,15).join("\n") : "NENHUM");
  console.log("=== RESULTADOS ===");
  R.forEach(r => console.log(r[0] + " | " + r[1] + (r[2] ? "  (" + r[2] + ")" : "")));
  const fails = R.filter(r => r[0]==="FAIL").length;
  console.log("=== " + (R.length-fails) + "/" + R.length + " PASS, " + fails + " FAIL, " + errors.length + " erros JS ===");
  await b.close();
})().catch(e => { console.error("HARNESS:", e); process.exit(1); });
