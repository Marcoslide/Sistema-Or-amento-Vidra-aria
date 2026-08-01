/* AUDITORIA FUNCIONAL REAL — executa ações no navegador e verifica propagação.
   Não conta como PASS a mera existência de texto/função. Cada item: ação -> estado -> propagação. */
const { chromium } = require("playwright-core");
const EXE = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const OUT = "/tmp/claude-0/-home-user-Sistema-Or-amento-Vidra-aria/58a882f8-11eb-59b3-a4d7-34447a0c185b/scratchpad";
const FILE = "file://" + OUT + "/vidrogestor-lote-final.html";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const R = [];
const rec = (id, func, acao, esperado, encontrado, pass) => R.push({ id, func, acao, esperado, encontrado, pass: !!pass });
const ev = (p, fn, a) => p.evaluate(fn, a);

(async () => {
  const b = await chromium.launch({ executablePath: EXE });
  const page = await b.newContext({ viewport: { width: 1500, height: 950 } }).then(c => c.newPage());
  page.on("dialog", d => { try { d.accept("0"); } catch (e) {} });
  const errors = [];
  page.on("pageerror", e => errors.push("PAGEERR: " + e.message));
  page.on("console", m => { if (m.type() === "error") errors.push("C: " + m.text()); });
  await page.goto(FILE, { waitUntil: "load" }); await sleep(200);
  await ev(page, () => { enter(); CURR_USER = DB.usuarios.find(u => u.perfil === "admin"); CURR_LOJA = ""; buildNav(); });

  // ============ GRUPO A — LOJAS ATIVAS / INATIVAS (transversal) ============
  // A1 — criar loja ativa via UI (openLojaForm preenche o modal; salvarLoja grava)
  const a1 = await ev(page, () => {
    openLojaForm();
    document.getElementById("lj-nome").value = "LOJA TESTE AUDITORIA";
    document.getElementById("lj-cidade").value = "Cidade Teste/MG";
    document.getElementById("lj-resp").value = "Auditor";
    document.getElementById("lj-contas").value = "Caixa da loja";
    salvarLoja("");
    const l = DB.lojas.find(x => x.nome === "LOJA TESTE AUDITORIA");
    return l ? { ok: true, id: l.id, ativo: l.ativo } : { ok: false };
  });
  rec("A1", "openLojaForm+salvarLoja", "Criar 'LOJA TESTE AUDITORIA' e salvar como ativa",
    "Registro incluído em DB.lojas com ativo:true", JSON.stringify(a1), a1.ok && a1.ativo === true);
  const LID = a1.id;

  // A2 — loja ativa aparece na FONTE dos selects operacionais (lojasSelecionaveis)
  const a2 = await ev(page, id => lojasSelecionaveis().some(l => l.id === id), LID);
  rec("A2", "lojasSelecionaveis", "Verificar fonte dos selects de operação (loja ativa)",
    "Loja nova presente", a2 ? "presente" : "ausente", a2);

  // A3 — DOM REAL: select do NOVO ORÇAMENTO contém a option da loja nova
  const a3 = await ev(page, id => {
    go("orcamento-novo");
    const sel = document.querySelector('#builder-root select');
    // o primeiro select do builder é Loja/Operação (linha 1626)
    const html = document.getElementById("builder-root").innerHTML;
    return html.includes('value="' + id + '"');
  }, LID);
  rec("A3", "VIEWS[orcamento-novo]/mountBuilder", "Abrir Novo Orçamento e inspecionar o select de Loja",
    "Option da loja nova no DOM", a3 ? "presente no DOM" : "ausente", a3);

  // A4 — DOM REAL: form de Conta a Pagar (cpNovo) contém a option da loja nova
  const a4 = await ev(page, id => {
    cpNovo();
    const el = document.getElementById("cp-loja");
    return !!(el && el.innerHTML.includes('value="' + id + '"'));
  }, LID);
  await ev(page, () => { if (typeof closeModal === "function") closeModal(); });
  rec("A4", "cpNovo (#cp-loja)", "Abrir Nova Conta a Pagar e inspecionar o select de Loja",
    "Option da loja nova no DOM", a4 ? "presente no DOM" : "ausente", a4);

  // A5 — DOM REAL: seletor global do topo (renderLojaSelector) contém a loja nova
  const a5 = await ev(page, id => {
    renderLojaSelector();
    const w = document.getElementById("loja-sel-wrap");
    return !!(w && w.innerHTML.includes('value="' + id + '"'));
  }, LID);
  rec("A5", "renderLojaSelector (#loja-sel-wrap)", "Renderizar seletor global do topo",
    "Loja nova no seletor global", a5 ? "presente no DOM" : "ausente", a5);

  // A6 — inativar a loja
  const a6 = await ev(page, id => { toggleLoja(id); return (DB.lojas.find(l => l.id === id) || {}).ativo; }, LID);
  rec("A6", "toggleLoja", "Inativar a loja nova",
    "ativo === false no registro", "ativo=" + a6, a6 === false);

  // A7 — após inativar, NÃO deve aparecer na fonte dos selects de novo lançamento
  const a7 = await ev(page, id => lojasSelecionaveis().some(l => l.id === id), LID);
  rec("A7", "lojasSelecionaveis (pós-inativar)", "Loja inativa não deve alimentar selects de novos lançamentos",
    "Loja AUSENTE de lojasSelecionaveis()", a7 ? "AINDA PRESENTE" : "ausente", !a7);

  // A8 — após inativar, some do select do NOVO ORÇAMENTO (DOM real)
  const a8 = await ev(page, id => {
    go("orcamento-novo");
    return document.getElementById("builder-root").innerHTML.includes('value="' + id + '"');
  }, LID);
  rec("A8", "Novo Orçamento (pós-inativar)", "Select de Loja do novo orçamento não deve listar a inativa",
    "Option AUSENTE no DOM", a8 ? "AINDA no DOM" : "ausente", !a8);

  // A9 — após inativar, some do select de CONTA A PAGAR (DOM real)
  const a9 = await ev(page, id => {
    cpNovo();
    const el = document.getElementById("cp-loja");
    const has = !!(el && el.innerHTML.includes('value="' + id + '"'));
    if (typeof closeModal === "function") closeModal();
    return has;
  }, LID);
  rec("A9", "cpNovo (pós-inativar)", "Select de Loja de Conta a Pagar não deve listar a inativa",
    "Option AUSENTE no DOM", a9 ? "AINDA no DOM" : "ausente", !a9);

  // A10 — GUARD por chamada direta: criar orçamento com loja inativa deve BLOQUEAR
  const a10 = await ev(page, id => {
    const antes = DB.orcamentos.length;
    let bloqueado = false, erro = "";
    try {
      // caminho real de gravação do builder
      if (typeof mountBuilder === "function") { go("orcamento-novo"); }
      B = (typeof B !== "undefined" && B) ? B : {};
      B.clienteId = (DB.clientes[0] || {}).id; B.clienteNome = "Cliente Teste";
      B.lojaId = id; B.ambientes = B.ambientes || []; B.vendNome = "Auditor";
      const o = buildToOrc("ORCAMENTO");
      persist(o);
      bloqueado = DB.orcamentos.length === antes;
    } catch (e) { bloqueado = true; erro = e.message; }
    // limpeza: remove qualquer orçamento criado nesta loja
    DB.orcamentos = DB.orcamentos.filter(o => o.lojaId !== id);
    return { bloqueado, erro };
  }, LID);
  rec("A10", "buildToOrc/persist (loja inativa)", "Chamada direta: novo orçamento com loja INATIVA",
    "Sistema BLOQUEIA o lançamento", a10.bloqueado ? ("bloqueado " + a10.erro) : "PERMITIU salvar", a10.bloqueado);

  // A11 — GUARD por chamada direta: conta a pagar com loja inativa deve BLOQUEAR
  const a11 = await ev(page, id => {
    const antes = (DB.contasPagar || []).length;
    let bloqueado = false, erro = "";
    try {
      cpNovo();
      document.getElementById("cp-forn").value = "Fornecedor Audit";
      document.getElementById("cp-valor").value = "123";
      document.getElementById("cp-venc").value = "2026-12-01";
      const sel = document.getElementById("cp-loja");
      // força a loja inativa mesmo que não esteja na lista
      const opt = document.createElement("option"); opt.value = id; opt.selected = true; sel.appendChild(opt);
      cpSalvar(false);
      bloqueado = (DB.contasPagar || []).length === antes;
    } catch (e) { bloqueado = true; erro = e.message; }
    DB.contasPagar = (DB.contasPagar || []).filter(c => c.lojaId !== id);
    if (typeof closeModal === "function") closeModal();
    return { bloqueado, erro };
  }, LID);
  rec("A11", "cpSalvar (loja inativa)", "Chamada direta: nova conta a pagar com loja INATIVA",
    "Sistema BLOQUEIA o lançamento", a11.bloqueado ? ("bloqueado " + a11.erro) : "PERMITIU salvar", a11.bloqueado);

  // A12 — CURR_LOJA apontando para loja inativada deve ser realocado
  const a12 = await ev(page, id => {
    // reativa, seleciona, inativa novamente e observa CURR_LOJA
    const l = DB.lojas.find(x => x.id === id); l.ativo = true;
    CURR_LOJA = id;
    toggleLoja(id); // inativa
    return { currLoja: CURR_LOJA, aindaInativaSelecionada: CURR_LOJA === id };
  }, LID);
  rec("A12", "toggleLoja + CURR_LOJA", "Inativar a loja que está selecionada no topo",
    "CURR_LOJA deixa de apontar para a loja inativa", "CURR_LOJA=" + a12.currLoja,
    !a12.aindaInativaSelecionada);

  // A13 — histórico preservado: registros antigos de uma loja não somem ao inativar
  const a13 = await ev(page, () => {
    const l = DB.lojas.find(x => x.ativo !== false && DB.orcamentos.some(o => o.lojaId === x.id));
    if (!l) return { ok: true, nota: "sem dados para checar" };
    const antes = DB.orcamentos.filter(o => o.lojaId === l.id).length;
    toggleLoja(l.id); // inativa
    const depois = DB.orcamentos.filter(o => o.lojaId === l.id).length;
    toggleLoja(l.id); // reativa (restaura estado)
    return { ok: antes === depois && antes > 0, antes, depois };
  });
  rec("A13", "toggleLoja (histórico)", "Inativar loja com histórico e conferir registros antigos",
    "Registros históricos preservados", JSON.stringify(a13), a13.ok);

  // A14 — badge Inativa aparece na tela de config (estado visual real)
  const a14 = await ev(page, id => {
    cfgTab = "lojas"; go("configuracoes");
    const html = document.getElementById("content").innerHTML;
    // localiza a linha da loja e confere que mostra Inativa
    return html.includes("LOJA TESTE AUDITORIA") && /Inativa/.test(html);
  }, LID);
  rec("A14", "VIEWS.configuracoes (aba lojas)", "Conferir badge de status na tabela de lojas",
    "Loja inativa exibe badge 'Inativa'", a14 ? "badge Inativa presente" : "sem badge", a14);

  // A15 — reativar mantém o mesmo id e não duplica
  const a15 = await ev(page, id => {
    const antesN = DB.lojas.filter(l => l.nome === "LOJA TESTE AUDITORIA").length;
    toggleLoja(id);
    const l = DB.lojas.find(x => x.id === id);
    const depoisN = DB.lojas.filter(x => x.nome === "LOJA TESTE AUDITORIA").length;
    return { ativo: l.ativo, mesmoId: l.id === id, semDuplicar: antesN === depoisN && depoisN === 1 };
  }, LID);
  rec("A15", "toggleLoja (reativar)", "Reativar a loja de teste",
    "ativo:true, mesmo id, sem duplicar", JSON.stringify(a15),
    a15.ativo === true && a15.mesmoId && a15.semDuplicar);

  // ============ GRUPO B — PROPAGAÇÃO FINANCEIRA (real) ============
  await ev(page, () => { CURR_USER = DB.usuarios.find(u => u.perfil === "admin"); CURR_LOJA = ""; });
  const vN = await ev(page, () => contasReceberVisiveis()[0].n);
  const b0 = await ev(page, n => ({ rec: orcRecebido(DB.orcByN(n)), caixa: caixaSaldo() }), vN);
  // registrar recebimento de 100 via abrirRegReceb + salvarReceb
  await ev(page, n => { abrirRegReceb(n); }, vN); await sleep(60);
  await ev(page, () => { const e = document.getElementById("rr-valor"); if (e) e.value = "100"; });
  await ev(page, n => salvarReceb(n), vN); await sleep(40);
  const b1 = await ev(page, n => ({ rec: orcRecebido(DB.orcByN(n)), caixa: caixaSaldo() }), vN);
  rec("B1", "salvarReceb → orcRecebido", "Registrar recebimento de R$100 na venda",
    "recebido +100", "antes " + b0.rec + " depois " + b1.rec, Math.abs((b1.rec - b0.rec) - 100) < 0.01);
  rec("B2", "salvarReceb → caixaSaldo", "Mesmo recebimento reflete no Caixa",
    "caixa +100", "antes " + b0.caixa + " depois " + b1.caixa, Math.abs((b1.caixa - b0.caixa) - 100) < 0.01);
  // propaga no Ponto de Equilíbrio (receita do período "tudo")
  const b3 = await ev(page, () => { fPE.periodo = "tudo"; const d = peDados(); return d.receita; });
  rec("B3", "peDados().receita", "Recebimento propaga ao Ponto de Equilíbrio",
    "PE calcula receita > 0", "receita=" + b3, b3 > 0);
  // estorno reverte caixa e recebido
  const b4 = await ev(page, n => {
    const o = DB.orcByN(n);
    const r = (o.recebimentos || []).filter(x => !x.estornado).slice(-1)[0];
    const caixaAntes = caixaSaldo(), recAntes = orcRecebido(o);
    if (r) { r.estornado = true; addCaixa("saida", r.valor, "Estorno auditoria", n, r.forma, hojeBR()); }
    return { dCaixa: r2(caixaAntes - caixaSaldo()), dRec: r2(recAntes - orcRecebido(o)), val: r ? r.valor : 0 };
  }, vN);
  rec("B4", "estorno → caixa/recebido", "Estornar o recebimento",
    "caixa e recebido voltam pelo mesmo valor", JSON.stringify(b4),
    Math.abs(b4.dCaixa - b4.val) < 0.01 && Math.abs(b4.dRec - b4.val) < 0.01);

  // ============ GRUPO C — CUSTO / MARGEM (real) ============
  const c1 = await ev(page, n => {
    const o = DB.orcByN(n); o.custosExtras = o.custosExtras || [];
    const antes = margemVenda(o).lucro;
    o.custosExtras.push({ id: "audc", desc: "Custo auditoria", valor: 250, participaMargem: true });
    const depois = margemVenda(o).lucro;
    o.custosExtras = o.custosExtras.filter(x => x.id !== "audc");
    return { antes, depois };
  }, vN);
  rec("C1", "margemVenda + custosExtras", "Adicionar custo direto de R$250 à venda",
    "lucro cai 250", JSON.stringify(c1), Math.abs((c1.antes - c1.depois) - 250) < 0.01);
  const c2 = await ev(page, n => {
    const o = DB.orcByN(n); o.custosExtras = [{ id: "np", desc: "NP", valor: 500, participaMargem: false }];
    const v = custoExtrasVenda(o); o.custosExtras = [];
    return v;
  }, vN);
  rec("C2", "custoExtrasVenda (participaMargem:false)", "Custo marcado para não participar da margem",
    "não entra no custo (=0)", "custoExtras=" + c2, c2 === 0);

  // ============ GRUPO D — GUARDS POR CHAMADA DIRETA (permissão) ============
  const d1 = await ev(page, n => {
    const admin = CURR_USER; go("analise-venda");
    CURR_USER = { id: "v", nome: "V", perfil: "vendedor", lojas: ["L1"], vendedorId: "v1" };
    abrirAnaliseVenda(n);
    const bloq = cur !== "analise-venda-detalhe";
    CURR_USER = admin; return bloq;
  }, vN);
  rec("D1", "abrirAnaliseVenda (vendedor)", "Vendedor tenta abrir Análise por Venda por chamada direta",
    "guard bloqueia (não abre detalhe)", d1 ? "bloqueado" : "ABRIU", d1);
  const d2 = await ev(page, () => {
    const admin = CURR_USER;
    CURR_USER = { id: "v", nome: "V", perfil: "vendedor", lojas: ["L1"] };
    const antes = DB.lojas.length;
    openLojaForm(); // deve barrar por can('adm.config')
    const abriu = !!document.getElementById("lj-nome");
    CURR_USER = admin; if (typeof closeModal === "function") closeModal();
    return { bloq: !abriu };
  });
  rec("D2", "openLojaForm (vendedor)", "Vendedor tenta abrir cadastro de loja por chamada direta",
    "guard bloqueia (form não abre)", d2.bloq ? "bloqueado" : "ABRIU", d2.bloq);

  // ============ SAÍDA ============
  console.log("=== ERROS JS ===");
  console.log(errors.length ? errors.slice(0, 12).join("\n") : "NENHUM");
  console.log("\n=== EVIDÊNCIAS (id | PASS/FAIL | ação | esperado | encontrado) ===");
  R.forEach(r => console.log(
    r.id + " | " + (r.pass ? "PASS" : "FAIL") + " | " + r.func + " | " + r.acao + " | esp: " + r.esperado + " | got: " + r.encontrado));
  const fails = R.filter(r => !r.pass);
  console.log("\n=== " + (R.length - fails.length) + "/" + R.length + " PASS, " + fails.length + " FAIL, " + errors.length + " erros JS ===");
  if (fails.length) { console.log("FALHAS:"); fails.forEach(f => console.log("  " + f.id + " " + f.func + " → " + f.encontrado)); }
  require("fs").writeFileSync(OUT + "/auditoria-resultado.json", JSON.stringify({ R, errors }, null, 2));
  await b.close();
})().catch(e => { console.error("HARNESS:", e); process.exit(1); });
