const { chromium } = require("playwright-core");
const EXE = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const OUT = "/tmp/claude-0/-home-user-Sistema-Or-amento-Vidra-aria/58a882f8-11eb-59b3-a4d7-34447a0c185b/scratchpad";
const FILE = "file://" + OUT + "/vidrogestor-lote-final.html";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const R = []; const chk = (n, c, d) => R.push([c ? "PASS" : "FAIL", n, d || ""]);
const WIDTHS = [360, 390, 768, 1024, 1280, 1440];
(async () => {
  const b = await chromium.launch({ executablePath: EXE });
  for (const w of WIDTHS) {
    const ctx = await b.newContext({ viewport: { width: w, height: 780 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", e => errors.push("PAGEERR:" + e.message));
    page.on("console", m => { if (m.type() === "error") errors.push("CONSOLE:" + m.text()); });
    page.on("dialog", d => d.dismiss().catch(()=>{}));
    await page.goto(FILE, { waitUntil: "load" }); await sleep(150);
    // login visível e sem scroll horizontal
    const loginX = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
    chk(`w${w} login sem scroll horizontal`, loginX);
    await page.screenshot({ path: `${OUT}/mob-${w}-login.png` });
    await page.evaluate(() => enter()); await sleep(200);
    // dashboard sem overflow horizontal
    const dashX = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
    chk(`w${w} dashboard sem scroll horizontal`, dashX, "sw=" + await page.evaluate(()=>document.documentElement.scrollWidth) + " win=" + w);
    // navegar para Vendas e Contas a pagar (admin)
    await page.evaluate(() => { CURR_USER=DB.usuarios.find(u=>u.perfil==="admin"); CURR_LOJA=""; go("vendas"); }); await sleep(120);
    const vendasX = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
    chk(`w${w} vendas sem scroll horizontal (body)`, vendasX);
    await page.screenshot({ path: `${OUT}/mob-${w}-vendas.png` });
    await page.evaluate(() => go("contas-pagar")); await sleep(120);
    const cpX = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
    chk(`w${w} contas-pagar sem scroll horizontal (body)`, cpX);
    await page.screenshot({ path: `${OUT}/mob-${w}-cp.png` });
    chk(`w${w} zero erros JS`, errors.length === 0, errors.slice(0,2).join(" | "));
    await ctx.close();
  }
  // Instalabilidade PWA: manifest válido + campos exigidos
  const man = JSON.parse(require("fs").readFileSync(OUT + "/manifest.webmanifest", "utf8"));
  chk("PWA manifest: name/short_name", !!man.name && !!man.short_name);
  chk("PWA manifest: start_url + scope", !!man.start_url && !!man.scope);
  chk("PWA manifest: display standalone", man.display === "standalone");
  chk("PWA manifest: theme_color", man.theme_color === "#1a4fd6");
  chk("PWA manifest: ícones 192 e 512", man.icons.some(i=>i.sizes==="192x192") && man.icons.some(i=>i.sizes==="512x512"));
  chk("PWA manifest: ícone maskable", man.icons.some(i=>/maskable/.test(i.purpose||"")));
  console.log("=== RESULTADOS MOBILE/PWA ===");
  R.forEach(r => console.log(r[0] + " | " + r[1] + (r[2] ? "  (" + r[2] + ")" : "")));
  const fails = R.filter(r => r[0] === "FAIL").length;
  console.log("=== " + (R.length - fails) + "/" + R.length + " PASS, " + fails + " FAIL ===");
  await b.close();
})().catch(e => { console.error("HARNESS:", e); process.exit(1); });
