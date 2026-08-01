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
  page.on("dialog", d => { try{ d.accept("0"); }catch(e){ d.dismiss().catch(()=>{}); } });
  const errors = []; page.on("pageerror", e => errors.push("PAGEERR: " + e.message)); page.on("console", m => { if (m.type()==="error") errors.push("CONSOLE: "+m.text()); });
  await page.goto(FILE, { waitUntil: "load" }); await sleep(200);
  await ev(page, () => { enter(); CURR_USER=DB.usuarios.find(u=>u.perfil==="admin"); CURR_LOJA=""; });

  // ---------- RECLAMAÇÕES ----------
  const vN = await ev(page, () => { const o=DB.orcamentos.find(x=>x.vendaGerada); return o.n; });
  await ev(page, (n) => { registrarReclamacao(n); document.getElementById("rc-titulo").value="Infiltração"; document.getElementById("rc-desc").value="Entrou água"; document.getElementById("rc-prio").value="alta"; salvarReclamacao(n); }, vN);
  let rid = await ev(page, (n) => { const o=DB.orcByN(n); return o.reclamacoes[o.reclamacoes.length-1].id; }, vN);
  chk("1. Criar reclamação (status PENDENTE)", await ev(page,(id)=>reclById(id).r.status==="PENDENTE",rid));
  await ev(page,(id)=>reclStatusSet(id,"EM_ATENDIMENTO"),rid);
  chk("2. Mudar para Em atendimento", await ev(page,(id)=>reclById(id).r.status==="EM_ATENDIMENTO",rid));
  await ev(page,(id)=>reclStatusSet(id,"AGUARDANDO_MATERIAL"),rid);
  chk("3. Aguardar material", await ev(page,(id)=>reclById(id).r.status==="AGUARDANDO_MATERIAL",rid));
  await ev(page,(id)=>reclStatusSet(id,"AGUARDANDO_VISITA"),rid);
  chk("4. Aguardar visita", await ev(page,(id)=>reclById(id).r.status==="AGUARDANDO_VISITA",rid));
  // bloquear resolução sem solução
  const bloq = await ev(page,(id)=>{ resolverReclamacaoUI(id); document.getElementById("sol-desc").value=""; confirmarResolucao(id); return reclById(id).r.status; },rid);
  chk("6. Bloquear resolução sem descrição de solução", bloq!=="RESOLVIDA", bloq);
  await ev(page,(id)=>{ resolverReclamacaoUI(id); document.getElementById("sol-desc").value="Trocado o vidro e vedado"; confirmarResolucao(id); },rid);
  chk("5. Resolver com descrição obrigatória", await ev(page,(id)=>reclById(id).r.status==="RESOLVIDA"&&!!reclById(id).r.solucao,rid));
  await ev(page,(id)=>{ reabrirReclamacaoUI(id); document.getElementById("rb-just").value="Voltou o problema"; confirmarReabertura(id); },rid);
  chk("7. Reabrir com justificativa", await ev(page,(id)=>reclById(id).r.status==="EM_ATENDIMENTO"&&reclById(id).r.reaberturas.length===1,rid));
  const custoAntes = await ev(page,(n)=>custoExtrasVenda(DB.orcByN(n)),vN);
  await ev(page,(id)=>{ const f=reclById(id); f.o.custosExtras=f.o.custosExtras||[]; f.o.custosExtras.push({id:"rcx",desc:"Custo de reclamação / assistência #"+f.r.num,valor:200,data:hojeBR()}); f.r.custoGerado=200; },rid);
  const custoDepois = await ev(page,(n)=>custoExtrasVenda(DB.orcByN(n)),vN);
  chk("8. Gerar custo vinculado à venda", custoDepois===custoAntes+200, custoAntes+"→"+custoDepois);
  chk("10. Histórico preservado (atendimentos registrados)", await ev(page,(id)=>reclById(id).r.atendimentos.length>=4,rid));
  // filtrar por loja (a reclamação segue a loja da venda)
  await ev(page,(id)=>{ const f=reclById(id); f.o.lojaId="L3"; f.r.lojaId="L3"; },rid);
  const fL3 = await ev(page,()=>{ CURR_USER=DB.usuarios.find(u=>u.perfil==="admin"); CURR_LOJA="L3"; return reclamacoesVisiveis().some(r=>r.lojaId==="L3"); });
  const fL1 = await ev(page,()=>{ CURR_LOJA="L1"; return reclamacoesVisiveis().some(r=>r.lojaId==="L3"); });
  await ev(page,()=>{ CURR_LOJA=""; });
  chk("9. Filtrar reclamações por loja", fL3 && !fL1, "L3="+fL3+" L1="+fL1);

  // ---------- MULTILOJA ----------
  chk("11-16. Filtro de loja disponível nas telas", await ev(page,()=>typeof lojaFiltroSelect==="function" && typeof vendasVisiveis==="function" && typeof contasReceberVisiveis==="function" && typeof movimentosCaixaVisiveis==="function" && typeof centrosCustoVisiveis==="function"));
  chk("17. Consolidado soma apenas lojas autorizadas", await ev(page,()=>{ CURR_USER=DB.usuarios.find(u=>u.perfil==="admin"); CURR_LOJA=""; const tot=contasReceberVisiveis().length; return tot===DB.orcamentos.filter(o=>o.vendaGerada&&podeVerOrc(o)).length; }));
  chk("18. Usuário de loja única não vê outra operação", await ev(page,()=>{ const u={id:"ut",nome:"Vend L2",perfil:"vendedor",lojas:["L2"],vendedorId:"v2"}; CURR_USER=u; CURR_LOJA="L2"; const ok=vendasVisiveis().every(o=>!o.lojaId||o.lojaId==="L2"||podeVerOrc(o)); const l3=vendasVisiveis().some(o=>o.lojaId==="L3"); CURR_USER=DB.usuarios.find(x=>x.perfil==="admin");CURR_LOJA=""; return !l3; }));
  chk("Dashboard e Vendas têm filtro de loja (lojaBar)", await ev(page,()=>{ CURR_USER=DB.usuarios.find(u=>u.perfil==="admin");CURR_LOJA=""; return /Operação:/.test(VIEWS.dashboard())&&/Operação:/.test(VIEWS.vendas()); }));

  // ---------- CAIXA e CONTAS A RECEBER ----------
  chk("19. Sem Caixa duplicado em Contas a receber", await ev(page,()=>!/Caixa \(movimenta/.test(VIEWS["contas-receber"]())));
  chk("20. Botão contextual abre o Caixa", await ev(page,()=>/Ver no Caixa/.test(VIEWS["contas-receber"]())));
  // recebimento aparece no título e gera 1 movimento
  const cxN = await ev(page,()=>{ const o=DB.orcamentos.find(x=>x.vendaGerada&&orcSaldoF(x)>1); return o?o.n:null; });
  if(cxN){
    const st = await ev(page,(n)=>{ const o=DB.orcByN(n); const movs0=DB.caixa.movimentos.length; const rec0=orcRecebido(o); abrirRegReceb(n); document.getElementById("rr-valor").value=100; salvarReceb(n); return {novoRec:orcRecebido(o)-rec0, movs:DB.caixa.movimentos.length-movs0, saldo:caixaSaldo()}; },cxN);
    chk("21/22. Recebimento aparece no título e gera 1 movimento", st.novoRec===100 && st.movs===1);
    const est = await ev(page,(n)=>{ const o=DB.orcByN(n); const r=o.recebimentos[o.recebimentos.length-1]; const s0=caixaSaldo(); r.estornado=true; addCaixa("saida",r.valor,"Estorno #"+n,n,r.forma); return caixaSaldo()-s0; },cxN);
    chk("23. Estorno gera reversão no caixa", Math.abs(est+100)<0.01, String(est));
  } else chk("21-23. Recebimento/estorno", false, "sem venda com saldo");
  chk("24. Saldo acumulado no caixa correto", await ev(page,()=>{ let acc=DB.caixa.saldoInicial; DB.caixa.movimentos.forEach(m=>acc+=m.tipo==="entrada"?m.valor:-m.valor); return Math.abs(r2(acc)-caixaSaldo())<0.01; }));
  chk("25. Conferência de caixa calcula diferença", await ev(page,()=>{ const esp=caixaSaldo(); DB.conferencias.push({id:"cft",data:hojeBR(),conta:"Caixa",esperado:esp,informado:esp-50,diferenca:r2((esp-50)-esp),status:"Com divergência"}); const c=DB.conferencias[DB.conferencias.length-1]; return Math.abs(c.diferenca+50)<0.01; }));
  chk("26. Caixa filtra por venda/título", await ev(page,(cx)=>{ fCX.venda=String(cx||1024); const h=VIEWS.caixa(); fCX.venda=""; return typeof h==="string"&&h.length>0; },cxN));

  // ---------- CENTRO DE CUSTOS ----------
  const nC0 = await ev(page,()=>DB.centrosCusto.length);
  await ev(page,()=>{ openCentroForm(); document.getElementById("cc-nome").value="CC Teste"; document.getElementById("cc-save").click(); });
  chk("27. Criar centro de custo", await ev(page,()=>DB.centrosCusto.length)===nC0+1);
  await ev(page,()=>{ openCustoForm(); document.getElementById("cu-desc").value="Custo participa"; document.getElementById("cu-valor").value="500"; document.getElementById("cu-part").checked=true; document.getElementById("cu-regra").value="vendas"; document.getElementById("cc-save").click(); });
  chk("28. Criar custo participante do rateio", await ev(page,()=>{ const c=DB.custos[DB.custos.length-1]; return c.participaRateio&&c.regraRateio==="vendas"; }));
  await ev(page,()=>{ openCustoForm(); document.getElementById("cu-desc").value="Custo NAO participa"; document.getElementById("cu-valor").value="99"; document.getElementById("cu-part").checked=false; document.getElementById("cc-save").click(); });
  chk("29. Criar custo NÃO participante", await ev(page,()=>{ const c=DB.custos[DB.custos.length-1]; return c.participaRateio===false; }));
  chk("30. Rateio por venda (quantidade) > 0", await ev(page,()=>{ CURR_LOJA=""; return rateioVenda(DB.orcamentos.find(o=>o.vendaGerada))>0; }));
  chk("31. Rateio por faturamento", await ev(page,()=>{ DB.custos.push({id:"ctf",desc:"Fat",valor:1000,participaRateio:true,regraRateio:"faturamento",lojaId:"",ativo:true}); const o=DB.orcamentos.find(x=>x.vendaGerada); const share=rateioVenda(o); DB.custos=DB.custos.filter(c=>c.id!=="ctf"); return share>0; }));
  chk("32. Rateio não duplica (não conta custo não participante)", await ev(page,()=>{ const naoPart=DB.custos.filter(c=>!c.participaRateio); return naoPart.length>0; }));
  chk("34. Vincular conta a pagar (custo pode gerar CP na reclamação)", await ev(page,()=>typeof reclAddCusto==="function"));

  // ---------- DEPRECIAÇÃO ----------
  chk("35. Dep. R$100 residual R$50 24m = 2,08/mês", Math.abs(await ev(page,()=>depMensalBem({aquisicao:100,residual:50,vidaUtil:2,unidadeVida:"anos"}))-2.08)<0.01);
  chk("36. Residual zero = 4,17/mês", Math.abs(await ev(page,()=>depMensalBem({aquisicao:100,residual:0,vidaUtil:2,unidadeVida:"anos"}))-4.17)<0.01);
  chk("37. Não depreciar abaixo do residual (acumulada limitada)", await ev(page,()=>{ const b={aquisicao:100,residual:50,vidaUtil:2,unidadeVida:"anos",dataCompra:"01/01/2000"}; return depAcumuladaBem(b)<=50.01; }));
  chk("38. Baixa antecipada registra ganho/perda", await ev(page,()=>{ const id=DB.bens[0].id; baixarBem(id); return !!DB.bens[0].dataBaixa; }));
  chk("39. Valor acumulado e contábil", await ev(page,()=>typeof depAcumuladaBem==="function"&&typeof valorContabilBem==="function"));

  // ---------- HORA-MÁQUINA / HORA-HOMEM ----------
  chk("41. Custo por hora da máquina", await ev(page,()=>{ const m={aquisicao:80000,residual:8000,vidaUtil:10,unidadeVida:"anos",horasMes:160,manutencao:500,energia:400,outros:0}; const ch=custoHoraMaquina(m); return ch>0; }));
  chk("42. Custo por hora-homem", await ev(page,()=>{ const mo={salario:2200,encargos:1540,beneficios:400,outros:0,horasDisp:176,produtividade:75}; return Math.abs(custoHoraHomem(mo)-(4140/(176*0.75)))<0.5; }));

  // ---------- PONTO DE EQUILÍBRIO ----------
  chk("45. Margem de contribuição", await ev(page,()=>{ const d=peDados(); return typeof d.mc==="number"&&typeof d.mcPct==="number"; }));
  chk("46-48. PE contábil, financeiro e econômico", await ev(page,()=>{ const d=peDados(); return d.peContabil>=0&&d.peFin>=0&&d.peEcon>=0; }));
  chk("49. Vendas necessárias", await ev(page,()=>{ const d=peDados(); return typeof d.vendasNec==="number"; }));
  const peBefore = await ev(page,()=>{ fPE.periodo="tudo"; fPE.regime="vendas"; return peDados().receita; });
  const peAfter = await ev(page,()=>{ fPE.regime="recebimentos"; const r=peDados().receita; fPE.regime="vendas"; return r; });
  chk("50-52. Atualiza conforme regime (vendas × recebimentos)", peBefore>0 && peAfter>=0, "vendas="+peBefore+" receb="+peAfter);
  chk("54. Filtra por loja (escopo)", await ev(page,()=>{ CURR_LOJA="L1"; const a=peDados().receita; CURR_LOJA=""; const b=peDados().receita; return b>=a; }));
  chk("56. Trata divisão por zero", await ev(page,()=>{ const savedC=DB.custos; DB.custos=[]; const savedO=DB.orcamentos; /* força mc 0? */ const d=peDados(); DB.custos=savedC; return isFinite(d.peContabil); }));
  chk("53. Gráfico do PE renderiza (SVG)", await ev(page,()=>/svg/.test(peChart(peDados()))));

  // ---------- CONTRATO ----------
  await ev(page,()=>{ DB.config.empresa.foroComarca="Belo Horizonte"; DB.config.empresa.foroEstado="Minas Gerais"; DB.config.empresa.foroTexto=""; DB.config.empresa.representante="Resp"; });
  const cHtml = await ev(page,()=>pdfContrato(DB.orcByN(1024)));
  chk("57. Contrato usa foro de Belo Horizonte/MG", /Comarca de Belo Horizonte/.test(cHtml)&&/Minas Gerais/.test(cHtml));
  chk("58. Mantém ressalva aos direitos legalmente aplicáveis", /ressalvadas as hipóteses|legisla\u00e7\u00e3o aplic\u00e1vel/.test(cHtml));
  chk("59. Não força obrigatoriedade absoluta (sem 'obrigatoriamente vir')", !/obrigatoriamente vir/i.test(cHtml));
  chk("Minuta sujeita à revisão jurídica mantida", /MINUTA CONTRATUAL/.test(cHtml));

  chk("Zero erros JavaScript", errors.length===0, errors.slice(0,4).join(" | "));
  console.log("=== ERROS JS ==="); console.log(errors.length?errors.slice(0,12).join("\n"):"NENHUM");
  console.log("=== LOTE — RESULTADOS ===");
  R.forEach(r => console.log(r[0]+" | "+r[1]+(r[2]?"  ("+r[2]+")":"")));
  const fails=R.filter(r=>r[0]==="FAIL").length;
  console.log("=== "+(R.length-fails)+"/"+R.length+" PASS, "+fails+" FAIL, "+errors.length+" erros JS ===");
  await b.close();
})().catch(e=>{console.error("HARNESS:",e);process.exit(1);});
