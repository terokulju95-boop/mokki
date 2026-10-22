// =============================================================
//  Mökki – automaattiset selaintestit
//  Ajo:  npm i -D playwright  &&  npx playwright install chromium
//        node tests/e2e.mjs
//  Firebase korvataan muistissa toimivalla mockilla (tests/mock),
//  joten testit eivät koske oikeaan tietokantaan.
// =============================================================
import http from "http"; import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || "playwright");
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, ".."), MOCK = path.join(HERE, "mock");
const OUT = process.env.SHOTS || path.join(HERE, "shots"); fs.mkdirSync(OUT, { recursive: true });
const PORT = 8790 + Math.floor(Math.random() * 100);

const TYPES = { ".js": "text/javascript", ".css": "text/css", ".html": "text/html", ".json": "application/json", ".png": "image/png" };
const srv = http.createServer((q, r) => {
  let f = path.join(ROOT, decodeURIComponent(q.url.split("?")[0])); if (f.endsWith("/")) f += "index.html";
  fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { "content-type": TYPES[path.extname(f)] || "application/octet-stream" }); r.end(d); });
}).listen(PORT);
const URL0 = `http://localhost:${PORT}/`;

let pass = 0, failed = [];
function check(name, ok, info = "") { if (ok) { pass++; console.log("  ✓", name); } else { failed.push(name); console.log("  ✗", name, info); } }
const section = t => console.log("\n" + t);

const ago = n => { const x = new Date(Date.now() - n * 864e5); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`; };
const SEED = {
  app: { users: { users: ["Tero", "Timo", "Tiina"], pins: { Tero: "1111", Timo: "2222" } } },
  info: { main: { name: "Jannenranta", address: "Rantatie 5", municipality: "12345 Kunta", coords: "60.1, 25.1" } },
  logs: {
    l1: { type: "nuohous", date: ago(400), doer: "nuohooja", provider: "Nuohous Oy", cost: 120, createdByName: "Tero" },
    l2: { type: "puut", date: ago(60), amount: 4, unit: "irto-m³", cost: 300, createdByName: "Timo" },
    l3: { type: "huolto", title: "Kiukaan kivet vaihdettu", date: ago(20), category: "Sauna", createdByName: "Tero" }
  },
  bookings: { b1: { who: "Timo", start: ago(-5), end: ago(-8) } },
  todos: { t1: { text: "Vaihda saunan lauteet", due: ago(3), done: false, createdByName: "Tero", createdAt: "x" } },
  payments: { p1: { name: "Sähkö", amount: 50, date: ago(2), recurrence: "kk", paid: false, category: "Sähkö" } },
  shopping: { s1: { text: "WC-paperia", done: false, createdByName: "Timo", list: "vie" } },
  inventory: { i1: { name: "Kaasupullo", category: "Polttoaineet & sytykkeet", status: "ok" }, i2: { name: "Tiskiaine", category: "Siivous & hygienia", status: "vahissa", qty: "puoli pulloa" } },
  checkItems: { c1: { title: "Vesipumppu irti", season: "talvi", order: 10 }, c2: { title: "Vedet pois putkistosta", season: "talvi", order: 20, instructions: "Venttiilit kellarissa" }, c3: { title: "Sähköt päälle", season: "kevat", order: 10 } },
  seasonRuns: { r0: { season: "talvi", label: "Talviteloille 2024", startedAt: "2024-09-10T10:00:00Z", startedByName: "Tero", completed: { c1: { title: "x", byName: "Tero", at: "2024-09-10T10:00:00Z" } } } }
};

const browser = await chromium.launch(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {});
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await ctx.route("https://www.gstatic.com/**", r => r.fulfill({ contentType: "text/javascript", body: fs.readFileSync(path.join(MOCK, path.basename(new URL(r.request().url()).pathname))) }));
await ctx.addInitScript(seed => { if (localStorage.__seeded) return; localStorage.__seeded = 1; localStorage.setItem("__mockdb", JSON.stringify(seed)); localStorage.setItem("mokki_user", "Tero"); }, SEED);
const errs = [];
const page = await ctx.newPage();
page.on("pageerror", e => errs.push(e.message)); page.on("console", m => m.type() === "error" && errs.push(m.text()));
page.on("dialog", d => d.type() === "prompt" ? d.accept(d.defaultValue()) : d.accept());
const go = async (p, h) => { await p.goto(URL0 + h); await p.waitForTimeout(450); };
const text = async (p = page) => (await p.locator("#view").innerText());
const db = async () => page.evaluate(() => JSON.parse(localStorage.getItem("__mockdb")));
export const ctxObj = { page, ctx, go, text, db, check, section, URL0, OUT, errs };

// ---------- Testitiedostot ----------
const files = fs.readdirSync(path.join(HERE, "cases")).filter(f => f.endsWith(".mjs")).sort();
const only = process.argv[2];
for (const f of files) {
  if (only && !f.includes(only)) continue;
  section("▶ " + f);
  try { const mod = await import(path.join(HERE, "cases", f)); await mod.default(ctxObj); }
  catch (e) { failed.push(f + ": " + e.message.split("\n")[0]); console.log("  ✗ kaatui:", e.message.split("\n")[0]); }
}
section("JavaScript-virheet");
check("ei virheitä selaimen konsolissa", errs.length === 0, JSON.stringify(errs.slice(0, 5)));
console.log(`\n${pass} ok, ${failed.length} epäonnistui`);
if (failed.length) console.log("Epäonnistuneet:\n - " + failed.join("\n - "));
await browser.close(); srv.close();
process.exit(failed.length ? 1 : 0);
