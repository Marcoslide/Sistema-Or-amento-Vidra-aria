const { chromium } = require("playwright-core");
const EXE = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const OUT = "/tmp/claude-0/-home-user-Sistema-Or-amento-Vidra-aria/58a882f8-11eb-59b3-a4d7-34447a0c185b/scratchpad";
const FILE = "file://" + OUT + "/vidrogestor-lote-final.html";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const R = []; const chk = (n, c, d) => R.push([c ? "PASS" : "FAIL", n, d || ""]);
(async () => {
  const b = await chromium.launch({ executablePath: EXE });
  const page = await b.newContext({ viewport: { width: 1440, height: 950 }, deviceScaleFactor: 1 }).then(c => c.newPage());
  const errors = [];
  page.on("pageerror", e => errors.push("PAGEERR: " + e.message));
  page.on("console", m => { if (m.type() === "error") errors.push("CONSOLE: " + m.text()); });
  await page.goto(FILE, { waitUntil: "load" }); await sleep(150);
  await page.evaluate(() => enter()); await sleep(120);

  // ---------- varredura de views ----------
  for (const v of ["dashboard","orcamentos","vendas","clientes","produtos","fornecedores","familias","obras","agenda","producao","recebimentos","caixa","usuarios","configuracoes"]) {
    const bf = errors.length; await page.evaluate(x => go(x), v); await sleep(40); chk("view " + v, errors.length === bf);
  }

  // ---------- helper: montar produção controlada em 1025 ----------
  const setupProd = () => page.evaluate(() => {
    const o = DB.orcByN(1025);
    o.status = "APROVADO"; o.vendaGerada = true;
    o.producao = { iniciada: "20/07/2026", concluida: false, etapas: { "Corte de vidro":"C", "Têmpera":"A", "Furação":"O", "Lapidação":"NA" }, terceirizacoes: [], resp: "Teste" };
    // remove qualquer obra que possa ter sido criada em rodadas anteriores
    DB.obras = DB.obras.filter(x => x.n !== 1025);
  });

  // ===== BLOQUEIO 1: etapa pendente + em andamento =====
  await setupProd();
  await page.evaluate(() => concluirProducao(1025)); await sleep(60);
  let s = await page.evaluate(() => ({ conc: DB.orcByN(1025).producao.concluida, obra: DB.obras.some(x => x.n === 1025), pode: podeConcluirProducao(DB.orcByN(1025)).ok }));
  chk("BLOQUEIO etapa pendente/andamento: NÃO conclui", s.conc === false && s.pode === false, JSON.stringify(s));
  chk("BLOQUEIO etapa pendente: NÃO cria obra", s.obra === false);

  // ===== BLOQUEIO 3: terceirização em fabricação (etapas ok) =====
  await page.evaluate(() => { const o = DB.orcByN(1025); o.producao.etapas = { "Corte de vidro":"C", "Lapidação":"NA" }; o.producao.terceirizacoes = [{ id:"t1", desc:"Vidro temperado", fornecedor:"Blindex", status:"FABRICACAO" }]; o.producao.concluida = false; });
  await page.evaluate(() => concluirProducao(1025)); await sleep(50);
  s = await page.evaluate(() => ({ conc: DB.orcByN(1025).producao.concluida, pode: podeConcluirProducao(DB.orcByN(1025)).ok }));
  chk("BLOQUEIO terceirização em fabricação: NÃO conclui", s.conc === false && s.pode === false, JSON.stringify(s));

  // ===== BLOQUEIO 4: terceirização com material PRONTO =====
  await page.evaluate(() => { DB.orcByN(1025).producao.terceirizacoes[0].status = "PRONTO"; });
  await page.evaluate(() => concluirProducao(1025)); await sleep(50);
  s = await page.evaluate(() => ({ conc: DB.orcByN(1025).producao.concluida, pode: podeConcluirProducao(DB.orcByN(1025)).ok }));
  chk("BLOQUEIO terceirização PRONTO (não recebida): NÃO conclui", s.conc === false && s.pode === false, JSON.stringify(s));

  // ===== BLOQUEIO extra: aguardando envio / enviado =====
  await page.evaluate(() => { DB.orcByN(1025).producao.terceirizacoes[0].status = "AG_ENVIO"; });
  const podeAg = await page.evaluate(() => podeConcluirProducao(DB.orcByN(1025)).ok);
  chk("BLOQUEIO terceirização AG_ENVIO: pode=false", podeAg === false);
  await page.evaluate(() => { DB.orcByN(1025).producao.terceirizacoes[0].status = "ENVIADO"; });
  const podeEnv = await page.evaluate(() => podeConcluirProducao(DB.orcByN(1025)).ok);
  chk("BLOQUEIO terceirização ENVIADO: pode=false", podeEnv === false);

  // ===== PERMITIDO 5: etapas concluídas, terceirização RECEBIDA =====
  await page.evaluate(() => { const o = DB.orcByN(1025); o.producao.terceirizacoes[0].status = "RECEBIDO"; });
  let pode5 = await page.evaluate(() => podeConcluirProducao(DB.orcByN(1025)).ok);
  chk("PERMITIDO etapas C/NA + terceirização RECEBIDO: pode=true", pode5 === true);

  // ===== PERMITIDO 6: etapas concluídas, terceirização CONFERIDA =====
  await page.evaluate(() => { DB.orcByN(1025).producao.terceirizacoes[0].status = "CONFERIDO"; });
  let pode6 = await page.evaluate(() => podeConcluirProducao(DB.orcByN(1025)).ok);
  chk("PERMITIDO etapas C/NA + terceirização CONFERIDO: pode=true", pode6 === true);

  // ===== PERMITIDO 7: etapas C ou NA, sem terceirização =====
  await page.evaluate(() => { const o = DB.orcByN(1025); o.producao.terceirizacoes = []; o.producao.etapas = { "Corte de vidro":"C", "Têmpera":"C", "Furação":"NA" }; });
  let pode7 = await page.evaluate(() => podeConcluirProducao(DB.orcByN(1025)).ok);
  chk("PERMITIDO etapas C/NA, sem terceirização: pode=true", pode7 === true);
  // agora concluir de fato
  await page.evaluate(() => concluirProducao(1025)); await sleep(50);
  let concOk = await page.evaluate(() => DB.orcByN(1025).producao.concluida);
  chk("Concluir quando permitido: concluida=true", concOk === true);

  // ===== 8: idempotência de concluir (chamar 2x) =====
  const hist1 = await page.evaluate(() => (DB.orcByN(1025).hist || []).filter(h => h.acao === "Produção concluída").length);
  await page.evaluate(() => concluirProducao(1025)); await sleep(30);
  const hist2 = await page.evaluate(() => (DB.orcByN(1025).hist || []).filter(h => h.acao === "Produção concluída").length);
  chk("Concluir 2x é idempotente (não duplica histórico)", hist1 === 1 && hist2 === 1, "h1 " + hist1 + " h2 " + hist2);

  // ===== 9: liberar execução após conclusão BLOQUEADA (novo pedido) =====
  await page.evaluate(() => { const o = DB.orcByN(1024); o.status = "APROVADO"; o.vendaGerada = true; o.producao = { iniciada:"20/07/2026", concluida:false, etapas:{"Corte de vidro":"O"}, terceirizacoes:[], resp:"T" }; DB.obras = DB.obras.filter(x => x.n !== 1024); });
  await page.evaluate(() => concluirProducao(1024)); await sleep(40);
  const bloq = await page.evaluate(() => ({ conc: DB.orcByN(1024).producao.concluida, obra: DB.obras.some(x => x.n === 1024) }));
  chk("Conclusão bloqueada NÃO habilita liberar (concluida=false, sem obra)", bloq.conc === false && bloq.obra === false, JSON.stringify(bloq));

  // ===== 10: concluir corretamente e liberar -> 1 única obra EXECUTANDO =====
  await page.evaluate(() => { const o = DB.orcByN(1024).producao; o.etapas = { "Corte de vidro":"C" }; });
  await page.evaluate(() => concluirProducao(1024)); await sleep(40);
  await page.evaluate(() => liberarExecucao(1024, true));
  await page.evaluate(() => liberarExecucao(1024, true)); // segunda chamada: idempotência
  const fim = await page.evaluate(() => ({ obras: DB.obras.filter(x => x.n === 1024).length, status: DB.orcByN(1024).status }));
  chk("Concluir + liberar: 1 única obra, status EXECUTANDO", fim.obras === 1 && fim.status === "EXECUTANDO", JSON.stringify(fim));

  // ===== REGRESSÕES: progresso, N/A, andamento, clamp =====
  const prg = await page.evaluate(() => { const o = { producao: { etapas: { a:"C", b:"O", c:"NA" }, terceirizacoes: [] } }; return prodProgress(o); });
  chk("Progresso: N/A excluído, andamento/pendente não conta (1/2=50%)", prg.pct === 50 && prg.total === 2 && prg.done === 1, JSON.stringify(prg));
  const prg0 = await page.evaluate(() => prodProgress({ producao: { etapas: { a:"O", b:"A" }, terceirizacoes: [] } }));
  chk("Progresso: 0 concluídas = 0%", prg0.pct === 0);
  const prg100 = await page.evaluate(() => prodProgress({ producao: { etapas: { a:"C", b:"C", c:"NA" }, terceirizacoes: [] } }));
  chk("Progresso: todas C (+ N/A) = 100%", prg100.pct === 100 && prg100.total === 2);
  const prgAllNA = await page.evaluate(() => prodProgress({ producao: { etapas: { a:"NA" }, terceirizacoes: [] } }));
  chk("Progresso: nenhuma aplicável não gera erro (0%/total 0)", prgAllNA.pct === 0 && prgAllNA.total === 0);

  // ===== REGRESSÃO A1: over-recebimento bloqueado =====
  const saldo = await page.evaluate(() => orcSaldoF(DB.orcByN(1027)) || orcSaldoF(DB.orcByN(1026)));
  const alvoRec = await page.evaluate(() => { const cand=[1027,1026,1025].find(n=>orcSaldoF(DB.orcByN(n))>0); return cand; });
  if (alvoRec) {
    const saldoAntes = await page.evaluate(n => orcSaldoF(DB.orcByN(n)), alvoRec);
    await page.evaluate(n => abrirRegReceb(n), alvoRec); await sleep(60);
    const modalOk = await page.evaluate(() => !!document.getElementById("rr-valor"));
    if (modalOk) {
      await page.evaluate(v => { document.getElementById("rr-valor").value = String(v + 99999); }, saldoAntes);
      await page.evaluate(n => salvarReceb(n), alvoRec); await sleep(40);
      const a = await page.evaluate(n => ({ saldo: orcSaldoF(DB.orcByN(n)), err: (document.getElementById("rr-err") || {}).textContent || "" }), alvoRec);
      chk("A1: over-recebimento BLOQUEADO (saldo não fica negativo)", a.saldo >= -0.01, "saldo " + a.saldo + " | msg: " + a.err);
      await page.evaluate(() => closeModal());
    } else chk("A1: modal recebimento abriu", false);
  } else chk("A1: pedido com saldo disponível", false, "nenhum pedido com saldo");

  // ===== REGRESSÃO M1: gerarVenda idempotente =====
  await page.evaluate(() => { const o = DB.orcByN(1029); o.status = "APROVADO"; o.vendaGerada = false; o.parcelas = []; });
  await page.evaluate(() => gerarVenda(1029)); const m1 = await page.evaluate(() => DB.orcByN(1029).parcelas.length);
  await page.evaluate(() => gerarVenda(1029)); const m2 = await page.evaluate(() => DB.orcByN(1029).parcelas.length);
  chk("M1: gerarVenda idempotente (não recria parcelas)", m1 === m2, "m1 " + m1 + " m2 " + m2);

  // ===== iniciar produção idempotente =====
  await page.evaluate(() => { const o = DB.orcByN(1028); o.status = "APROVADO"; o.vendaGerada = true; delete o.producao; });
  await page.evaluate(() => { iniciarProducao(1028); confirmarIniciarProducao(1028); });
  const ip1 = await page.evaluate(() => JSON.stringify(DB.orcByN(1028).producao.etapas));
  await page.evaluate(() => iniciarProducao(1028));
  const ip2 = await page.evaluate(() => JSON.stringify(DB.orcByN(1028).producao.etapas));
  const st1028 = await page.evaluate(() => DB.orcByN(1028).status);
  chk("Iniciar produção idempotente + status EM_PRODUCAO", ip1 === ip2 && st1028 === "EM_PRODUCAO", st1028);

  // ===== orçamento/venda/produção NÃO mexem no caixa =====
  const caixaAntes = await page.evaluate(() => caixaSaldo());
  await page.evaluate(() => { const o = DB.orcByN(1027); o.status = "APROVADO"; o.vendaGerada = false; gerarVenda(1027); iniciarProducao(1027); confirmarIniciarProducao(1027); });
  const caixaDepois = await page.evaluate(() => caixaSaldo());
  chk("Gerar venda + iniciar produção NÃO movimentam caixa", Math.abs(caixaAntes - caixaDepois) < 0.001, "antes " + caixaAntes + " depois " + caixaDepois);

  console.log("=== ERROS JS ==="); console.log(errors.length ? errors.slice(0, 20).join("\n") : "NENHUM");
  console.log("=== RESULTADOS ===");
  R.forEach(r => console.log(r[0] + " | " + r[1] + (r[2] ? "  (" + r[2] + ")" : "")));
  const fails = R.filter(r => r[0] === "FAIL").length;
  console.log("=== " + (R.length - fails) + "/" + R.length + " PASS, " + fails + " FAIL, " + errors.length + " erros JS ===");
  await b.close();
})().catch(e => { console.error("HARNESS:", e); process.exit(1); });
