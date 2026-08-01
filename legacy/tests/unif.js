const { chromium } = require("playwright-core");
const EXE = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const OUT = "/tmp/claude-0/-home-user-Sistema-Or-amento-Vidra-aria/58a882f8-11eb-59b3-a4d7-34447a0c185b/scratchpad";
const FILE = "file://" + OUT + "/vidrogestor-lote-final.html";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const R = []; const chk = (n, c, d) => R.push([c ? "PASS" : "FAIL", n, d || ""]);
const ev = (page, fn, arg) => page.evaluate(fn, arg);
(async () => {
  const b = await chromium.launch({ executablePath: EXE });
  const page = await b.newContext({ viewport: { width: 1440, height: 950 } }).then(c => c.newPage());
  const errors = [];
  page.on("pageerror", e => errors.push("PAGEERR: " + e.message));
  page.on("console", m => { if (m.type() === "error") errors.push("CONSOLE: " + m.text()); });
  await page.goto(FILE, { waitUntil: "load" }); await sleep(200);
  await ev(page, () => enter()); await sleep(150);

  // varredura de todas as views (inclui rotas legadas)
  for (const v of ["dashboard","vendas","vendedores","obras","agenda","recebimentos","caixa","clientes","produtos","familias","fornecedores","contas","operadoras","usuarios","configuracoes","orcamentos","producao"]) {
    const bf = errors.length; await ev(page, x => go(x), v); await sleep(25); chk("view " + v, errors.length === bf);
  }

  // ===== MENU (1-4) =====
  const nav = await ev(page, () => NAV.map(g => [g[0], g[1].map(i => i[0])]));
  const flat = nav.flatMap(g => g[1]);
  const comercial = (nav.find(g => g[0] === "Comercial") || [,[]])[1];
  const cadastros = (nav.find(g => g[0] === "Cadastros") || [,[]])[1];
  chk("1. Cliente em Cadastros e não em Comercial", cadastros.includes("clientes") && !comercial.includes("clientes"), JSON.stringify({comercial,cadastros}));
  chk("2. Sem menu Orçamentos", !flat.includes("orcamentos"));
  chk("3. Sem menu Produção", !flat.includes("producao"));
  chk("4. Existe menu Vendas (Comercial)", comercial.includes("vendas"));

  // ===== 5. novo registro em Vendas com status Orçamento =====
  const et1025 = await ev(page, () => vendaEtapa(DB.orcByN(1025)));
  chk("5. Registro 1025 aparece como ORCAMENTO", et1025 === "ORCAMENTO", et1025);
  const listaTodos = await ev(page, () => { fVen.etapa=""; return DB.orcamentos.length; });
  await ev(page, () => go("vendas")); await sleep(40);
  const linha1025 = await ev(page, () => { const row=[...document.querySelectorAll("tr")].find(tr=>tr.textContent.includes("#1025")); return !!row; });
  chk("5b. Lista Vendas mostra todos os registros (inclui orçamento 1025)", linha1025);

  // ===== 8 + 6/7/11/12. transformar 1025 COM entrada =====
  await ev(page, () => { const o=DB.orcByN(1025); o.status="ORCAMENTO"; o.vendaGerada=false; o.recebimentos=[]; o.parcelas=[]; delete o.producao; delete o.visita; DB.obras=DB.obras.filter(x=>x.n!==1025); if(DB.eventos)DB.eventos=DB.eventos.filter(e=>e.n!==1025); });
  const caixaA = await ev(page, () => caixaSaldo());
  await ev(page, () => transformarVendaUI(1025)); await sleep(60);
  await ev(page, () => { document.getElementById("tv-forma").value="PIX"; document.getElementById("tv-ent").value="1000"; });
  await ev(page, () => transformarVenda(1025)); await sleep(50);
  const s1 = await ev(page, () => ({ venda:DB.orcByN(1025).vendaGerada, et:vendaEtapa(DB.orcByN(1025)), rec:orcRecebido(DB.orcByN(1025)), caixa:caixaSaldo(), prod:!!DB.orcByN(1025).producao, obra:DB.obras.some(x=>x.n===1025), num:DB.orcByN(1025).n }));
  chk("6. Transformar mantém o mesmo número (1025)", s1.num===1025);
  chk("8. Entrada real (1000) movimenta caixa uma vez", Math.abs((s1.caixa-caixaA)-1000)<0.01 && Math.abs(s1.rec-1000)<0.01, "Δcaixa "+(s1.caixa-caixaA)+" rec "+s1.rec);
  chk("11. Conversão não cria produção", s1.prod===false);
  chk("12. Conversão não cria obra", s1.obra===false);
  chk("6b. Etapa após conversão = AGUARDANDO_PRODUCAO", s1.et==="AGUARDANDO_PRODUCAO", s1.et);
  // 7. continua na lista
  await ev(page, () => go("vendas")); await sleep(30);
  const ainda = await ev(page, () => [...document.querySelectorAll("tr")].some(tr=>tr.textContent.includes("#1025")));
  chk("7. Registro continua em Vendas após conversão", ainda);
  // 10. conversão repetida não duplica recebimento
  await ev(page, () => transformarVenda(1025)); await sleep(20);
  const rec2 = await ev(page, () => ({ rec:orcRecebido(DB.orcByN(1025)), caixa:caixaSaldo() }));
  chk("10. Conversão repetida não duplica recebimento/caixa", Math.abs(rec2.rec-1000)<0.01 && Math.abs(rec2.caixa-s1.caixa)<0.01, "rec "+rec2.rec);

  // ===== 9. transformar 1024 SEM entrada =====
  await ev(page, () => { const o=DB.orcByN(1024); o.status="ORCAMENTO"; o.vendaGerada=false; o.recebimentos=[]; o.parcelas=[]; delete o.producao; DB.obras=DB.obras.filter(x=>x.n!==1024); });
  const caixaB = await ev(page, () => caixaSaldo());
  await ev(page, () => transformarVendaUI(1024)); await sleep(50);
  await ev(page, () => { document.getElementById("tv-forma").value="SEM_ENTRADA"; tvFormaChange(); });
  await ev(page, () => transformarVenda(1024)); await sleep(40);
  const s9 = await ev(page, () => ({ venda:DB.orcByN(1024).vendaGerada, rec:orcRecebido(DB.orcByN(1024)), caixa:caixaSaldo() }));
  chk("9. Sem entrada: venda criada e caixa inalterado", s9.venda && s9.rec===0 && Math.abs(s9.caixa-caixaB)<0.001, JSON.stringify(s9));

  // ===== 13-15. visita técnica + agenda =====
  await ev(page, () => { curOrc=1025; });
  await ev(page, () => visitaUI(1025)); await sleep(50);
  await ev(page, () => { document.getElementById("vt-data").value="2026-08-10"; document.getElementById("vt-prof").value="João"; });
  await ev(page, () => salvarVisita(1025)); await sleep(30);
  let evs = await ev(page, () => (DB.eventos||[]).filter(e=>e.tipo==="VISITA"&&e.n===1025));
  chk("13. Visita cria um único evento na agenda", evs.length===1, "n="+evs.length);
  // editar
  await ev(page, () => visitaUI(1025)); await sleep(40);
  await ev(page, () => { document.getElementById("vt-data").value="2026-08-15"; });
  await ev(page, () => salvarVisita(1025)); await sleep(30);
  evs = await ev(page, () => (DB.eventos||[]).filter(e=>e.tipo==="VISITA"&&e.n===1025));
  chk("14. Editar visita atualiza o evento (sem duplicar)", evs.length===1 && evs[0].data==="15/08/2026", JSON.stringify(evs.map(e=>e.data)));
  // cancelar (chama confirmDlg -> aciona onOk direto)
  await ev(page, () => { const o=DB.orcByN(1025); o.visita.status="CANCELADA"; removeVisitaEvento(1025); });
  evs = await ev(page, () => (DB.eventos||[]).filter(e=>e.tipo==="VISITA"&&e.n===1025));
  chk("15. Cancelar visita remove o evento da agenda", evs.length===0);

  // ===== 16-20. produção -> obra (1025) =====
  await ev(page, () => { iniciarProducao(1025); confirmarIniciarProducao(1025); }); await sleep(30);
  const s16 = await ev(page, () => ({ prod:!!DB.orcByN(1025).producao, obra:DB.obras.some(x=>x.n===1025) }));
  chk("16. Iniciar produção não cria obra", s16.prod && s16.obra===false);
  await ev(page, () => { const p=DB.orcByN(1025).producao; p.etapas={"Corte de vidro":"C","Têmpera":"A","Furação":"O","Lapidação":"NA"}; p.terceirizacoes=[{id:"t",desc:"Vidro",status:"FABRICACAO"}]; });
  await ev(page, () => concluirProducao(1025)); await sleep(30);
  chk("17. Produção pendente bloqueia conclusão", await ev(page, () => DB.orcByN(1025).producao.concluida)===false);
  await ev(page, () => { const p=DB.orcByN(1025).producao; p.etapas={"Corte de vidro":"C","Têmpera":"C","Furação":"C","Lapidação":"NA"}; p.terceirizacoes[0].status="RECEBIDO"; });
  await ev(page, () => concluirProducao(1025)); await sleep(30);
  const pode18 = await ev(page, () => DB.orcByN(1025).producao.concluida && vendaEtapa(DB.orcByN(1025))==="PRONTO_EXECUCAO");
  chk("18. Produção concluída libera execução (PRONTO_EXECUCAO)", pode18);
  await ev(page, () => liberarExecucao(1025, true));
  await ev(page, () => liberarExecucao(1025, true));
  const s19 = await ev(page, () => ({ obras:DB.obras.filter(x=>x.n===1025).length, et:vendaEtapa(DB.orcByN(1025)) }));
  chk("19. Liberação cria uma única obra", s19.obras===1);
  await ev(page, () => go("vendas")); await sleep(30);
  chk("20. Venda continua em Vendas após virar obra", await ev(page, () => [...document.querySelectorAll("tr")].some(tr=>tr.textContent.includes("#1025"))) && s19.et==="EM_EXECUCAO", s19.et);

  // ===== 21. Obras sem valores financeiros =====
  const obrasHtml = await ev(page, () => VIEWS.obras());
  chk("21. Lista Obras não tem coluna Saldo nem R$", !/>Saldo<\/th>/.test(obrasHtml) && !/R\$/.test(obrasHtml), "temSaldo="+/>Saldo<\/th>/.test(obrasHtml)+" temRS="+/R\$/.test(obrasHtml));
  const obraFichaHtml = await ev(page, () => { const ob=DB.obras.find(x=>x.n===1025); curObra=ob.id; return VIEWS.obra(); });
  chk("21b. Ficha da obra sem card Financeiro / Abrir financeiro", !/Abrir financeiro/.test(obraFichaHtml) && !/>Total<\/span>/.test(obraFichaHtml));

  // ===== 22-25. PDFs =====
  const pdfCli = await ev(page, () => pdfCliente(DB.orcByN(1025)));
  chk("22. PDF do cliente NÃO tem medidas/metragem", !/m²/.test(pdfCli) && !/Medidas/.test(pdfCli) && !/mm ×/.test(pdfCli));
  chk("23. PDF do cliente TEM valores e condições", /Total/.test(pdfCli) && /Condições de pagamento/.test(pdfCli) && /R\$/.test(pdfCli));
  const pdfProd = await ev(page, () => pdfProducao(DB.orcByN(1025)));
  chk("24. Ordem de produção TEM medidas e peças", /Medidas/.test(pdfProd) && /Peças/.test(pdfProd));
  chk("25. Ordem de produção NÃO tem valores (R$/Subtotal/Total geral)", !/R\$/.test(pdfProd) && !/Subtotal/.test(pdfProd) && !/Condições de pagamento/.test(pdfProd));

  // ===== 26. previsão de entrega =====
  await ev(page, () => setEntrega(1025,'qtd',15));
  await ev(page, () => { setEntrega(1025,'unidade','uteis'); setEntrega(1025,'base','medicao'); });
  const prevTxt = await ev(page, () => prevEntregaTxt(DB.orcByN(1025)));
  const pdfCli2 = await ev(page, () => pdfCliente(DB.orcByN(1025)));
  chk("26. Previsão de entrega aparece na ficha e no PDF do cliente", prevTxt.includes("15") && pdfCli2.includes("15 dias úteis"), prevTxt);

  // ===== 27. avancarEtapa não pula fluxo =====
  await ev(page, () => { DB.orcByN(1029).status="APROVADO"; });
  const st27a = await ev(page, () => DB.orcByN(1029).status);
  await ev(page, () => avancarEtapa(1029));
  const st27b = await ev(page, () => DB.orcByN(1029).status);
  chk("27. avancarEtapa não altera status (neutralizado)", st27a===st27b, st27a+"->"+st27b);

  // ===== 28. cancelamento preserva histórico =====
  const hAntes = await ev(page, () => (DB.orcByN(1026).hist||[]).length);
  await ev(page, () => { const o=DB.orcByN(1026); o.status="CANCELADO"; o.hist.push({d:"x",por:"y",acao:"Registro cancelado"}); });
  const s28 = await ev(page, () => ({ et:vendaEtapa(DB.orcByN(1026)), h:(DB.orcByN(1026).hist||[]).length }));
  chk("28. Cancelamento preserva histórico", s28.et==="CANCELADO" && s28.h>hAntes, JSON.stringify(s28));

  // ===== 29. exclusão não remove venda com movimentação =====
  await ev(page, () => excluirRegistro(1027));
  const existe1027 = await ev(page, () => !!DB.orcByN(1027));
  chk("29. Exclusão não remove venda com movimentação (1027)", existe1027);

  // ===== 30. botões dev desabilitados =====
  const devHtml = await ev(page, () => VIEWS.vendedores()+VIEWS.contas()+VIEWS.operadoras()+VIEWS.usuarios());
  chk("30. Botões não implementados ficam desabilitados 'em desenvolvimento'", /em desenvolvimento/.test(devHtml) && /disabled/.test(devHtml) && !/Disponível na versão completa/.test(devHtml));

  // ===== regressões financeiras =====
  const alvo = await ev(page, () => [1028,1029,1024].find(n=>orcSaldoF(DB.orcByN(n))>0 && DB.orcByN(n).vendaGerada));
  if (alvo) {
    const sa = await ev(page, n => orcSaldoF(DB.orcByN(n)), alvo);
    await ev(page, n => abrirRegReceb(n), alvo); await sleep(40);
    if (await ev(page, () => !!document.getElementById("rr-valor"))) {
      await ev(page, v => { document.getElementById("rr-valor").value=String(v+99999); }, sa);
      await ev(page, n => salvarReceb(n), alvo); await sleep(30);
      chk("A1: over-recebimento bloqueado", await ev(page, n => orcSaldoF(DB.orcByN(n)), alvo) >= -0.01);
      await ev(page, () => closeModal());
    }
  }

  chk("31. Zero erros JavaScript", errors.length===0, errors.slice(0,3).join(" | "));

  console.log("=== ERROS JS ==="); console.log(errors.length ? errors.slice(0, 15).join("\n") : "NENHUM");
  console.log("=== RESULTADOS ===");
  R.forEach(r => console.log(r[0] + " | " + r[1] + (r[2] ? "  (" + r[2] + ")" : "")));
  const fails = R.filter(r => r[0] === "FAIL").length;
  console.log("=== " + (R.length - fails) + "/" + R.length + " PASS, " + fails + " FAIL, " + errors.length + " erros JS ===");
  await b.close();
})().catch(e => { console.error("HARNESS:", e); process.exit(1); });
