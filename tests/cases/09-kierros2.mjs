// Tummat tyylit, rahakentät, kuvien laiska lataus ja siivous, kenttien piilotus, esikatselu toisena käyttäjänä
export default async ({ page, go, text, check, db, OUT }) => {
  // 58 tummat tyylit
  await go(page, "#ulkoasu"); await page.waitForTimeout(300);
  await page.click('[data-action="themeDarkStyle"][data-v="soft"]'); await page.waitForTimeout(150);
  check("pehmeä tumma asetettu", (await page.locator("#tk-dark-bg").inputValue()) === "#1b1e23");
  await page.click('[data-action="themeDarkStyle"][data-v="oled"]'); await page.waitForTimeout(150);
  check("OLED-musta asetettu", (await page.locator("#tk-dark-bg").inputValue()) === "#000000");
  // 169 kenttien piilotus: nuohouksesta pois tekijä ja muistiinpanot
  await page.click('[data-action="fieldsForm"][data-f="nuohous"]'); await page.waitForTimeout(150);
  await page.uncheck("#tk-fields-nuohous-doer"); await page.uncheck("#tk-fields-nuohous-notes");
  check("pakollinen kenttä lukittu", await page.locator('.fld-check input[disabled]').count() >= 1);
  await page.click('[data-action="themeSave"]'); await page.waitForTimeout(300);
  check("piilotus tallentui", JSON.stringify((await db()).app.theme.fields) === JSON.stringify({ nuohous: { doer: true, notes: true } }));
  await go(page, "#huolto");
  await page.click('[data-tab="nuohous"]'); await page.waitForTimeout(150);
  await page.click('[data-action="addLog"][data-type="nuohous"]'); await page.waitForTimeout(200);
  check("piilotettu kenttä ei näy lomakkeessa", (await page.locator('#modal [name="doer"]').count()) === 0 && (await page.locator('#modal [name="notes"]').count()) === 0);
  check("muut kentät näkyvät", (await page.locator('#modal [name="date"]').count()) === 1 && (await page.locator('#modal [name="cost"]').count()) === 1);
  // 81 rahakenttä
  check("rahakentässä €-merkki", (await page.locator("#modal .money i").count()) >= 1);
  await page.check('#modal [name="chimneys"][value="sauna"]');
  await page.fill('#modal [name="cost"]', "1250"); await page.locator('#modal [name="cost"]').blur();
  check("summa muotoiltu", (await page.locator('#modal [name="cost"]').inputValue()).replace(/\s/g, " ") === "1 250,00", await page.locator('#modal [name="cost"]').inputValue());
  await page.click('#modal button[type="submit"]'); await page.waitForTimeout(300);
  check("muotoiltu summa tallentuu numerona", Object.values((await db()).logs).some(l => l.type === "nuohous" && l.cost === 1250));
  // 182 laiska lataus: kuvia ei ladata etukäteen
  check("kuvat eivät lataudu etukäteen", await page.evaluate(async () => (await import("/js/core.js")).photoCache.size) <= 1);
  await go(page, "#huoltotyot"); await page.click('[data-tab="tyot"]'); await page.waitForTimeout(500);
  check("näkyvä kuva latautuu", await page.locator('img[data-photo="ph1"][src^="data:"]').count() === 1);
  await go(page, "#profiili");
  check("kuva-asetus profiilissa", (await text()).toUpperCase().includes("KUVAT TÄLLÄ LAITTEELLA"));
  // varmuuskopio hakee kaikki kuvat, vaikka laitteelle ei ole ladattu niitä
  await go(page, "#yllapito");
  const fs = await import("fs");
  const [dl] = await Promise.all([page.waitForEvent("download"), page.click('[data-action="backupDownload"]')]);
  const bk = JSON.parse(fs.readFileSync(await dl.path(), "utf8"));
  check("varmuuskopiossa kaikki kuvat", !!bk.photos?.ph1 && !!bk.photos?.ph2);
  // 175 kuvien siivous
  await go(page, "#yllapito");
  await page.click('[data-action="photoScan"]'); await page.waitForTimeout(600);
  const t = await text();
  check("kuvat tarkistettu", t.toUpperCase().includes("KÄYTTÄMÄTTÖMIÄ") && t.includes("Ei käytössä missään"));
  await page.click('[data-action="photoDelUnused"]'); await page.waitForTimeout(500);
  const ph = (await db()).photos;
  check("käyttämätön kuva poistettu, käytössä oleva jäi", !ph.ph2 && !!ph.ph1);
  await page.screenshot({ path: OUT + "/kuvat.png", fullPage: true });
  // 166 esikatselu toisena käyttäjänä
  await go(page, "#kayttajat");
  await page.click('[data-action="previewAs"][data-name="Timo"]'); await page.waitForTimeout(400);
  check("esikatselupalkki", (await page.locator("#preview-banner").innerText()).includes("Timo"));
  check("näkymä Timon silmin (ei muokkausnappia)", (await page.locator('[data-action="homeEdit"]').count()) === 0 && (await text()).includes("Timo!"));
  await page.screenshot({ path: OUT + "/esikatselu.png" });
  const before = Object.keys((await db()).todos).length;
  await go(page, "#tehtavat");
  await page.fill("#todo-new", "Ei pitäisi tallentua"); await page.press("#todo-new", "Enter"); await page.waitForTimeout(300);
  check("esikatselussa ei voi tallentaa", Object.keys((await db()).todos).length === before);
  await page.click('[data-action="previewStop"]'); await page.waitForTimeout(400);
  check("esikatselu päättyi, admin takaisin", (await page.locator("#preview-banner").count()) === 0 && (await text()).includes("Käyttäjät ja PIN") || (await text()).includes("👑"));
};
