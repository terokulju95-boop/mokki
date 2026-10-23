// Tarkastettavien voimassaolopäivä: vanhentunut, pian vanhenevä, voimassa
export default async ({ page, go, text, check, db, OUT }) => {
  const d = n => { const x = new Date(Date.now() + n * 864e5); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`; };
  await go(page, "#huoltotyot");
  await page.evaluate(([a, b, c]) => {
    const m = JSON.parse(localStorage.getItem("__mockdb"));
    m.checks = {
      k1: { name: "Sammutin", location: "Eteinen", expires: a, history: [] },
      k2: { name: "Ensiapulaukku", expires: b, history: [] },
      k3: { name: "Häkävaroitin", expires: c, history: [] },
      k4: { name: "Aataminomena", history: [] }
    };
    localStorage.setItem("__mockdb", JSON.stringify(m)); localStorage.setItem("mokki_user", "Tero");
  }, [d(-10), d(20), d(400)]);
  await page.reload(); await page.waitForTimeout(600);
  await page.click('[data-tab="tarkastukset"]'); await page.waitForTimeout(200);
  const titles = await page.locator("#view .item-title").allInnerTexts();
  check("vanhentunut ensin, sitten pian vanhenevä", titles[0] === "Sammutin" && titles[1] === "Ensiapulaukku", titles.join(","));
  const t = await text();
  check("vanhentunut näkyy", t.includes("Vanhentunut"));
  check("pian vanheneva näkyy päivineen", /Vanhenee .* \(20 pv\)/.test(t));
  check("voimassa näkyy", t.includes("Voimassa") && t.includes("asti"));
  check("yhteenveto", t.includes("1 vanhentunut") && t.includes("1 vanhenee"));
  await page.screenshot({ path: OUT + "/tarkastukset.png", fullPage: true });
  // lomakkeessa kenttä, ja päivän muuttaminen poistaa varoituksen
  await page.click('[data-action="editCheck"][data-id="k1"]'); await page.waitForTimeout(200);
  check("Voimassa asti -kenttä lomakkeessa", await page.locator('#modal [name="expires"]').count() === 1);
  await page.locator('#modal [name="expires"]').evaluate((e, v) => { e.value = v; e.dispatchEvent(new Event("input", { bubbles: true })); }, d(700));
  await page.click('#modal button[type="submit"]'); await page.waitForTimeout(300);
  check("päivä tallentuu", (await db()).checks.k1.expires === d(700));
  check("yhteenveto päivittyy", !(await text()).includes("vanhentunut"));
  // etusivu
  await go(page, "#koti");
  check("etusivulla varoitus", (await text()).includes("Ensiapulaukku: vanhenee"));
};
