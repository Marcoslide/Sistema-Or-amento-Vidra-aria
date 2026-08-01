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
  page.on("dialog", d => d.dismiss().catch(()=>{}));
  const errors = [];
  page.on("pageerror", e => errors.push("PAGEERR: " + e.message));
  page.on("console", m => { if (m.type() === "error") errors.push("CONSOLE: " + m.text()); });
  await page.goto(FILE, { waitUntil: "load" }); await sleep(200);
  await ev(page, () => enter()); await sleep(150);

  // 1-2. PDF Saldo a pagar
  await ev(page, () => { const o=DB.orcByN(1024); o.vendaGerada=true; o.parcelas=o.parcelas||[]; });
  const pdf = await ev(page, () => pdfCliente(DB.orcByN(1024)));
  const saldoOk = await ev(page, () => { const o=DB.orcByN(1024); return orcSaldoF(o); });
  chk("1. PDF usa 'Saldo a pagar (valor restante)' e não 'Saldo' isolado", /Saldo a pagar \(valor restante\)/.test(pdf) && !/>Saldo<\/span>/.test(pdf));
  chk("2. Valor do saldo continua calculável", typeof saldoOk==="number");

  // 3-7. Cartão no Transformar em venda
  await ev(page, () => { const o=DB.orcByN(1025); o.status="ORCAMENTO"; o.vendaGerada=false; o.recebimentos=[]; o.parcelas=[]; delete o.producao; DB.obras=DB.obras.filter(x=>x.n!==1025); });
  const caixaC0 = await ev(page, () => caixaSaldo());
  await ev(page, () => transformarVendaUI(1025)); await sleep(50);
  await ev(page, () => { document.getElementById("tv-forma").value="CARTAO_CREDITO"; tvFormaChange(); });
  await sleep(30);
  const ops = await ev(page, () => [...document.querySelectorAll("#tv-op option")].map(o=>o.textContent));
  chk("3. Cartão mostra somente operadoras cadastradas", JSON.stringify(ops)===JSON.stringify(["Stone","Cielo"]), JSON.stringify(ops));
  const contaAuto = await ev(page, () => document.getElementById("tv-conta").value);
  chk("4. Operadora preenche conta vinculada (Stone → Stone (carteira))", /Stone/.test(contaAuto), contaAuto);
  const parc = await ev(page, () => [...document.querySelectorAll("#tv-cardparc option")].map(o=>Number(o.value)));
  chk("5. Parcelas respeitam o máximo geral (≤6, sem 10x/12x)", Math.max(...parc)<=6 && !parc.includes(12), JSON.stringify(parc));
  chk("6. Parcelas respeitam a tabela da operadora (Stone: 1,2,3,6)", JSON.stringify(parc)===JSON.stringify([1,2,3,6]), JSON.stringify(parc));
  const caixaC1 = await ev(page, () => caixaSaldo());
  chk("7. Orçamento com cartão (modal aberto) não movimentou caixa", Math.abs(caixaC1-caixaC0)<0.001);
  await ev(page, () => closeModal());

  // 8. Recebimento com cartão movimenta uma vez
  const caixaR0 = await ev(page, () => caixaSaldo());
  await ev(page, () => { const o=DB.orcByN(1024); o.vendaGerada=true; o.recebimentos=[]; o.parcelas=[{id:"pp",n:1,venc:hojeBR(),valor:1000,recebido:0,status:"NAO"}]; });
  await ev(page, () => abrirRegReceb(1024)); await sleep(50);
  const rrOpen = await ev(page, () => !!document.getElementById("rr-valor"));
  await ev(page, () => { document.getElementById("rr-valor").value="300"; document.getElementById("rr-forma").value="CARTAO_CREDITO"; });
  await ev(page, () => salvarReceb(1024)); await sleep(40);
  const caixaR1 = await ev(page, () => caixaSaldo());
  chk("8. Recebimento com cartão movimenta o caixa uma vez (+300)", rrOpen && Math.abs((caixaR1-caixaR0)-300)<0.01, "Δ "+(caixaR1-caixaR0));

  // 9-13. usuários e regras
  chk("9. Novo usuário começa pendente", await ev(page, () => DB.usuarios.some(u=>u.status==="PENDENTE_APROVACAO")));
  await ev(page, () => { const u=DB.usuarios.find(x=>x.status==="PENDENTE_APROVACAO"); aprovarUsuario(u.id); });
  chk("10. Usuário pode ser aprovado", await ev(page, () => !DB.usuarios.some(u=>u.status==="PENDENTE_APROVACAO")));
  const d11 = await ev(page, () => { const vend=DB.usuarios.find(u=>u.perfil==="vendedor"); return podeDesconto(9,{user:vend}); });
  chk("11. Desconto acima do limite é bloqueado (vendedor 9%)", d11.ok===false, d11.motivo);
  const d12 = await ev(page, () => { const adm=DB.usuarios.find(u=>u.perfil==="admin"); return podeDesconto(8,{user:adm}); });
  chk("12. Administrador pode aplicar/aprovar desconto (8%)", d12.ok===true, JSON.stringify(d12));
  chk("13. Vendedor não pode configurar regras", await ev(page, () => { const vend=DB.usuarios.find(u=>u.perfil==="vendedor"); return can("adm.config",vend)===false; }));

  // 14-15. visita técnica
  await ev(page, () => { curOrc=1024; });
  await ev(page, () => visitaUI(1024)); await sleep(40);
  const vHtml = await ev(page, () => document.querySelector(".dlg").innerHTML);
  chk("14. Visita mostra nome e telefone do cliente", /Cliente/.test(vHtml) && /Telefone do cliente/.test(vHtml) && /Nº da venda/.test(vHtml));
  chk("15. Campos 'Necessária?' e 'Contato no local' foram removidos", !/Necessária\?/.test(vHtml) && !/Contato no local/.test(vHtml) && /Complemento/.test(vHtml) && /Referência/.test(vHtml));
  await ev(page, () => { document.getElementById("vt-data").value="2026-08-12"; });
  await ev(page, () => salvarVisita(1024)); await sleep(30);
  const tel14 = await ev(page, () => DB.orcByN(1024).visita.tel);
  chk("14b. Visita salva capta telefone do cliente", tel14!==undefined);

  // 16-19. agenda detalhada
  const bf16=errors.length; await ev(page, () => abrirVisitaAgenda(1024)); await sleep(40);
  chk("16. Evento abre detalhe na Agenda (não redireciona p/ Vendas)", await ev(page, () => cur)==="agenda-visita" && errors.length===bf16);
  // editar não duplica
  await ev(page, () => visitaUI(1024)); await sleep(30);
  await ev(page, () => { document.getElementById("vt-data").value="2026-08-20"; });
  await ev(page, () => salvarVisita(1024)); await sleep(30);
  const evs = await ev(page, () => (DB.eventos||[]).filter(e=>e.tipo==="VISITA"&&e.n===1024));
  chk("17. Editar evento não duplica (1 evento, data atualizada)", evs.length===1 && evs[0].data==="20/08/2026", JSON.stringify(evs.map(e=>e.data)));
  await ev(page, () => setVisitaStatus(1024,"VISITA_REALIZADA"));
  chk("18. Status da visita é atualizado", await ev(page, () => DB.orcByN(1024).visita.status)==="VISITA_REALIZADA");
  // orçamento fechado -> transformação (usar registro orçamento)
  await ev(page, () => { const o=DB.orcByN(1025); o.status="ORCAMENTO"; o.vendaGerada=false; o.visita={data:"01/08/2026",hora:"09:00",prof:"Ana",status:"AGENDADA"}; upsertVisitaEvento(o); curVisitaN=1025; });
  await ev(page, () => orcamentoFechado(1025)); await sleep(50);
  chk("19. 'Orçamento fechado' chama Transformar em venda", await ev(page, () => !!document.getElementById("tv-forma")));
  await ev(page, () => closeModal());

  // 20-24. industrialização
  await ev(page, () => { const o=DB.orcByN(1025); o.status="ORCAMENTO"; o.vendaGerada=false; delete o.producao; DB.obras=DB.obras.filter(x=>x.n!==1025); transformarVendaUI(1025); });
  await sleep(40); await ev(page, () => { document.getElementById("tv-forma").value="SEM_ENTRADA"; tvFormaChange(); transformarVenda(1025); }); await sleep(40);
  await ev(page, () => iniciarProducao(1025)); await sleep(40);
  const procN0 = await ev(page, () => document.querySelectorAll(".pm-proc").length);
  await ev(page, () => { const cbs=[...document.querySelectorAll(".pm-proc")]; cbs.forEach(cb=>{ if(["Corte","Têmpera","Conferência"].includes(cb.value)) cb.checked=true; }); confirmarIniciarProducao(1025); });
  await sleep(40);
  const et20 = await ev(page, () => Object.keys(DB.orcByN(1025).producao.etapas));
  chk("20. Produção permite montar/adicionar processos", procN0===14 && et20.includes("Corte") && et20.includes("Conferência"), JSON.stringify(et20));
  // adicionar via prodAddProcUI (pick)
  await ev(page, () => prodAddProcUI(1025)); await sleep(30);
  await ev(page, () => { if(typeof PICK==="object"&&PICK.onPick) PICK.onPick("Furação"); }); await sleep(30);
  chk("20b. prodAddProcUI adiciona processo", await ev(page, () => "Furação" in DB.orcByN(1025).producao.etapas));
  // remover processo pendente (confirmDlg -> __ok)
  await ev(page, () => { DB.orcByN(1025).producao.etapas["Corte"]="O"; prodRemoveProc(1025,"Corte"); });
  await ev(page, () => { if(window.__ok) window.__ok(); }); await sleep(20);
  chk("21. Produção permite remover processo pendente", await ev(page, () => !("Corte" in DB.orcByN(1025).producao.etapas)));
  // processo concluído exige confirmação (prompt dismiss -> não remove)
  await ev(page, () => { DB.orcByN(1025).producao.etapas["Têmpera"]="C"; prodRemoveProc(1025,"Têmpera"); }); await sleep(20);
  chk("22. Processo concluído exige justificativa (prompt cancelado não remove)", await ev(page, () => "Têmpera" in DB.orcByN(1025).producao.etapas));
  // processo manual na ordem de produção
  await ev(page, () => { DB.orcByN(1025).producao.etapas["Processo Especial X"]="O"; });
  const ordem = await ev(page, () => pdfProducao(DB.orcByN(1025)));
  chk("23. Processo manual aparece na ordem de produção", /Processo Especial X/.test(ordem));
  // pendente bloqueia conclusão
  await ev(page, () => { const p=DB.orcByN(1025).producao; Object.keys(p.etapas).forEach(k=>p.etapas[k]="C"); p.etapas["Furação"]="O"; concluirProducao(1025); });
  chk("24. Produção pendente bloqueia conclusão", await ev(page, () => DB.orcByN(1025).producao.concluida===false));

  // 25-29. recorrências (vencimentos corretos)
  const base="15/01/2026";
  const rDia = await ev(page, base => [0,1,2].map(i=>cpVencimentoSerie(base,"Diária",i)), base);
  chk("25. Recorrência diária", JSON.stringify(rDia)===JSON.stringify(["15/01/2026","16/01/2026","17/01/2026"]), JSON.stringify(rDia));
  const rSem = await ev(page, base => [0,1,2].map(i=>cpVencimentoSerie(base,"Semanal",i)), base);
  chk("26. Recorrência semanal", JSON.stringify(rSem)===JSON.stringify(["15/01/2026","22/01/2026","29/01/2026"]), JSON.stringify(rSem));
  const rQui = await ev(page, base => [0,1,2].map(i=>cpVencimentoSerie(base,"Quinzenal",i)), base);
  chk("27. Recorrência quinzenal", JSON.stringify(rQui)===JSON.stringify(["15/01/2026","30/01/2026","14/02/2026"]), JSON.stringify(rQui));
  const rMes = await ev(page, base => [0,1,2].map(i=>cpVencimentoSerie(base,"Mensal",i)), base);
  chk("28. Recorrência mensal", JSON.stringify(rMes)===JSON.stringify(["15/01/2026","15/02/2026","15/03/2026"]), JSON.stringify(rMes));
  const rAno = await ev(page, base => [0,1,2].map(i=>cpVencimentoSerie(base,"Anual",i)), base);
  chk("29. Recorrência anual", JSON.stringify(rAno)===JSON.stringify(["15/01/2026","15/01/2027","15/01/2028"]), JSON.stringify(rAno));

  // 30-32. série: baixa isolada, edição escopo, exclusão preserva pagos
  const serie = await ev(page, () => { const rid="rectest"; DB.contasPagar=DB.contasPagar.filter(c=>c.recorrenciaId!==rid);
    for(let i=0;i<4;i++)DB.contasPagar.push({id:"ct"+i,lojaId:"L1",fornecedor:"Serie Teste",valor:200,vencimento:cpVencimentoSerie("10/02/2026","Mensal",i),emissao:"01/02/2026",competencia:"02/2026",historico:"",forma:"PIX",contaFin:"Banco Inter",categoria:"Sem categoria",juros:0,multa:0,ocorrencia:"Mensal",pagamentos:[],cancelada:false,anexos:[],recorrenciaId:rid,recIndex:i+1,recTotal:4});
    return DB.contasPagar.filter(c=>c.recorrenciaId==="rectest").length; });
  chk("30a. Série criada com 4 títulos independentes", serie===4);
  // baixa de uma
  await ev(page, () => { const c=DB.contasPagar.find(x=>x.id==="ct0"); c.pagamentos.push({id:"pg",data:hojeBR(),valor:200,forma:"PIX",estornado:false}); });
  const sit30 = await ev(page, () => DB.contasPagar.filter(c=>c.recorrenciaId==="rectest").map(c=>cpSituacao(c)));
  chk("30. Baixar uma ocorrência não baixa as demais", sit30.filter(s=>s==="PAGA").length===1, JSON.stringify(sit30));
  // editar esta e próximas (a partir do índice 2) não altera anteriores
  await ev(page, () => cpEditarSerieValor("ct1","proximas",500));
  const vals = await ev(page, () => DB.contasPagar.filter(c=>c.recorrenciaId==="rectest").sort((a,b)=>a.recIndex-b.recIndex).map(c=>c.valor));
  chk("31. Edição 'esta e próximas' não altera anteriores", vals[0]===200 && vals[1]===500 && vals[2]===500 && vals[3]===500, JSON.stringify(vals));
  // exclusão da série preserva pagos
  const rem = await ev(page, () => cpExcluirSerie("ct0","todas"));
  const rest = await ev(page, () => DB.contasPagar.filter(c=>c.recorrenciaId==="rectest").length);
  chk("32. Exclusão da série preserva títulos pagos", rest===1, "restantes="+rest+" removidos="+rem);

  // regressões rápidas
  const bf=errors.length; for (const v of ["vendas","obras","agenda","contas-pagar","contas-receber","caixa","configuracoes"]) { await ev(page, x=>go(x), v); await sleep(20); }
  chk("Regressão: views principais renderizam", errors.length===bf);

  chk("33. Zero erros JavaScript", errors.length===0, errors.slice(0,3).join(" | "));
  console.log("=== ERROS JS ==="); console.log(errors.length ? errors.slice(0,15).join("\n") : "NENHUM");
  console.log("=== RESULTADOS ===");
  R.forEach(r => console.log(r[0] + " | " + r[1] + (r[2] ? "  (" + r[2] + ")" : "")));
  const fails = R.filter(r => r[0]==="FAIL").length;
  console.log("=== " + (R.length-fails) + "/" + R.length + " PASS, " + fails + " FAIL, " + errors.length + " erros JS ===");
  await b.close();
})().catch(e => { console.error("HARNESS:", e); process.exit(1); });
