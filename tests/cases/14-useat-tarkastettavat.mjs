// Useita samanlaisia tarkastettavia (esim. sammuttimet) ja määrä samaan kirjaukseen
export default async ({ page, go, text, check, db, OUT }) => {
  const d = n => { const x = new Date(Date.now() + n * 864e5); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`; };
  await go(page, "#huoltotyot");
  await page.evaluate(() => { const m = JSON.parse(localStorage.getItem("__mockdb")); m.checks = {}; localStorage.setItem("__mockdb", JSON.stringify(m)); localStorage.setItem("mokki_user", "Tero"); });
  await page.reload(); await page.waitForTimeout(600);
  await page.click('[data-tab="tarkastukset"]'); await page.waitForTimeout(200);
  const setDate = async v => page.locator('#modal [name="expires"]').evaluate((e, v) => { e.value = v; e.dispatchEvent(new Event("input", { bubbles: true })); }, v);
  // 1. kirjaus: 3 sammutinta samalla päivällä
  await page.click('[data-action="addCheck"][data-name="Sammutin"]'); await page.waitForTimeout(200);
  check("määräkenttä lomakkeessa", await page.locator('#modal [name="qty"]').count() === 1);
  await page.fill('#modal [name="qty"]', "3"); await page.fill('#modal [name="location"]', "Keittiö, sauna, aitta"); await page.fill('#modal [name="notes"]', "Painemittari vihreällä");
  await setDate(d(-5));
  await page.click('#modal button[type="submit"]'); await page.waitForTimeout(300);
  check("Sammutin-ehdotus näkyy edelleen", await page.locator('[data-action="addCheck"][data-name="Sammutin"]').count() === 1);
  // 2. kirjaus: toinen sammutin eri päivällä, ohje kopioituu pohjaksi
  await page.click('[data-action="addCheck"][data-name="Sammutin"]'); await page.waitForTimeout(200);
  check("ohje kopioituu samannimisestä", (await page.locator('#modal [name="notes"]').inputValue()) === "Painemittari vihreällä");
  await page.fill('#modal [name="qty"]', ""); await page.fill('#modal [name="location"]', "Rantasauna");
  await setDate(d(500));
  await page.click('#modal button[type="submit"]'); await page.waitForTimeout(300);
  const cs = Object.values((await db()).checks).filter(c => c.name === "Sammutin");
  check("kaksi sammutinkirjausta", cs.length === 2 && cs.some(c => c.qty === 3) && cs.some(c => c.qty === null));
  const t = await text();
  check("määrä näkyy otsikossa", t.includes("× 3"));
  check("yhteenveto laskee kappaleet", t.includes("3 vanhentunut"));
  await page.screenshot({ path: OUT + "/useat-sammuttimet.png", fullPage: true });
  await go(page, "#koti");
  check("etusivun varoituksessa määrä", (await text()).includes("Sammutin × 3: vanhentunut"));
};
