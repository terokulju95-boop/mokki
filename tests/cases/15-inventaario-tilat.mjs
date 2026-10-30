// Inventaarion lisätilat (vanhentunut, rikki, tilattu, lainassa) ja vanhenemispäivä
export default async ({ page, go, text, check, db, OUT }) => {
  const d = n => { const x = new Date(Date.now() + n * 864e5); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`; };
  await go(page, "#tavarat");
  await page.evaluate(([past, soon]) => {
    const m = JSON.parse(localStorage.getItem("__mockdb"));
    m.inventory = {
      a1: { name: "Laastarit", category: "Ensiapu & turvallisuus", status: "ok", expires: past },
      a2: { name: "Säilykkeet", category: "Ruoka & juoma", status: "ok", expires: soon },
      a3: { name: "Taskulamppu", category: "Työkalut & tarvikkeet", status: "ok" },
      a4: { name: "Kirves", category: "Työkalut & tarvikkeet", status: "ok" }
    };
    m.shopping = {};
    localStorage.setItem("__mockdb", JSON.stringify(m)); localStorage.setItem("mokki_user", "Tero");
  }, [d(-3), d(10)]);
  await page.reload(); await page.waitForTimeout(600);
  await page.click('[data-tab="inv"]'); await page.waitForTimeout(200);
  let t = await text();
  check("vanhentunut päivän perusteella", /Laastarit[\s\S]*?Vanheni[\s\S]*?Vanhentunut/.test(t));
  check("pian vanheneva näkyy", /Vanhenee .*\(10 pv\)/.test(t));
  check("yhteenveto", t.includes("1 vanhentunut") && t.includes("1 vanhenee pian"));
  // valikko
  await page.click('[data-action="invStatus"][data-id="a3"]'); await page.waitForTimeout(200);
  check("tilavalikossa 7 vaihtoehtoa", await page.locator("#modal .inv-opt").count() === 7);
  await page.click('#modal [data-action="invSetStatus"][data-s="rikki"]'); await page.waitForTimeout(300);
  check("valikko sulkeutuu", await page.locator("#modal.open").count() === 0);
  let m = await db();
  check("rikki tallentuu", m.inventory.a3.status === "rikki");
  check("rikki lisätään Hankittaviin", Object.values(m.shopping).some(s => s.invId === "a3" && !s.done));
  await page.click('[data-action="invStatus"][data-id="a3"]'); await page.waitForTimeout(200);
  await page.click('#modal [data-action="invSetStatus"][data-s="tilattu"]'); await page.waitForTimeout(300);
  m = await db();
  check("tilattu kuittaa hankittavan", !Object.values(m.shopping).some(s => s.invId === "a3" && !s.done));
  await page.click('[data-action="invStatus"][data-id="a4"]'); await page.waitForTimeout(200);
  await page.click('#modal [data-action="invSetStatus"][data-s="lainassa"]'); await page.waitForTimeout(300);
  m = await db();
  check("lainassa ei lisää Hankittaviin", m.inventory.a4.status === "lainassa" && !Object.values(m.shopping).some(s => s.invId === "a4"));
  // vanhentuneen OK-merkintä poistaa vanhan päivän
  await page.click('[data-action="invStatus"][data-id="a1"]'); await page.waitForTimeout(200);
  check("nykyinen tila merkitty", await page.locator('#modal .inv-opt.on[data-s="vanhentunut"]').count() === 1);
  await page.click('#modal [data-action="invSetStatus"][data-s="ok"]'); await page.waitForTimeout(300);
  m = await db();
  check("OK poistaa ohi menneen päivän", m.inventory.a1.status === "ok" && !m.inventory.a1.expires);
  // lomakkeessa kenttä
  await page.click('[data-action="editInv"][data-id="a2"]'); await page.waitForTimeout(200);
  check("vanhenee-kenttä ja kaikki tilat lomakkeessa", await page.locator('#modal [name="expires"]').count() === 1 && await page.locator('#modal [name="status"] option').count() === 7);
  await page.click("[data-mclose]");
  await page.screenshot({ path: OUT + "/inventaario.png", fullPage: true });
  await page.click('[data-action="invStatus"][data-id="a2"]'); await page.waitForTimeout(200);
  await page.screenshot({ path: OUT + "/inventaario-valikko.png" });
  await page.click("[data-mclose]");
  await go(page, "#koti");
  check("etusivulla huomautus", (await text()).includes("Säilykkeet") || (await text()).includes("vaatii huomiota"));
};
