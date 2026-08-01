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
  page.on("dialog", d => { try{ d.accept("0"); }catch(e){} });
  const errors = []; page.on("pageerror", e => errors.push("PAGEERR: "+e.message)); page.on("console", m=>{if(m.type()==="error")errors.push("C: "+m.text());});
  await page.goto(FILE, { waitUntil: "load" }); await sleep(200);
  await ev(page, () => { enter(); CURR_USER=DB.usuarios.find(u=>u.perfil==="admin"); CURR_LOJA=""; });
  const vN = await ev(page,()=>contasReceberVisiveis()[0].n);

  // ---- ANÁLISE POR VENDA ----
  chk("4. Lista NÃO usa abrirFinanceiro (usa abrirAnaliseVenda)", await ev(page,()=>{const h=VIEWS["analise-venda"]();return /abrirAnaliseVenda\(/.test(h)&&!/abrirFinanceiro\(/.test(h);}));
  const c1 = await ev(page,(n)=>{ abrirAnaliseVenda(n); return cur; },vN);
  chk("1. Clicar abre analise-venda-detalhe", c1==="analise-venda-detalhe", c1);
  chk("2/3. Não abre Vendas/Acompanhamento/Financeiro antiga", c1!=="vendas"&&c1!=="acompanhamento"&&c1!=="financeiro");
  chk("5. Botão Voltar retorna à listagem (go('analise-venda'))", await ev(page,()=>/go\('analise-venda'\)/.test(VIEWS["analise-venda-detalhe"]())));
  const cd0 = await ev(page,(n)=>(DB.orcByN(n).custosExtras||[]).length,vN);
  await ev(page,(n)=>{ addCustoDireto(n); document.getElementById("cd-desc").value="Retrabalho vidro"; document.getElementById("cd-cat").value="Retrabalho"; document.getElementById("cd-valor").value="180"; salvarCustoDireto(); },vN);
  const cd1 = await ev(page,(n)=>{const o=DB.orcByN(n);return {n:(o.custosExtras||[]).length,last:o.custosExtras[o.custosExtras.length-1]};},vN);
  chk("6. Criar custo direto", cd1.n===cd0+1 && cd1.last.desc==="Retrabalho vidro" && cd1.last.valor===180);
  const margAntes = await ev(page,(n)=>margemVenda(DB.orcByN(n)).lucro,vN);
  await ev(page,(n)=>{ const o=DB.orcByN(n);const id=o.custosExtras[o.custosExtras.length-1].id; addCustoDireto(n,id); document.getElementById("cd-valor").value="300"; salvarCustoDireto(); },vN);
  const margDepois = await ev(page,(n)=>margemVenda(DB.orcByN(n)).lucro,vN);
  chk("7/9. Editar custo recalcula lucro/margem", await ev(page,(n)=>DB.orcByN(n).custosExtras.slice(-1)[0].valor,vN)===300 && margDepois<margAntes, margAntes+"→"+margDepois);
  await ev(page,(n)=>{ const o=DB.orcByN(n);const id=o.custosExtras[o.custosExtras.length-1].id; delCustoDireto(n,id); if(window.__ok)window.__ok(); },vN);
  chk("8. Excluir custo direto", await ev(page,(n)=>(DB.orcByN(n).custosExtras||[]).length,vN)===cd0);
  chk("11. Rateios mostram a origem (centro/regra/base)", await ev(page,(n)=>{const h=VIEWS["analise-venda-detalhe"]();return /Rateios do Centro de Custos/.test(h)&&/Regra/.test(h)&&/Base/.test(h);},vN));
  chk("Custo não participa não entra na margem", await ev(page,()=>{const o=DB.orcByN(contasReceberVisiveis()[0].n);o.custosExtras=[{id:"np1",desc:"NP",valor:500,participaMargem:false}];const a=custoExtrasVenda(o);o.custosExtras=[];return a===0;}));
  chk("13. Sem permissão fin.ver_custos não abre por chamada direta", await ev(page,(n)=>{ const admin=CURR_USER; go("analise-venda"); CURR_USER={id:"v",nome:"V",perfil:"vendedor",lojas:[],vendedorId:"v1"}; abrirAnaliseVenda(n); const bloq=cur!=="analise-venda-detalhe"; CURR_USER=admin; return bloq; },vN));
  await ev(page,()=>{ CURR_USER=DB.usuarios.find(u=>u.perfil==="admin"); CURR_LOJA=""; });

  // ---- MÃO DE OBRA / HORA-MÁQUINA valor ou % (fórmulas) ----
  chk("14. Adicional em valor soma", Math.abs(await ev(page,()=>custoMensalMaoObra({salario:2000,componentes:[{tipo:"valor",valor:500}]}))-2500)<0.01);
  chk("15. Adicional percentual sobre salário-base", Math.abs(await ev(page,()=>custoMensalMaoObra({salario:2000,componentes:[{tipo:"pct",valor:35}]}))-2700)<0.01);
  chk("16. Componentes mistos", Math.abs(await ev(page,()=>custoMensalMaoObra({salario:2000,componentes:[{tipo:"valor",valor:300},{tipo:"pct",valor:10}]}))-2500)<0.01);
  chk("20. Registro antigo (mão de obra) assume valor", Math.abs(await ev(page,()=>custoMensalMaoObra({salario:1000,encargos:200,beneficios:100}))-1300)<0.01);
  chk("21. Manutenção em valor (máquina)", Math.abs(await ev(page,()=>custoMensalMaquina({aquisicao:12000,residual:0,vidaUtil:10,unidadeVida:"anos",componentes:[{tipo:"valor",valor:200}]}))-300)<0.01);
  chk("22. Manutenção percentual sobre aquisição", Math.abs(await ev(page,()=>custoMensalMaquina({aquisicao:12000,residual:0,vidaUtil:10,unidadeVida:"anos",componentes:[{tipo:"pct",valor:1,base:"aquisicao"}]}))-220)<0.01);
  chk("24. Depreciação não é duplicada", Math.abs(await ev(page,()=>custoMensalMaquina({aquisicao:12000,residual:0,vidaUtil:10,unidadeVida:"anos",componentes:[]}))-100)<0.01);
  chk("28. Registro antigo (máquina) assume valor", Math.abs(await ev(page,()=>custoMensalMaquina({aquisicao:12000,residual:0,vidaUtil:10,unidadeVida:"anos",manutencao:200,energia:0}))-300)<0.01);
  chk("Forms dinâmicos de mão de obra e máquina existem", await ev(page,()=>typeof openMaoObraForm==="function"&&typeof moRecalc==="function"&&typeof openMaquinaForm==="function"&&typeof mqRecalc==="function"));

  // ---- REMOÇÃO VISÃO FINANCEIRA ----
  chk("29. Visão financeira não está no menu", await ev(page,()=>!NAV.some(g=>g[1].some(i=>i[0]==="visao-financeira"))));
  chk("30. View visao-financeira não existe", await ev(page,()=>typeof VIEWS["visao-financeira"]==="undefined"));
  chk("31. Nenhum botão/atalho referencia visao-financeira", await ev(page,()=>{const alvo=[VIEWS["contas-receber"](),VIEWS["caixa"](),VIEWS["ponto-equilibrio"](),VIEWS["analise-venda"]()].join(" ");return !/visao-financeira/.test(alvo);}));
  chk("32-37. Demais telas financeiras seguem funcionando", await ev(page,()=>["contas-receber","contas-pagar","caixa","centro-custos","ponto-equilibrio","analise-venda"].every(v=>typeof VIEWS[v]==="function"&&VIEWS[v]().length>0)));
  chk("Grupo Financeiro tem 6 itens (sem visão financeira)", await ev(page,()=>{const f=NAV.find(g=>g[0]==="Financeiro")[1].map(i=>i[0]);return f.length===6&&!f.includes("visao-financeira");}));

  // ---- multiloja ----
  chk("12. Análise por venda respeita multiloja", await ev(page,()=>{ CURR_LOJA="L3"; const so=DB.orcamentos.find(o=>o.vendaGerada); const bak=so.lojaId; so.lojaId="L1"; const vis=contasReceberVisiveis().some(o=>o.n===so.n); so.lojaId=bak; CURR_LOJA=""; return !vis; }));

  chk("Zero erros JavaScript", errors.length===0, errors.slice(0,4).join(" | "));
  console.log("=== ERROS JS ==="); console.log(errors.length?errors.slice(0,12).join("\n"):"NENHUM");
  console.log("=== CORREÇÕES — RESULTADOS ===");
  R.forEach(r => console.log(r[0]+" | "+r[1]+(r[2]?"  ("+r[2]+")":"")));
  const fails=R.filter(r=>r[0]==="FAIL").length;
  console.log("=== "+(R.length-fails)+"/"+R.length+" PASS, "+fails+" FAIL, "+errors.length+" erros JS ===");
  await b.close();
})().catch(e=>{console.error("HARNESS:",e);process.exit(1);});
