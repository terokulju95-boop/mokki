// Käyttötilastot (yöt henkilöittäin) ja värikoodin kirjoitus / "Sama kuin" -kopiointi
export default async ({ page, go, text, check, db, OUT }) => {
  // --- Käyttötilastot ---
  const Y = new Date().getFullYear();
  await go(page, "#varaukset");
  await page.evaluate(async y => {
    const m = JSON.parse(localStorage.getItem("__mockdb"));
    m.bookings = {};
    Object.assign(m.bookings, {
      s1: { who: "Tero", start: `${y}-01-10`, end: `${y}-01-13` },           // 3 yötä
      s2: { who: "Tero", start: `${y}-02-01`, end: `${y}-02-03` },           // 2 yötä
      s3: { who: "Tiina", start: `${y}-03-05`, end: `${y}-03-06` },          // 1 yö
      s4: { who: "Tiina", start: `${y}-04-01`, end: `${y}-04-05`, status: "alustava" }, // 4 alustavaa
      s5: { who: "Timo", start: `${y - 1}-12-30`, end: `${y}-01-02` }        // 2 + 1 yötä vuodenvaihteen yli
    });
    localStorage.setItem("__mockdb", JSON.stringify(m)); localStorage.setItem("mokki_user", "Tero");
  }, Y);
  await page.reload(); await page.waitForTimeout(600);
  await page.click(`[data-action="statYear"][data-year="${Y - 1}"]`).catch(() => {}); await page.waitForTimeout(150);
  let t = await text();
  check("edellisen vuoden tilasto: Timo 2 yötä", /Timo\s+2 yötä/.test(t), t.slice(t.indexOf("Käyttötilastot"), t.indexOf("Käyttötilastot") + 300));
  await page.click(`[data-action="statYear"][data-year="${Y}"]`); await page.waitForTimeout(150);
  t = await text();
  check("Tero 5 yötä ja 2 käyntiä", /Tero\s+5 yötä/.test(t) && t.includes("2 käyntiä"));
  check("Tiina 1 yö ja alustavat erikseen", /Tiina\s+1 yö(\s|$)/.test(t) && t.includes("4 alustavaa"));
  check("vuodenvaihteen yli jakautuu", /Timo\s+1 yö(\s|$)/.test(t));
  await page.locator(".usage").scrollIntoViewIfNeeded(); await page.evaluate(() => window.scrollBy(0, 200));
  await page.screenshot({ path: OUT + "/kayttotilastot.png" });

  // --- Värikoodit ---
  await go(page, "#ulkoasu"); await page.waitForTimeout(300);
  const hex = page.locator('[data-hex="light.primary"]');
  check("värikoodikenttä näkyy", await hex.count() === 1);
  await hex.fill("#1A2B3C"); await page.waitForTimeout(100);
  check("kirjoitettu koodi päivittää värin", (await page.locator("#tk-light-primary").inputValue()) === "#1a2b3c");
  await hex.fill("abc"); await page.waitForTimeout(100);
  check("lyhyt koodi ilman #-merkkiä kelpaa", (await page.locator("#tk-light-primary").inputValue()) === "#aabbcc");
  await hex.fill("rgb(10, 20, 30)"); await page.waitForTimeout(100);
  check("rgb-muoto kelpaa", (await page.locator("#tk-light-primary").inputValue()) === "#0a141e");
  await hex.fill("hölynpöly"); await page.waitForTimeout(100);
  check("virheellinen koodi merkitään eikä muuta väriä", await hex.evaluate(e => e.classList.contains("bad")) && (await page.locator("#tk-light-primary").inputValue()) === "#0a141e");
  await hex.blur(); await page.waitForTimeout(100);
  check("poistuessa palautuu voimassa oleva koodi", (await hex.inputValue()) === "#0a141e");
  await page.selectOption('[data-same="light.accent"]', "light.primary"); await page.waitForTimeout(150);
  check("Sama kuin kopioi värin", (await page.locator("#tk-light-accent").inputValue()) === "#0a141e" && (await page.locator('[data-hex="light.accent"]').inputValue()) === "#0a141e");
  await page.click('[data-action="themeSave"]'); await page.waitForTimeout(300);
  const th = (await db()).app.theme;
  check("värit tallentuvat", th.light.primary === "#0a141e" && th.light.accent === "#0a141e");
  await page.locator(".t-colors").scrollIntoViewIfNeeded();
  await page.screenshot({ path: OUT + "/varikoodit.png" });
};
