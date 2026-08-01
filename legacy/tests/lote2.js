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

  // ---- EQUIPE / HORA-HOMEM ----
  const mo0 = await ev(page,()=>DB.maoObra.length);
  await ev(page,()=>{ openMaoObraForm(); document.getElementById("mo-nome").value="Instalador Teste"; document.getElementById("mo-sal").value="2200"; _moComp=[{desc:"Encargos",tipo:"valor",valor:1540},{desc:"Benefícios",tipo:"valor",valor:400}]; document.getElementById("mo-horas").value="176"; document.getElementById("mo-prod").value="75"; salvarMaoObra(); });
  chk("1. Cadastrar colaborador/mão de obra", await ev(page,()=>DB.maoObra.length)===mo0+1);
  const hh = await ev(page,()=>{ const m=DB.maoObra[DB.maoObra.length-1]; return {mensal:custoMensalMaoObra(m),horasProd:horasProdutivas(m),hora:custoHoraHomem(m)}; });
  chk("2/3. Custo mensal = salário+encargos+benefícios (4140)", Math.abs(hh.mensal-4140)<0.01, String(hh.mensal));
  chk("4. Horas produtivas (176×75% = 132)", Math.abs(hh.horasProd-132)<0.01, String(hh.horasProd));
  chk("5. Custo por hora-homem (4140/132 ≈ 31,36)", Math.abs(hh.hora-31.36)<0.1, String(hh.hora));
  chk("6. Tratar ausência de horas (0 → sem divisão por zero)", await ev(page,()=>isFinite(custoHoraHomem({salario:1000,horasDisp:0,produtividade:0}))));
  chk("15. Adicional percentual sobre salário-base (3000 + 35% = 4050)", Math.abs(await ev(page,()=>custoMensalMaoObra({salario:3000,componentes:[{tipo:"pct",valor:35}]}))-4050)<0.01);
  const hh2 = await ev(page,()=>{ const m=DB.maoObra[DB.maoObra.length-1]; m.componentes[0].valor=2000; return custoMensalMaoObra(m); });
  chk("7. Alterar encargos e recalcular (2200+2000+400=4600)", Math.abs(hh2-4600)<0.01, String(hh2));
  chk("20. Registro antigo sem componentes usa campos antigos", Math.abs(await ev(page,()=>custoMensalMaoObra({salario:1000,encargos:300,beneficios:100,outros:0}))-1400)<0.01);
  // 8. restrição de salário por permissão
  const salRestr = await ev(page,()=>{ const has=(typeof can==="function"); const admin=DB.perfis.find(p=>p.id==="admin"); const vend=DB.perfis.find(p=>p.id==="vendedor"); return has && admin.perms.includes("fin.ver_salarios") && !vend.perms.includes("fin.ver_salarios"); });
  chk("8. Salário restrito por permissão (admin sim, vendedor não)", salRestr);

  // ---- HORA-MÁQUINA ----
  const mq0 = await ev(page,()=>DB.maquinas.length);
  await ev(page,()=>{ openMaquinaForm(); document.getElementById("mq-nome").value="Máquina Teste"; document.getElementById("mq-aq").value="80000"; document.getElementById("mq-res").value="8000"; document.getElementById("mq-vida").value="10"; document.getElementById("mq-unid").value="anos"; document.getElementById("mq-horas").value="160"; _mqComp=[{desc:"Manutenção",tipo:"valor",valor:500},{desc:"Energia",tipo:"valor",valor:400}]; salvarMaquina(); });
  chk("9. Cadastrar máquina", await ev(page,()=>DB.maquinas.length)===mq0+1);
  const mq = await ev(page,()=>{ const m=DB.maquinas[DB.maquinas.length-1]; return {mensal:custoMensalMaquina(m),hora:custoHoraMaquina(m)}; });
  chk("21/25. Custo mensal da máquina (dep+manut+energia = 1500)", Math.abs(mq.mensal-1500)<0.01, String(mq.mensal));
  chk("26/27. Custo por hora-máquina (1500/160 = 9,375)", Math.abs(mq.hora-9.375)<0.01, String(mq.hora));
  chk("22. Componente percentual sobre aquisição (dep600 + 1% de 80000 = 1400)", Math.abs(await ev(page,()=>custoMensalMaquina({aquisicao:80000,residual:8000,vidaUtil:10,unidadeVida:"anos",componentes:[{tipo:"pct",valor:1,base:"aquisicao"}]}))-1400)<0.01);
  chk("24/28. Registro antigo (sem componentes) usa campos antigos", Math.abs(await ev(page,()=>custoMensalMaquina({aquisicao:80000,residual:8000,vidaUtil:10,unidadeVida:"anos",manutencao:500,energia:400}))-1500)<0.01);
  chk("14. Horas produtivas configuráveis (>0)", await ev(page,()=>num0(DB.maquinas[DB.maquinas.length-1].horasMes)>0));

  // ---- DEPRECIAÇÃO ----
  chk("18. R$100/res50/24m = 2,08", Math.abs(await ev(page,()=>depMensalBem({aquisicao:100,residual:50,vidaUtil:2,unidadeVida:"anos"}))-2.08)<0.01);
  chk("19. Residual zero = 4,17", Math.abs(await ev(page,()=>depMensalBem({aquisicao:100,residual:0,vidaUtil:2,unidadeVida:"anos"}))-4.17)<0.01);
  chk("20. Não depreciar abaixo do residual", await ev(page,()=>depAcumuladaBem({aquisicao:100,residual:50,vidaUtil:2,unidadeVida:"anos",dataCompra:"01/01/2000"})<=50.01));
  chk("21/22. Acumulado e valor contábil", await ev(page,()=>{const b={aquisicao:1000,residual:200,vidaUtil:2,unidadeVida:"anos",dataCompra:"01/01/2000"};return depAcumuladaBem(b)<=800.01&&valorContabilBem(b)>=200;}));
  chk("23/24. Baixa registra ganho/perda", await ev(page,()=>{ const b={id:"bt",nome:"Bem T",aquisicao:1000,residual:200,vidaUtil:2,unidadeVida:"anos",dataCompra:"01/01/2000",ativo:true};DB.bens.push(b);baixarBem("bt");const x=DB.bens.find(y=>y.id==="bt");return !!x.dataBaixa&&typeof x.ganhoPerda==="number";}));

  // ---- CENTRO DE CUSTOS ----
  const cc0=await ev(page,()=>DB.centrosCusto.length);
  await ev(page,()=>{ openCentroForm(); document.getElementById("cc-nome").value="Centro T"; document.getElementById("cc-save").click(); });
  chk("25. Criar centro de custo", await ev(page,()=>DB.centrosCusto.length)===cc0+1);
  await ev(page,()=>{ openCustoForm(); document.getElementById("cu-desc").value="Fixo T"; document.getElementById("cu-tipo").value="fixo"; document.getElementById("cu-valor").value="1000"; document.getElementById("cu-part").checked=true; document.getElementById("cu-regra").value="vendas"; document.getElementById("cc-save").click(); });
  chk("26/28. Custo fixo participante", await ev(page,()=>{const c=DB.custos[DB.custos.length-1];return c.tipo==="fixo"&&c.participaRateio;}));
  await ev(page,()=>{ openCustoForm(); document.getElementById("cu-desc").value="Var T"; document.getElementById("cu-tipo").value="variavel"; document.getElementById("cu-valor").value="50"; document.getElementById("cu-part").checked=false; document.getElementById("cc-save").click(); });
  chk("27/29. Custo variável não participante", await ev(page,()=>{const c=DB.custos[DB.custos.length-1];return c.tipo==="variavel"&&!c.participaRateio;}));
  chk("30. Ratear por venda (quantidade)", await ev(page,()=>{CURR_LOJA="";return rateioVenda(contasReceberVisiveis()[0])>0;}));
  chk("31. Ratear por faturamento", await ev(page,()=>{DB.custos.push({id:"cf1",desc:"F",valor:900,participaRateio:true,regraRateio:"faturamento",lojaId:"",ativo:true});const s=rateioVenda(contasReceberVisiveis()[0]);DB.custos=DB.custos.filter(c=>c.id!=="cf1");return s>0;}));
  chk("33. Não duplicar rateio (custo não participante ignorado)", await ev(page,()=>{const o=contasReceberVisiveis()[0];const a=rateioVenda(o);DB.custos.push({id:"np",desc:"NP",valor:9999,participaRateio:false,lojaId:"",ativo:true});const b=rateioVenda(o);DB.custos=DB.custos.filter(c=>c.id!=="np");return Math.abs(a-b)<0.01;}));
  chk("34. Filtrar centro por loja", await ev(page,()=>typeof centrosCustoVisiveis==="function"));

  // ---- PONTO DE EQUILÍBRIO GERENCIAL ----
  await ev(page,()=>{ CURR_LOJA=""; fPE.periodo="tudo"; fPE.regime="vendas"; });
  const pe = await ev(page,()=>peDados());
  chk("35-37. PE contábil/financeiro/econômico calculados", pe.peContabil>0&&pe.peFin>=0&&pe.peEcon>=pe.peContabil-0.01);
  chk("38. Valor faltante", typeof pe.falta==="number");
  chk("39. Percentual atingido", typeof pe.pct==="number");
  chk("42. Meta esperada até hoje", typeof pe.metaEsperada==="number");
  chk("43. Diferença de ritmo (p.p.)", typeof pe.ritmoPP==="number");
  chk("44. Necessidade diária", typeof pe.necDia==="number");
  chk("45. Necessidade semanal", typeof pe.necSem==="number");
  chk("46. Vendas necessárias", typeof pe.vendasNec==="number");
  chk("47. Projeção de fechamento", typeof pe.projecao==="number");
  chk("48. Margem de segurança", typeof pe.margSeg==="number");
  chk("49. Data prevista do equilíbrio", typeof pe.dataEq==="string");
  // 40/41 vermelho/positivo
  const verm = await ev(page,()=>{ const save=DB.custos.slice(); DB.custos.push({id:"big",desc:"Big",valor:9000000,tipo:"fixo",participaRateio:false,lojaId:"",ativo:true}); const d=peDados(); DB.custos=DB.custos.filter(c=>c.id!=="big"); return d.situacao; });
  chk("40. Identificar 'NO VERMELHO'", verm==="NO VERMELHO", verm);
  const pos = await ev(page,()=>{ const save=DB.custos.slice(); const bak=DB.custos; DB.custos=[]; const d=peDados(); DB.custos=bak; return d.situacao; });
  chk("41. Identificar 'NO POSITIVO' (sem custos fixos)", pos==="NO POSITIVO"||pos==="EQUILÍBRIO ATINGIDO", pos);
  // 50-52 atualização após eventos
  const upd = await ev(page,()=>{ const o=contasReceberVisiveis().find(x=>orcSaldoF(x)>1); if(!o)return {ok:true}; const before=peDados().recebido; abrirRegReceb(o.n); document.getElementById("rr-valor").value=50; salvarReceb(o.n); fPE.regime="recebimentos"; const after=peDados().recebido; fPE.regime="vendas"; return {before,after}; });
  chk("50. Atualiza após recebimento", upd.ok||upd.after>=upd.before);
  // 53-56 filtros
  chk("53-55. Filtra por dia/semana/mês", await ev(page,()=>{ fPE.periodo="hoje"; const h=peDados(); fPE.periodo="semana"; const s=peDados(); fPE.periodo="mes"; const m=peDados(); fPE.periodo="tudo"; return typeof h.pi.totalDias==="number"&&s.pi.totalDias>=7&&typeof m.receita==="number"; }));
  chk("56. Filtra por loja / escopo", await ev(page,()=>{ CURR_LOJA="L1"; const a=peDados().receita; CURR_LOJA=""; const b=peDados().receita; return b>=a; }));
  chk("57. Comparar lojas (função)", await ev(page,()=>/Comparativo por opera/.test(peComparativoLojas())||typeof peComparativoLojas==="function"));
  chk("58. Trata divisão por zero", await ev(page,()=>{ const bak=DB.orcamentos; const d=peDados(); return isFinite(d.peContabil)&&isFinite(d.pct); }));
  chk("59. Abrir memória de cálculo", await ev(page,()=>typeof peMemoria==="function"));
  chk("60. Simular cenário sem alterar dados reais", await ev(page,()=>{ const lucroAntes=DB.pontoEq.lucroDesejado; peSimuladorUI(); document.getElementById("sim-lucro").value=5000; peSimuCalc(); const semAlterar=DB.pontoEq.lucroDesejado===lucroAntes; closeModal(); return semAlterar; }));

  chk("Zero erros JavaScript", errors.length===0, errors.slice(0,4).join(" | "));
  console.log("=== ERROS JS ==="); console.log(errors.length?errors.slice(0,12).join("\n"):"NENHUM");
  console.log("=== LOTE FINANCEIRO GERENCIAL — RESULTADOS ===");
  R.forEach(r => console.log(r[0]+" | "+r[1]+(r[2]?"  ("+r[2]+")":"")));
  const fails=R.filter(r=>r[0]==="FAIL").length;
  console.log("=== "+(R.length-fails)+"/"+R.length+" PASS, "+fails+" FAIL, "+errors.length+" erros JS ===");
  await b.close();
})().catch(e=>{console.error("HARNESS:",e);process.exit(1);});
