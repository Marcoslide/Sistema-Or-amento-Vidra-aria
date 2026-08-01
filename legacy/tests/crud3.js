/* Sub-lote CRUD 3 — Lojas, Usuários, Perfis: exclusão segura + guardas */
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

  // ---- LOJAS ----
  chk("Criar loja vazia e EXCLUIR (sem vínculo)", await ev(page, () => { openLojaForm(); document.getElementById("lj-nome").value = "Loja Vazia Teste"; salvarLoja(""); const l = DB.lojas.find(x => x.nome === "Loja Vazia Teste"); delLoja(l.id); if (window.__ok) window.__ok(); return !DB.lojas.some(x => x.nome === "Loja Vazia Teste"); }));
  const lojaBlk = await ev(page, () => { const l = DB.lojas.find(x => x.id === "L1"); const v = vinculosLoja(l); delLoja("L1"); const existe = DB.lojas.some(x => x.id === "L1"); if (window.__inat) window.__inat(); const inat = DB.lojas.find(x => x.id === "L1").ativo === false; DB.lojas.find(x => x.id === "L1").ativo = true; return { vinc: v.total, existe, inat }; });
  chk("Loja COM vínculo (L1) NÃO é excluída (inativa) + preserva histórico", lojaBlk.vinc > 0 && lojaBlk.existe && lojaBlk.inat, JSON.stringify(lojaBlk));
  chk("Duplicar loja", await ev(page, () => { const n0 = DB.lojas.length; dupLoja("L2"); const ok = DB.lojas.length === n0 + 1 && DB.lojas.some(x => /\(cópia\)/.test(x.nome)); DB.lojas = DB.lojas.filter(x => !/\(cópia\)/.test(x.nome)); return ok; }));

  // ---- USUÁRIOS ----
  chk("Não exclui o usuário logado", await ev(page, () => { const n0 = DB.usuarios.length; delUsuario(CURR_USER.id); return DB.usuarios.length === n0 && DB.usuarios.some(x => x.id === CURR_USER.id); }));
  chk("Não exclui o último administrador ativo", await ev(page, () => {
    const ghost = { id: "ghost", nome: "Ghost", perfil: "admin", lojas: [] }; const admin = CURR_USER; CURR_USER = ghost;
    const bak = {}; DB.usuarios.forEach(u => { if (u.perfil === "admin" && u.id !== "u1") { bak[u.id] = u.status; u.status = "BLOQUEADO"; } });
    const n0 = DB.usuarios.length; delUsuario("u1"); const existe = DB.usuarios.some(x => x.id === "u1");
    Object.keys(bak).forEach(id => DB.usuarios.find(u => u.id === id).status = bak[id]); CURR_USER = admin;
    return existe && DB.usuarios.length === n0; }));
  const uHist = await ev(page, () => { const u = DB.usuarios.find(x => x.id === "u3"); // Diego (vendedor v2, tem vendas)
    const v = vinculosUsuario(u); delUsuario("u3"); const existe = DB.usuarios.some(x => x.id === "u3"); if (v.total > 0 && window.__inat) window.__inat(); const bloq = DB.usuarios.find(x => x.id === "u3").status === "BLOQUEADO"; DB.usuarios.find(x => x.id === "u3").status = "ATIVO"; return { vinc: v.total, existe, bloq }; });
  chk("Usuário com histórico NÃO é excluído (bloqueia)", uHist.existe && uHist.bloq, JSON.stringify(uHist));
  chk("Excluir usuário SEM histórico", await ev(page, () => { DB.usuarios.push({ id: "uNovo", nome: "User Novo", email: "n@x.com", perfil: "vendedor", lojas: ["L1"], status: "PENDENTE_APROVACAO", ultimo: "—" }); delUsuario("uNovo"); if (window.__ok) window.__ok(); return !DB.usuarios.some(x => x.id === "uNovo"); }));

  // ---- PERFIS ----
  chk("Criar perfil", await ev(page, () => { openPerfilForm(); document.getElementById("pf-nome").value = "Perfil Teste"; salvarPerfil(); return DB.perfis.some(p => p.nome === "Perfil Teste"); }));
  const pid = await ev(page, () => DB.perfis.find(p => p.nome === "Perfil Teste").id);
  chk("Duplicar perfil", await ev(page, id => { const n0 = DB.perfis.length; dupPerfil(id); return DB.perfis.length === n0 + 1; }, pid));
  chk("Inativar/Reativar perfil", await ev(page, id => { togglePerfil(id); const i = DB.perfis.find(p => p.id === id).ativo === false; togglePerfil(id); return i && DB.perfis.find(p => p.id === id).ativo === true; }, pid));
  chk("NÃO exclui perfil admin", await ev(page, () => { const n0 = DB.perfis.length; delPerfil("admin"); return DB.perfis.some(p => p.id === "admin") && DB.perfis.length === n0; }));
  chk("NÃO exclui perfil do usuário atual", await ev(page, () => { const admin = CURR_USER; CURR_USER = Object.assign({}, admin, { perfil: "vendedor" }); const n0 = DB.perfis.length; delPerfil("vendedor"); const existe = DB.perfis.some(p => p.id === "vendedor"); CURR_USER = admin; return existe && DB.perfis.length === n0; }));
  const pUso = await ev(page, () => { const emUso = _perfilEmUso("vendedor"); delPerfil("vendedor"); const existe = DB.perfis.some(p => p.id === "vendedor"); if (window.__inat) window.__inat(); const inat = DB.perfis.find(p => p.id === "vendedor").ativo === false; DB.perfis.find(p => p.id === "vendedor").ativo = true; return { emUso, existe, inat }; });
  chk("Perfil em uso NÃO é excluído (inativa)", pUso.emUso > 0 && pUso.existe && pUso.inat, JSON.stringify(pUso));
  chk("Excluir perfil sem uso", await ev(page, () => { DB.perfis = DB.perfis.filter(p => p.nome !== "Perfil Teste (cópia)"); const id = DB.perfis.find(p => p.nome === "Perfil Teste").id; delPerfil(id); if (window.__ok) window.__ok(); return !DB.perfis.some(p => p.nome === "Perfil Teste"); }));
  chk("Aba Perfis mostra CRUD (Novo perfil / Excluir)", await ev(page, () => { cfgTab = "perfis"; const h = VIEWS.configuracoes(); return /openPerfilForm\(/.test(h) && /delPerfil\(/.test(h) && /dupPerfil\(/.test(h); }));

  chk("Zero erros JavaScript", errors.length === 0, errors.slice(0, 4).join(" | "));
  console.log("=== ERROS JS ==="); console.log(errors.length ? errors.slice(0, 12).join("\n") : "NENHUM");
  console.log("=== CRUD 3 (Lojas/Usuários/Perfis) — RESULTADOS ===");
  R.forEach(r => console.log(r[0] + " | " + r[1] + (r[2] ? "  (" + r[2] + ")" : "")));
  const fails = R.filter(r => r[0] === "FAIL").length;
  console.log("=== " + (R.length - fails) + "/" + R.length + " PASS, " + fails + " FAIL, " + errors.length + " erros JS ===");
  await b.close();
})().catch(e => { console.error("HARNESS:", e); process.exit(1); });
