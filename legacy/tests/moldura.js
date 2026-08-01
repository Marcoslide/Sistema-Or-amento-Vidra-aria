/* Testes da regra de cálculo MOLDURA — item 16 do lote. */
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
  page.on("dialog", d => { try { d.accept("0"); } catch (e) {} });
  const errors = []; page.on("pageerror", e => errors.push("PAGEERR: " + e.message));
  page.on("console", m => { if (m.type() === "error") errors.push("C: " + m.text()); });
  await page.goto(FILE, { waitUntil: "load" }); await sleep(200);
  await ev(page, () => { enter(); CURR_USER = DB.usuarios.find(u => u.perfil === "admin"); CURR_LOJA = ""; });

  // helper: produto moldura padrão (5cm, x8)
  const prod = { larguraMolduraCm: 5, multiplicadorCorte: 8 };

  // 1-5 cálculo básico
  chk("1-2. Perímetro 40×60 cm = 2,00 m (via qtdMedida sem acréscimo)", Math.abs(await ev(page, () => qtdMedida("PERIMETRO", { l: 40, a: 60, q: 1, unit: "cm" })) - 2.00) < 0.001);
  chk("3. Acréscimo moldura 5×8 = 40 cm = 0,40 m", Math.abs(await ev(page, p => molduraAcrescimoM(p), prod) - 0.40) < 0.001);
  const c40 = await ev(page, p => qtdMedida("MOLDURA", { l: 40, a: 60, q: 1, unit: "cm" }, p), prod);
  chk("4-5. Consumo 40×60 + moldura 5cm = 2,40 m", Math.abs(c40 - 2.40) < 0.001, "got " + c40);

  // 6-7 valor via produto real p13 (preço 30/m)
  const val1 = await ev(page, () => { const it = { produtoId: "p13", regra: "MOLDURA", descPct: 0, medidas: [{ l: 40, a: 60, q: 1, unit: "cm" }] }; const ci = totalItem(it); return { q: ci.q, total: ci.total, preco: ci.preco }; });
  chk("6. Preço por metro do produto p13 = R$30", Math.abs(val1.preco - 30) < 0.001, "preco " + val1.preco);
  chk("7. Total 2,40 × 30 = R$72,00", Math.abs(val1.total - 72) < 0.001 && Math.abs(val1.q - 2.40) < 0.001, JSON.stringify(val1));

  // 8-10 quantidade 3
  const val3 = await ev(page, () => { const it = { produtoId: "p13", regra: "MOLDURA", descPct: 0, medidas: [{ l: 40, a: 60, q: 3, unit: "cm" }] }; const ci = totalItem(it); return { q: ci.q, total: ci.total }; });
  chk("8-9. Quantidade 3 → consumo 7,20 m", Math.abs(val3.q - 7.20) < 0.001, "q " + val3.q);
  chk("10. Total 7,20 × 30 = R$216,00", Math.abs(val3.total - 216) < 0.001, "total " + val3.total);

  // 11-14 outra largura de perfil (3cm)
  const prod3 = { larguraMolduraCm: 3, multiplicadorCorte: 8 };
  const c3 = await ev(page, p => qtdMedida("MOLDURA", { l: 40, a: 60, q: 1, unit: "cm" }, p), prod3);
  chk("11-14. Moldura 3cm → acréscimo 24cm → consumo 2,24 m", Math.abs(c3 - 2.24) < 0.001, "got " + c3);

  // 15-17 múltiplas medidas somam
  const multi = await ev(page, () => { const it = { produtoId: "p13", regra: "MOLDURA", descPct: 0, medidas: [{ l: 40, a: 60, q: 1, unit: "cm" }, { l: 50, a: 70, q: 2, unit: "cm" }, { l: 30, a: 40, q: 3, unit: "cm" }] }; return totalItem(it).q; });
  // esperado: (2.40*1) + (((2*.5+2*.7)+.4)*2)=(2.4)+((2.4+.4)*2)=2.4+ (2.8*2=5.6)=8.0 ; wait compute: 50×70: perim=2*.5+2*.7=1.0+1.4=2.4; +0.4=2.8; ×2=5.6 ; 30×40: perim=2*.3+2*.4=0.6+0.8=1.4;+0.4=1.8;×3=5.4 ; total=2.4+5.6+5.4=13.4
  chk("15-17. Múltiplas medidas somam (2,40 + 5,60 + 5,40 = 13,40 m)", Math.abs(multi - 13.40) < 0.001, "got " + multi);

  // 18-21 outras famílias intactas
  chk("18. M2 (vidro) inalterado: 1,50×2,00 = 3,00 m²", Math.abs(await ev(page, () => qtdMedida("M2", { l: 1.5, a: 2, q: 1, unit: "m" })) - 3.00) < 0.001);
  chk("19. UN inalterado: qtd 5 = 5", Math.abs(await ev(page, () => qtdMedida("UN", { q: 5 })) - 5) < 0.001);
  chk("20. ML inalterado: 4,20 m × 6 = 25,2 m", Math.abs(await ev(page, () => qtdMedida("ML", { l: 4.2, q: 6, unit: "m" })) - 25.2) < 0.001);
  chk("21. PERIMETRO inalterado sem acréscimo (2,00 m)", Math.abs(await ev(page, () => qtdMedida("PERIMETRO", { l: 40, a: 60, q: 1, unit: "cm" })) - 2.00) < 0.001);

  // 22-23 documentos
  const docs = await ev(page, () => {
    // monta uma venda com produto moldura para gerar PDFs
    const o = DB.orcamentos[0];
    const bak = JSON.stringify(o.ambientes);
    o.ambientes = [{ id: "aM", nome: "Quadros", collapsed: false, itens: [{ id: "iM", produtoId: "p13", regra: "MOLDURA", descPct: 0, medidas: [{ id: "mM", l: 40, a: 60, q: 1, unit: "cm" }] }] }];
    o.pdfTipo = "cliente"; const htmlCli = VIEWS.pdf();
    o.pdfTipo = "producao"; const htmlProd = VIEWS.pdf();
    o.ambientes = JSON.parse(bak);
    return { cliTemMemoria: /perím|acrésc|Consumo unit|multiplicador|largura da moldura/i.test(htmlCli), prodTemConsumo: /perím|acrésc|consumo/i.test(htmlProd) };
  });
  chk("22. PDF do cliente NÃO mostra memória técnica da moldura", !docs.cliTemMemoria, "cliTemMemoria=" + docs.cliTemMemoria);
  chk("23. Via de produção mostra consumo/cálculo técnico", docs.prodTemConsumo, "prodTemConsumo=" + docs.prodTemConsumo);

  // 24 análise por venda recebe custo/margem corretos
  const anal = await ev(page, () => {
    const o = DB.orcamentos[0]; const bak = JSON.stringify(o.ambientes);
    o.ambientes = [{ id: "aM", nome: "Quadros", collapsed: false, itens: [{ id: "iM", produtoId: "p13", regra: "MOLDURA", descPct: 0, medidas: [{ id: "mM", l: 40, a: 60, q: 1, unit: "cm" }] }] }];
    const cp = custoProdutoItem(o.ambientes[0].itens[0]);
    const mv = margemVenda(o);
    o.ambientes = JSON.parse(bak);
    return { cp, receita: mv.receita, cpTotal: mv.cp };
  });
  // custo: consumo 2,40 × custoUnit(p13). custoBase 10 → custo 24.
  chk("24. Custo por venda = 2,40 × custo/m (R$10) = R$24", Math.abs(anal.cp - 24) < 0.5, "cp " + anal.cp + " receita " + anal.receita);

  // validações (12)
  chk("V1. Sem largura de moldura → consumo 0 (não assume)", await ev(page, () => qtdMedida("MOLDURA", { l: 40, a: 60, q: 1, unit: "cm" }, { larguraMolduraCm: 0, multiplicadorCorte: 8 })) === 0);
  chk("V2. Largura/altura zero → consumo 0", await ev(page, p => qtdMedida("MOLDURA", { l: 0, a: 60, q: 1, unit: "cm" }, p), prod) === 0);
  chk("V3. Quantidade zero → consumo 0", await ev(page, p => qtdMedida("MOLDURA", { l: 40, a: 60, q: 0, unit: "cm" }, p), prod) === 0);
  chk("V4. Multiplicador ausente assume padrão 8", Math.abs(await ev(page, () => qtdMedida("MOLDURA", { l: 40, a: 60, q: 1, unit: "cm" }, { larguraMolduraCm: 5 })) - 2.40) < 0.001);

  // família e produto predefinidos
  chk("F1. Família 'Molduras' existe com regra MOLDURA, unidade m, mult 8", await ev(page, () => { const f = DB.familias.find(x => x.regra === "MOLDURA"); return !!f && f.unidade === "m" && (f.multiplicadorPadrao === 8); }));
  chk("F2. Regra é identificada por código estável 'MOLDURA' (não pelo nome)", await ev(page, () => typeof REGRAS["MOLDURA"] === "object"));
  chk("F3. Produto demo p13 usa regra MOLDURA e largura 5cm", await ev(page, () => { const p = DB.prodById("p13"); return p && p.regra === "MOLDURA" && p.larguraMolduraCm === 5 && p.multiplicadorCorte === 8; }));

  // salvarProduto bloqueia moldura sem largura
  const blk = await ev(page, () => {
    EDIT_ID = null; go("produto-form");
    document.getElementById("pf-descricao").value = "Moldura sem largura";
    document.getElementById("pf-codigo").value = "MLD-X";
    PF.familia = "Molduras"; PF.regra = "MOLDURA"; document.getElementById("pf-regra").value = "MOLDURA"; pfRegraChange("MOLDURA");
    document.getElementById("pf-larguraMolduraCm").value = "0";
    document.getElementById("pf-precoVenda").value = "30";
    const antes = DB.produtos.length; salvarProduto();
    const bloqueado = DB.produtos.length === antes;
    const msg = (document.getElementById("err-larguraMolduraCm") || {}).textContent || "";
    return { bloqueado, msg };
  });
  chk("V5. salvarProduto bloqueia moldura sem largura (mensagem)", blk.bloqueado && /largura da moldura/i.test(blk.msg), JSON.stringify(blk));

  chk("Zero erros JavaScript", errors.length === 0, errors.slice(0, 4).join(" | "));
  console.log("=== ERROS JS ==="); console.log(errors.length ? errors.slice(0, 12).join("\n") : "NENHUM");
  console.log("=== MOLDURA — RESULTADOS ===");
  R.forEach(r => console.log(r[0] + " | " + r[1] + (r[2] ? "  (" + r[2] + ")" : "")));
  const fails = R.filter(r => r[0] === "FAIL").length;
  console.log("=== " + (R.length - fails) + "/" + R.length + " PASS, " + fails + " FAIL, " + errors.length + " erros JS ===");
  await b.close();
})().catch(e => { console.error("HARNESS:", e); process.exit(1); });
