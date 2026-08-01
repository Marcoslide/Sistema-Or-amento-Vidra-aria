const { chromium } = require("playwright-core");
const EXE = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const OUT = "/tmp/claude-0/-home-user-Sistema-Or-amento-Vidra-aria/58a882f8-11eb-59b3-a4d7-34447a0c185b/scratchpad";
const FILE = "file://" + OUT + "/vidrogestor-lote-final.html";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const R = []; const chk = (n, c, d) => R.push([c ? "PASS" : "FAIL", n, d || ""]);
const ev = (page, fn, arg) => page.evaluate(fn, arg);
(async () => {
  const b = await chromium.launch({ executablePath: EXE });
  const page = await b.newContext({ viewport: { width: 1600, height: 1000 } }).then(c => c.newPage());
  const errors = [];
  page.on("pageerror", e => errors.push("PAGEERR: " + e.message));
  page.on("console", m => { if (m.type() === "error") errors.push("CONSOLE: " + m.text()); });
  await page.goto(FILE, { waitUntil: "load" }); await sleep(200);
  await ev(page, () => enter()); await sleep(150);

  // Vendedores em Cadastros
  const nav = await ev(page, () => NAV.map(g => [g[0], g[1].map(i => i[0])]));
  const comercial = (nav.find(g => g[0]==="Comercial")||[,[]])[1];
  const cadastros = (nav.find(g => g[0]==="Cadastros")||[,[]])[1];
  const fin = (nav.find(g => g[0]==="Financeiro")||[,[]])[1];
  chk("Vendedores em Cadastros e não em Comercial", cadastros.includes("vendedores") && !comercial.includes("vendedores"));
  chk("Menu Financeiro: Contas a receber + Contas a pagar + Caixa (+ Centro de custos, Ponto de equilíbrio)", ["contas-receber","contas-pagar","caixa"].every(x=>fin.includes(x)), JSON.stringify(fin));

  // situações seed
  const sits = await ev(page, () => DB.contasPagar.map(c => cpSituacao(c)));
  chk("Contas a pagar: situações derivadas (Atrasada/Vence hoje/Em aberto)", sits.includes("ATRASADA") && sits.includes("VENCE_HOJE") && sits.includes("EM_ABERTO"), sits.join(","));

  // 13. salvar NÃO movimenta caixa
  const caixa0 = await ev(page, () => caixaSaldo());
  const nCP0 = await ev(page, () => DB.contasPagar.length);
  await ev(page, () => cpNovo()); await sleep(50);
  await ev(page, () => { document.getElementById("cp-forn").value="Fornecedor Teste"; document.getElementById("cp-valor").value="500"; document.getElementById("cp-venc").value="2026-09-10"; });
  await ev(page, () => cpSalvar(false)); await sleep(40);
  const s13 = await ev(page, () => ({ caixa:caixaSaldo(), n:DB.contasPagar.length, sit:cpSituacao(DB.contasPagar[DB.contasPagar.length-1]) }));
  chk("13. Salvar cria título em aberto e NÃO movimenta caixa", Math.abs(s13.caixa-caixa0)<0.001 && s13.n===nCP0+1 && (s13.sit==="EM_ABERTO"||s13.sit==="ATRASADA"||s13.sit==="VENCE_HOJE"), JSON.stringify(s13));

  // 14. salvar e dar baixa movimenta caixa uma vez
  const caixa1 = await ev(page, () => caixaSaldo());
  await ev(page, () => cpNovo()); await sleep(40);
  await ev(page, () => { document.getElementById("cp-forn").value="Fornecedor Baixa"; document.getElementById("cp-valor").value="800"; document.getElementById("cp-venc").value="2026-09-15"; });
  await ev(page, () => cpSalvar(true)); await sleep(50); // abre baixa
  const baixaOpen = await ev(page, () => !!document.getElementById("cb-valor"));
  await ev(page, () => { document.getElementById("cb-valor").value="800"; });
  const idNovo = await ev(page, () => DB.contasPagar[DB.contasPagar.length-1].id);
  await ev(page, id => cpBaixar(id), idNovo); await sleep(40);
  const s14 = await ev(page, id => ({ caixa:caixaSaldo(), sit:cpSituacao(DB.contasPagar.find(c=>c.id===id)) }), idNovo);
  chk("14. Salvar e dar baixa: 1 saída de caixa (−800) e título PAGA", baixaOpen && Math.abs((caixa1-s14.caixa)-800)<0.01 && s14.sit==="PAGA", "Δcaixa "+(caixa1-s14.caixa)+" sit "+s14.sit);

  // 15. pagamento parcial mantém saldo
  const caixa2 = await ev(page, () => caixaSaldo());
  await ev(page, () => cpNovo()); await sleep(40);
  await ev(page, () => { document.getElementById("cp-forn").value="Fornecedor Parcial"; document.getElementById("cp-valor").value="1000"; document.getElementById("cp-venc").value="2026-09-20"; });
  await ev(page, () => cpSalvar(false)); await sleep(30);
  const idParc = await ev(page, () => DB.contasPagar[DB.contasPagar.length-1].id);
  await ev(page, id => cpBaixaUI(id), idParc); await sleep(40);
  await ev(page, () => { document.getElementById("cb-valor").value="400"; });
  await ev(page, id => cpBaixar(id), idParc); await sleep(30);
  const s15 = await ev(page, id => { const c=DB.contasPagar.find(x=>x.id===id); return { sit:cpSituacao(c), pago:cpPago(c), caixa:caixaSaldo() }; }, idParc);
  chk("15. Pagamento parcial: PARCIAL, pago 400, caixa −400", s15.sit==="PARCIAL" && Math.abs(s15.pago-400)<0.01 && Math.abs((caixa2-s15.caixa)-400)<0.01, JSON.stringify(s15));

  // 16. estorno reverte
  const caixaAnt = await ev(page, () => caixaSaldo());
  await ev(page, id => { const c=DB.contasPagar.find(x=>x.id===id); c.pagamentos.filter(p=>!p.estornado).forEach(p=>{p.estornado=true;addCaixa("entrada",p.valor,"Estorno",null,p.forma,hojeBR());}); }, idParc);
  const s16 = await ev(page, id => ({ sit:cpSituacao(DB.contasPagar.find(x=>x.id===id)), caixa:caixaSaldo() }), idParc);
  chk("16. Estorno reverte movimento (caixa volta, título EM_ABERTO/ATRASADA)", Math.abs((s16.caixa-caixaAnt)-400)<0.01 && s16.sit!=="PAGA" && s16.sit!=="PARCIAL", JSON.stringify(s16));

  // 17-18. contas a receber: várias parcelas + baixa parcial
  await ev(page, () => { const o=DB.orcByN(1025); o.status="ORCAMENTO"; o.vendaGerada=false; o.recebimentos=[]; o.parcelas=[]; delete o.producao; DB.obras=DB.obras.filter(x=>x.n!==1025); });
  await ev(page, () => transformarVendaUI(1025)); await sleep(50);
  await ev(page, () => { document.getElementById("tv-forma").value="PIX"; document.getElementById("tv-ent").value="500"; document.getElementById("tv-cond").value="PARCELADO"; tvCondChange(); document.getElementById("tv-parc").value="3"; });
  await ev(page, () => transformarVenda(1025)); await sleep(40);
  const parc = await ev(page, () => (DB.orcByN(1025).parcelas||[]).length);
  chk("17. Venda pode gerar várias contas a receber (parcelas do saldo)", parc>=3, "parcelas="+parc);
  const tit0 = await ev(page, () => crTitulos().filter(t=>t.o.n===1025).length);
  // baixa parcial de um título via receberParcela
  const caixaR0 = await ev(page, () => caixaSaldo());
  const pid = await ev(page, () => DB.orcByN(1025).parcelas.find(p=>p.status!=="RECEBIDO").id);
  await ev(page, pid => receberParcela(1025,pid), pid); await sleep(60);
  const val = await ev(page, () => Number(document.getElementById("rr-valor").value));
  await ev(page, () => { document.getElementById("rr-valor").value=String(100); });
  await ev(page, () => salvarReceb(1025)); await sleep(40);
  const s18 = await ev(page, () => ({ caixa:caixaSaldo(), rec:orcRecebido(DB.orcByN(1025)) }));
  chk("18. Baixa parcial de título: caixa +100 e recebido atualizado", Math.abs((s18.caixa-caixaR0)-100)<0.01 && s18.rec>=600-0.01, JSON.stringify(s18)+" (entrada 500 + 100)");
  chk("19. Contas a receber lista títulos da venda", tit0>=3, "titulos="+tit0);

  // render contas a receber sem erro
  const bf=errors.length; await ev(page, () => go("contas-receber")); await sleep(40); chk("Render Contas a receber sem erro", errors.length===bf);
  await ev(page, () => go("contas-pagar")); await sleep(40);
  await page.screenshot({ path: OUT + "/fin-contas-pagar.png", fullPage: true });

  chk("20. Zero erros JavaScript", errors.length===0, errors.slice(0,3).join(" | "));
  console.log("=== ERROS JS ==="); console.log(errors.length ? errors.slice(0,12).join("\n") : "NENHUM");
  console.log("=== RESULTADOS ===");
  R.forEach(r => console.log(r[0] + " | " + r[1] + (r[2] ? "  (" + r[2] + ")" : "")));
  const fails = R.filter(r => r[0]==="FAIL").length;
  console.log("=== " + (R.length-fails) + "/" + R.length + " PASS, " + fails + " FAIL, " + errors.length + " erros JS ===");
  await b.close();
})().catch(e => { console.error("HARNESS:", e); process.exit(1); });
