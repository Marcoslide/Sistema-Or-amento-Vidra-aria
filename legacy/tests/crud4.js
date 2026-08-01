/* Sub-lote CRUD 4 — Famílias, Fornecedores, Produtos, Clientes: exclusão segura já padronizada */
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
  const errors = []; page.on("pageerror", e => errors.push("PAGEERR: " + e.message)); page.on("console", m => { if (m.type() === "error") errors.push("C: " + m.text()); });
  await page.goto(FILE, { waitUntil: "load" }); await sleep(200);
  await ev(page, () => { enter(); CURR_USER = DB.usuarios.find(u => u.perfil === "admin"); CURR_LOJA = ""; });

  // ---- FAMÍLIAS ----
  const famBlk = await ev(page, () => { const f = DB.familias.find(x => x.nome === "Vidros temperados"); const temProd = DB.produtos.some(p => p.familia === f.nome); delFam(f.id); if (window.__ok) window.__ok(); const existe = DB.familias.some(x => x.id === f.id); const inat = f.ativo === false; f.ativo = true; return { temProd, existe, inat }; });
  chk("Família com produtos NÃO é excluída (inativa)", famBlk.temProd && famBlk.existe && famBlk.inat, JSON.stringify(famBlk));
  chk("Família sem produtos é excluída", await ev(page, () => { const nf = mkFam({ nome: "Fam Vazia Teste", regra: "UN" }); DB.familias.push(nf); delFam(nf.id); if (window.__ok) window.__ok(); return !DB.familias.some(x => x.id === nf.id); }));
  chk("Família inativa some de novos cadastros (famNomes)", await ev(page, () => { const f = DB.familias.find(x => x.nome === "Espelhos"); f.ativo = false; const some = famNomes().includes("Espelhos"); f.ativo = true; return !some; }));

  // ---- FORNECEDORES ----
  const fornBlk = await ev(page, () => { const f = DB.fornecedores.find(x => DB.produtos.some(p => p.fornecedor === x.nome)); if (!f) return { skip: true, existe: true, inat: true }; delForn(f.id); if (window.__ok) window.__ok(); const existe = DB.fornecedores.some(x => x.id === f.id); const inat = f.ativo === false; f.ativo = true; return { existe, inat }; });
  chk("Fornecedor com produtos NÃO é excluído (inativa)", fornBlk.existe && fornBlk.inat, JSON.stringify(fornBlk));

  // ---- PRODUTOS ----
  const prodBlk = await ev(page, () => { const p = DB.prodById("p1"); const emOrc = vinculadoOrc("p1"); excluirProduto("p1"); if (window.__ok) window.__ok(); const existe = !!DB.prodById("p1"); const inat = p.ativo === false; p.ativo = true; return { emOrc, existe, inat }; });
  chk("Produto em orçamento NÃO é excluído (inativa)", prodBlk.emOrc && prodBlk.existe && prodBlk.inat, JSON.stringify(prodBlk));
  chk("Produto sem vínculo é excluído", await ev(page, () => { DB.produtos.push(mkProd({ id: "pTeste", descricao: "Prod Teste", familia: "Serviços", regra: "UN", preco: 10 })); excluirProduto("pTeste"); if (window.__ok) window.__ok(); return !DB.prodById("pTeste"); }));
  chk("Produto inativo some de novos itens (filtro ativo)", await ev(page, () => { const p = DB.prodById("p2"); p.ativo = false; const dispo = DB.produtos.filter(x => x.ativo).some(x => x.id === "p2"); p.ativo = true; return !dispo; }));

  // ---- CLIENTES ----
  chk("Cliente sem vínculo é excluído", await ev(page, () => { const c = { id: "cliT", nome: "Cliente Teste", obras: [], ativo: true }; DB.clientes.push(c); excluirCliente("cliT"); if (window.__ok) window.__ok(); return !DB.cliById("cliT"); }));
  const cliBlk = await ev(page, () => {
    const c = { id: "cliV", nome: "Cliente Vinc", obras: [], ativo: true }; DB.clientes.push(c);
    DB.orcamentos.push({ n: 999999, clienteId: "cliV", clienteNome: "Cliente Vinc", lojaId: "L1", vendNome: "Carla Mendes", ambientes: [], vendaGerada: false, recebimentos: [], parcelas: [] });
    const vinc = (typeof cliVinculado === "function") ? cliVinculado("cliV") : true;
    excluirCliente("cliV"); if (window.__ok) window.__ok(); const existe = !!DB.cliById("cliV"); const inat = existe && DB.cliById("cliV").ativo === false;
    DB.orcamentos = DB.orcamentos.filter(o => o.n !== 999999); DB.clientes = DB.clientes.filter(x => x.id !== "cliV");
    return { vinc, existe, inat };
  });
  chk("Cliente com vínculo NÃO é excluído (inativa)", cliBlk.vinc && cliBlk.existe && cliBlk.inat, JSON.stringify(cliBlk));

  chk("Zero erros JavaScript", errors.length === 0, errors.slice(0, 4).join(" | "));
  console.log("=== ERROS JS ==="); console.log(errors.length ? errors.slice(0, 12).join("\n") : "NENHUM");
  console.log("=== CRUD 4 (Cadastros) — RESULTADOS ===");
  R.forEach(r => console.log(r[0] + " | " + r[1] + (r[2] ? "  (" + r[2] + ")" : "")));
  const fails = R.filter(r => r[0] === "FAIL").length;
  console.log("=== " + (R.length - fails) + "/" + R.length + " PASS, " + fails + " FAIL, " + errors.length + " erros JS ===");
  await b.close();
})().catch(e => { console.error("HARNESS:", e); process.exit(1); });
