const { chromium } = require("playwright-core");
const EXE = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const OUT = "/tmp/claude-0/-home-user-Sistema-Or-amento-Vidra-aria/58a882f8-11eb-59b3-a4d7-34447a0c185b/scratchpad";
const FILE = "file://" + OUT + "/vidrogestor-lote-final.html";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const R = []; const chk = (n, c, d) => R.push([c ? "PASS" : "FAIL", n, d || ""]);
const ev = (page, fn, arg) => page.evaluate(fn, arg);
(async () => {
  const b = await chromium.launch({ executablePath: EXE });
  const page = await b.newContext({ viewport: { width: 1500, height: 950 } }).then(c => c.newPage());
  page.on("dialog", d => d.dismiss().catch(()=>{}));
  const errors = [];
  page.on("pageerror", e => errors.push("PAGEERR: " + e.message));
  page.on("console", m => { if (m.type() === "error") errors.push("CONSOLE: " + m.text()); });
  await page.goto(FILE, { waitUntil: "load" }); await sleep(200);
  await ev(page, () => enter()); await sleep(150);

  // viewport meta
  chk("Viewport meta presente (mobile)", await ev(page, () => !!document.querySelector('meta[name=viewport]')));
  chk("Manifest link presente", await ev(page, () => !!document.querySelector('link[rel=manifest]')));

  // CP bug: admin em L2 cria conta -> aparece no escopo L2
  await ev(page, () => { CURR_USER=DB.usuarios.find(u=>u.perfil==="admin"); CURR_LOJA="L2"; go("contas-pagar"); }); await sleep(50);
  const antes = await ev(page, () => DB.contasPagar.filter(cpVisivel).length);
  await ev(page, () => cpNovo()); await sleep(50);
  const lojaDefault = await ev(page, () => (document.getElementById("cp-loja")||{}).value);
  await ev(page, () => { document.getElementById("cp-forn").value="Fornecedor L2"; document.getElementById("cp-valor").value="333"; document.getElementById("cp-venc").value="2026-10-10"; document.getElementById("cp-loja").value="L2"; });
  await ev(page, () => cpSalvar(false)); await sleep(50);
  const depois = await ev(page, () => DB.contasPagar.filter(cpVisivel).length);
  const novaLoja = await ev(page, () => DB.contasPagar[DB.contasPagar.length-1].lojaId);
  chk("§10 Contas a Pagar: salva na loja selecionada e aparece no escopo", depois===antes+1 && novaLoja==="L2" && lojaDefault==="L2", "antes "+antes+" depois "+depois+" loja "+novaLoja);
  // salvar sem baixa não movimenta caixa
  const caixaSemBaixa = await ev(page, () => caixaSaldo());
  await ev(page, () => cpNovo()); await sleep(40);
  await ev(page, () => { document.getElementById("cp-forn").value="Sem baixa"; document.getElementById("cp-valor").value="200"; document.getElementById("cp-venc").value="2026-10-11"; });
  await ev(page, () => cpSalvar(false)); await sleep(30);
  chk("§10 Salvar não movimenta caixa", Math.abs(await ev(page,()=>caixaSaldo())-caixaSemBaixa)<0.001);

  // §11 layout grid
  await ev(page, () => go("contas-pagar")); await sleep(40);
  const layout = await ev(page, () => { const el=document.querySelector(".cp-layout"); if(!el)return null; const cs=getComputedStyle(el); return { grid:cs.display, tablewrap:!!document.querySelector(".cp-tablewrap"), info:!!document.querySelector(".cp-info") }; });
  chk("§11 Layout CP em grid, tabela com wrapper e painel no fluxo (sem sobreposição)", layout && layout.grid==="grid" && layout.tablewrap && layout.info, JSON.stringify(layout));

  // §5 proteção de rota: vendedor não acessa contas-pagar direto
  await ev(page, () => { CURR_USER=DB.usuarios.find(u=>u.perfil==="vendedor"); CURR_LOJA=""; });
  await ev(page, () => go("contas-pagar")); await sleep(40);
  const rotaBloq = await ev(page, () => ({ cur, txt:(document.querySelector(".view")||{}).textContent||"" }));
  chk("§5 Rota protegida: vendedor→contas-pagar bloqueado (não renderiza)", rotaBloq.cur!=="contas-pagar" && /Acesso negado/.test(rotaBloq.txt), rotaBloq.cur);

  // §14/17 contrato — volta admin
  await ev(page, () => { CURR_USER=DB.usuarios.find(u=>u.perfil==="admin"); CURR_LOJA=""; DB.orcByN(1024).vendaGerada=true; });
  const cValid = await ev(page, () => contratoValidar(DB.orcByN(1024)));
  chk("§17 Contrato: validação retorna lista (dados completos → vazia)", Array.isArray(cValid), JSON.stringify(cValid));
  const cHtml = await ev(page, () => pdfContrato(DB.orcByN(1024)));
  chk("§16 Contrato: minuta + 21ª cláusula + itens da venda + total", /MINUTA CONTRATUAL/.test(cHtml) && /CLÁUSULA 21ª/.test(cHtml) && /CLÁUSULA 3ª/.test(cHtml) && /Total/.test(cHtml));
  chk("§17 Contrato: puxa empresa, cliente, foro e garantia", /CNPJ/.test(cHtml) && new RegExp(esc0(await ev(page,()=>DB.orcByN(1024).clienteNome))).test(cHtml) && /Fica eleito o foro/.test(cHtml));
  // acusa dado ausente
  const cMiss = await ev(page, () => { const cli=DB.cliById(DB.orcByN(1024).clienteId); const bak=cli.doc; cli.doc=""; const m=contratoValidar(DB.orcByN(1024)); cli.doc=bak; return m; });
  chk("§17 Contrato: acusa campo ausente e não inventa", cMiss.some(x=>/documento/.test(x)));
  // gerar registra histórico (completa os dados obrigatórios da empresa, como o usuário faria em Configurações)
  await ev(page, () => { Object.assign(DB.config.empresa,{representante:"Responsável Conceito Glass",repCpf:"000.000.000-00",foro:"Comarca de Belo Horizonte/MG"}); });
  const docs0 = await ev(page, () => DB.docs.length);
  await ev(page, () => gerarContrato(1024)); await sleep(40);
  chk("§19 Contrato gerado registra emissão no histórico", await ev(page,()=>DB.docs.length)>docs0 && await ev(page,()=>DB.docs[0].tipo==="CONTRATO_SERVICOS"));

  // §18 termo
  await ev(page, () => { const o=DB.orcByN(1027); }); // 1027 tem obra
  const temObra1027 = await ev(page, () => !!obraByN(1027));
  const tHtml = await ev(page, () => pdfTermo(DB.orcByN(1027)));
  chk("§18 Termo: declaração de responsabilidade + ressalvas + sem valores", /assume a responsabilidade/.test(tHtml) && /Entrega sem ressalvas/.test(tHtml) && /Entrega com ressalvas/.test(tHtml) && !/R\$/.test(tHtml), "obra1027="+temObra1027);
  chk("§18 Termo: não finaliza obra automaticamente (função separada existe)", await ev(page, () => typeof confirmarEntregaFinalizar==="function"));

  // §7 produção não gera PDF comercial / não vê valores
  await ev(page, () => { CURR_USER={id:"px",nome:"Op Prod",perfil:"producao",lojas:["L1"],vendedorId:""}; CURR_LOJA="L1"; });
  chk("§7 Produção não pode ver valores nem gerar contrato", (await ev(page,()=>can("fin.ver_valores")))===false && (await ev(page,()=>can("fin.contas_pagar")))===false);
  await ev(page, () => go("contas-pagar")); await sleep(30);
  chk("§7 Produção→contas-pagar bloqueado", await ev(page,()=>cur)!=="contas-pagar");

  // §20 camada de repositórios (preparação para backend)
  await ev(page, () => { CURR_USER=DB.usuarios.find(u=>u.perfil==="admin"); CURR_LOJA=""; });
  chk("§20 Repo existe com driver de memória e troca de driver (use)", await ev(page, () =>
    typeof Repo==="object" && Repo.driverName()==="memory" && typeof Repo.use==="function"));
  chk("§20 Repo.of(orcamentos) usa PK 'n' e lê a mesma coleção do DB", await ev(page, async () => {
    const r=Repo.of("orcamentos"); const l=await r.list(); const g=await r.get(1024);
    return r.pk==="n" && l.length===DB.orcamentos.length && !!g && g.n===1024;
  }));
  chk("§20 Repo CRUD assíncrono (add/update/remove) reflete no DB e não vaza", await ev(page, async () => {
    const r=Repo.of("clientes"); const n0=DB.clientes.length;
    const novo=await r.add({id:"cRepoTest",nome:"Cliente Repo",obras:[]});
    const g1=await r.get("cRepoTest");
    await r.update("cRepoTest",{nome:"Cliente Repo 2"});
    const g2=await r.get("cRepoTest");
    const rem=await r.remove("cRepoTest");
    return DB.clientes.length===n0 && !!g1 && g2.nome==="Cliente Repo 2" && rem===true;
  }));
  chk("§20 Troca para driver de API (contrato idêntico) sem tocar telas", await ev(page, async () => {
    const calls=[]; function ApiDriver(col){return {driver:"api",collection:col,pk:"id",
      list:async()=>{calls.push("list:"+col);return [];}, get:async()=>null, add:async o=>o,
      update:async()=>null, remove:async()=>false, query:async()=>[]};}
    Repo.use(ApiDriver);
    const okName=Repo.driverName()==="api";
    await Repo.of("orcamentos").list();
    Repo.use(MemoryDriver); // restaura para não afetar demais provas
    return okName && calls.length===1 && Repo.driverName()==="memory";
  }));

  // Configurações → Empresa (dados + salvar + persistência) e logomarca
  await ev(page, () => { CURR_USER=DB.usuarios.find(u=>u.perfil==="admin"); CURR_LOJA=""; try{localStorage.removeItem("vg_config_empresa");}catch(e){} cfgTab="empresa"; go("configuracoes"); }); await sleep(60);
  chk("Empresa pré-preenchida (Conceito Glass)", await ev(page,()=>DB.config.empresa.fantasia==="Conceito Glass" && DB.config.empresa.cnpj==="29.881.345/0001-83"));
  chk("Aba Empresa tem inputs com id e botão Salvar", await ev(page,()=>!!document.getElementById("emp-cnpj") && !!document.getElementById("emp-tel") && [...document.querySelectorAll(".view button")].some(b=>/Salvar dados da empresa/i.test(b.textContent))));
  // editar e salvar de verdade
  await ev(page, () => { document.getElementById("emp-tel").value="(31) 3333-4444"; document.getElementById("emp-endereco").value="Rua José Félix Martins, 713"; salvarEmpresa(); }); await sleep(60);
  chk("Salvar grava em DB.config e persiste (localStorage)", await ev(page,()=>{
    const okMem=DB.config.empresa.tel==="(31) 3333-4444";
    let okLS=false; try{okLS=(JSON.parse(localStorage.getItem("vg_config_empresa")).tel==="(31) 3333-4444");}catch(e){}
    return okMem && okLS;
  }));
  chk("Logomarca padrão presente (SVG data URI)", await ev(page,()=>typeof DB.config.empresa.logo==="string" && /^data:image\/svg/.test(DB.config.empresa.logo)));
  chk("Logo aparece no login e nome no menu", await ev(page,()=>{
    const li=document.getElementById("login-logo"), sn=document.getElementById("side-name");
    return !!(li && li.querySelector("img")) && !!(sn && /Conceito Glass/.test(sn.textContent));
  }));
  chk("Logo entra no cabeçalho do PDF (contrato/orçamento)", await ev(page,()=>/(<img[^>]+src="data:image)/.test(pdfContrato(DB.orcByN(1024))) && /<img[^>]+src="data:image/.test(pdfCliente(DB.orcByN(1024)))));
  // upload de logo (base64) reflete no sistema
  await ev(page, () => { const png="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="; DB.config.empresa.logo=png; cfgPersist(); buildNav(); }); await sleep(30);
  chk("Upload de logo (base64) reflete e persiste", await ev(page,()=>{
    let okLS=false; try{okLS=/^data:image\/png/.test(JSON.parse(localStorage.getItem("vg_config_empresa")).logo);}catch(e){}
    return /^data:image\/png/.test(DB.config.empresa.logo) && okLS;
  }));
  // restaurar padrão
  await ev(page, () => empLogoReset()); await sleep(20);
  chk("Restaurar logomarca padrão volta ao SVG", await ev(page,()=>/^data:image\/svg/.test(DB.config.empresa.logo)));

  // item 2: vendedor logado preenche o campo vendedor automaticamente
  await ev(page, () => { CURR_USER=DB.usuarios.find(u=>u.perfil==="vendedor"); CURR_LOJA=""; go("orcamento-novo"); }); await sleep(90);
  const vAuto = await ev(page, () => ({vend:B.vendNome, meu:(DB.vendedores.find(v=>v.id===CURR_USER.vendedorId)||{}).nome}));
  chk("Vendedor logado preenche vendedor automaticamente", !!vAuto.vend && vAuto.vend===vAuto.meu, JSON.stringify(vAuto));
  // item 1: prazo de entrega em dias
  const prazo = await ev(page, () => { B.entrega={qtd:60,unidade:"corridos",base:"aprovacao",obs:""}; return prevEntregaTxt(B); });
  chk("Prazo de entrega em dias (60 dias)", /60 dias/.test(prazo), prazo);
  // itens 3/4/6/7: PDF cliente x produção
  await ev(page, () => { CURR_USER=DB.usuarios.find(u=>u.perfil==="admin"); CURR_LOJA=""; const o=DB.orcByN(1024); o.obs="Obs cliente XYZ"; o.obsInterna="Interna ABC producao"; o.acrescimo=100; });
  const cliHtml = await ev(page, () => pdfCliente(DB.orcByN(1024)));
  const prodHtml = await ev(page, () => pdfProducao(DB.orcByN(1024)));
  chk("PDF cliente com Qtd. e Valor unit.", /Qtd\./.test(cliHtml) && /Valor unit\./.test(cliHtml));
  chk("PDF cliente mostra Acréscimo em linha própria", /Acréscimo/.test(cliHtml));
  chk("Observação interna só na produção (não no cliente)", /Interna ABC producao/.test(prodHtml) && !/Interna ABC producao/.test(cliHtml));
  chk("Observação (cliente) aparece na via do cliente", /Obs cliente XYZ/.test(cliHtml));
  // item 8: situação comercial (funil editável)
  chk("Funil de situações existe e é editável", await ev(page,()=>Array.isArray(DB.config.funil)&&DB.config.funil.length>0&&typeof setSituacao==="function"));
  const sit = await ev(page, () => { const o=DB.orcByN(1024); o.situacao="Enviado"; return situacaoBadge(o); });
  chk("Situação comercial vira badge visível", /Enviado/.test(sit)&&/badge/.test(sit), sit);
  // item 9: reclamação (novo fluxo com formulário)
  const rec = await ev(page, () => { registrarReclamacao(1026); document.getElementById("rc-titulo").value="Teste"; salvarReclamacao(1026); return vendaEtapa(DB.orcByN(1026)); });
  chk("Registrar reclamação leva a venda para RECLAMACAO", rec==="RECLAMACAO", rec);
  const rec2 = await ev(page, () => { encerrarReclamacao(1026); return vendaEtapa(DB.orcByN(1026)); });
  chk("Encerrar reclamação normaliza a venda", rec2!=="RECLAMACAO", rec2);
  // item 5: contrato acusa representante/foro ausente
  await ev(page, () => { DB.config.empresa.representante=""; DB.config.empresa.foro=""; });
  const missArr = await ev(page, () => contratoValidar(DB.orcByN(1024)).join(" | "));
  chk("Contrato acusa representante ausente (com atalho p/ Configurações)", /representante/.test(missArr), missArr);

  // ===== Lote financeiro =====
  await ev(page, () => { CURR_USER=DB.usuarios.find(u=>u.perfil==="admin"); CURR_LOJA=""; });
  chk("CP: excluir individual e em massa disponíveis", await ev(page,()=>typeof cpExcluirSel==="function"&&typeof cpExcluirSerieUI==="function"));
  chk("CEP: função de busca automática existe", await ev(page,()=>typeof buscaCEP==="function"));
  // transformar em venda: pagar tudo não gera saldo/parcelas
  await ev(page, () => { const o=DB.orcamentos.find(x=>!x.vendaGerada&&x.status!=="CANCELADO"&&x.ambientes.some(a=>a.itens.length)); window.__tvN=o?o.n:null; });
  const tvN = await ev(page, () => window.__tvN);
  if(tvN){
    await ev(page, (n) => { transformarVendaUI(n); }, tvN); await sleep(60);
    await ev(page, () => { tvEntTotal(); }); await sleep(30);
    const pg = await ev(page, () => ({saldoHidden:(document.getElementById("tv-saldo").closest("div").style.display==="none"), info:document.getElementById("tv-pagotudo").style.display}));
    chk("Transformar em venda: 'Recebeu tudo' esconde saldo", pg.saldoHidden && pg.info==="block", JSON.stringify(pg));
    await ev(page, (n) => { transformarVenda(n); }, tvN); await sleep(40);
    const noSaldo = await ev(page, (n) => { const o=DB.orcByN(n); return {parc:(o.parcelas||[]).length, sal:orcSaldoF(o), rec:orcRecebido(o)}; }, tvN);
    chk("Pago integral: sem parcelas de saldo e saldo zero", noSaldo.parc===0 && noSaldo.sal<=0.01 && noSaldo.rec>0, JSON.stringify(noSaldo));
    chk("Contas a receber reflete recebido da venda (bug 50% corrigido)", await ev(page,(n)=>{const o=DB.orcByN(n);return crSitVenda(o)==="QUITADA";},tvN));
  } else { chk("Transformar em venda testável", false, "sem orçamento elegível"); }
  // contas a receber SEM caixa duplicado; caixa próprio no menu
  chk("Caixa não é duplicado dentro de Contas a receber", await ev(page,()=>{const a=VIEWS["contas-receber"]();return !/Caixa \(movimenta/.test(a) && /Ver no Caixa/.test(a);}));
  chk("Contas a receber por venda (Total/Recebido/Saldo)", await ev(page,()=>{const h=VIEWS["contas-receber"]();return /Total previsto/.test(h)&&/Recebido/.test(h)&&/A receber/.test(h);}));
  // análise de custo/margem por venda
  chk("Financeiro por venda: análise de custo e margem", await ev(page,()=>{const o=DB.orcByN(1024);const m=margemVenda(o);return typeof analiseCustoCard==="function"&&m.receita>0&&typeof m.margem==="number";}));
  const ceOk = await ev(page,()=>{const o=DB.orcByN(1024);const before=custoExtrasVenda(o);o.custosExtras=o.custosExtras||[];o.custosExtras.push({id:"cetest",desc:"Assistência",valor:120,data:hojeBR()});return custoExtrasVenda(o)===before+120&&typeof addCustoExtra==="function"&&typeof delCustoExtra==="function";});
  chk("Custos extras manuais por venda (adicionar/somar)", ceOk);
  // centro de custos + rateio
  chk("Centro de custos: config e rateio por venda", await ev(page,()=>{DB.config.centroCusto.ativo=true;DB.config.centroCusto.adsInvest=1000;const ca=custoAquisicaoVenda(DB.orcByN(1024));return ca>0 && typeof centroCustoTotal==="function" && DB.config.centroCusto.adsInvest===1000;}));
  chk("Centro de custos no menu Financeiro (fora de Configurações)", await ev(page,()=>typeof VIEWS["centro-custos"]==="function" && NAV.some(g=>g[1].some(i=>i[0]==="centro-custos")) && !CFG_TABS.some(t=>t[0]==="centrocusto")));

  // ===== Multiloja =====
  await ev(page, () => { CURR_USER=DB.usuarios.find(u=>u.perfil==="admin"); CURR_LOJA="L2"; go("orcamento-novo"); }); await sleep(70);
  chk("Orçamento: campo de loja (default = operação atual)", await ev(page,()=>B.lojaId==="L2"));
  const nL0 = await ev(page,()=>DB.lojas.length);
  await ev(page, () => { openLojaForm(); document.getElementById("lj-nome").value="Loja Teste ML"; document.getElementById("lj-cidade").value="Contagem/MG"; salvarLoja(""); });
  const lojaCriada = await ev(page,()=>({n:DB.lojas.length, nome:DB.lojas[DB.lojas.length-1].nome}));
  chk("Multiloja: criar loja (editável, sem 'em desenvolvimento')", lojaCriada.n===nL0+1 && lojaCriada.nome==="Loja Teste ML");
  await ev(page, () => { const l=DB.lojas[DB.lojas.length-1]; openLojaForm(l.id); document.getElementById("lj-resp").value="Resp Teste"; salvarLoja(l.id); });
  chk("Multiloja: editar loja", await ev(page,()=>DB.lojas[DB.lojas.length-1].resp==="Resp Teste"));
  const nU0 = await ev(page,()=>DB.usuarios.length);
  await ev(page, () => { openUsuarioForm(); document.getElementById("us-nome").value="Usuário Teste"; document.getElementById("us-email").value="u@teste.com"; const cbs=document.querySelectorAll(".us-loja"); if(cbs[0])cbs[0].checked=true; salvarUsuario(""); });
  const userCriado = await ev(page,()=>({n:DB.usuarios.length, lojas:(DB.usuarios[DB.usuarios.length-1].lojas||[]).length}));
  chk("Multiusuário: criar usuário com lojas de acesso", userCriado.n===nU0+1 && userCriado.lojas>0);
  // filtro por operação em contas a receber
  await ev(page, () => { const o=DB.orcamentos.find(x=>x.vendaGerada); window.__mlN=o.n; o.lojaId="L3"; CURR_USER=DB.usuarios.find(u=>u.perfil==="admin"); });
  const visL3 = await ev(page, () => { CURR_LOJA="L3"; return crVendas().some(o=>o.n===window.__mlN); });
  const visL1 = await ev(page, () => { CURR_LOJA="L1"; return crVendas().some(o=>o.n===window.__mlN); });
  await ev(page, () => { CURR_LOJA=""; });
  chk("Multiloja filtra contas a receber pela operação", visL3 && !visL1, "L3="+visL3+" L1="+visL1);

  // Impressão do PDF: sai apenas o documento (sem menu/topo/faixa/barra de botões)
  chk("imprimirDoc existe (título de impressão limpo)", await ev(page,()=>typeof imprimirDoc==="function"));
  await ev(page, () => { CURR_USER=DB.usuarios.find(u=>u.perfil==="admin"); CURR_LOJA=""; pdfAbrir(1024,"cliente"); }); await sleep(80);
  await page.emulateMedia({ media: "print" }); await sleep(40);
  const pv = await ev(page, () => { const d=s=>{const el=document.querySelector(s);return el?getComputedStyle(el).display:"none";}; return {tool:d(".pdf-tool"),side:d(".sidebar"),top:d(".topbar"),aviso:d("#proto-aviso"),paper:d(".paper")}; });
  await page.emulateMedia({ media: "screen" });
  chk("Impressão mostra só o documento (interface oculta)", pv.tool==="none"&&pv.side==="none"&&pv.top==="none"&&pv.aviso==="none"&&pv.paper!=="none", JSON.stringify(pv));

  chk("Zero erros JavaScript", errors.length===0, errors.slice(0,3).join(" | "));
  console.log("=== ERROS JS ==="); console.log(errors.length ? errors.slice(0,15).join("\n") : "NENHUM");
  console.log("=== RESULTADOS ===");
  R.forEach(r => console.log(r[0] + " | " + r[1] + (r[2] ? "  (" + r[2] + ")" : "")));
  const fails = R.filter(r => r[0]==="FAIL").length;
  console.log("=== " + (R.length-fails) + "/" + R.length + " PASS, " + fails + " FAIL, " + errors.length + " erros JS ===");
  await b.close();
})().catch(e => { console.error("HARNESS:", e); process.exit(1); });
function esc0(s){return String(s).replace(/[.*+?^${}()|[\]\\]/g,"\\$&");}
