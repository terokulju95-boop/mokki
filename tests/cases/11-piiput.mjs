// Nuohous: saunan ja mökin piippu erikseen tai samassa kirjauksessa
export default async ({ page, go, text, check, db, OUT }) => {
  await go(page, "#huolto");
  await page.click('[data-tab="nuohous"]'); await page.waitForTimeout(150);
  await page.click('[data-action="addLog"][data-type="nuohous"]'); await page.waitForTimeout(200);
  check("piippuvalinnat lomakkeessa", (await page.locator('#modal [name="chimneys"]').count()) === 2);
  const before = Object.keys((await db()).logs).length;
  await page.click('#modal button[type="submit"]'); await page.waitForTimeout(250);
  check("ilman piippua ei tallennu", Object.keys((await db()).logs).length === before && await page.locator("#modal.open").count() === 1);
  await page.check('#modal [name="chimneys"][value="sauna"]');
  await page.check('#modal [name="chimneys"][value="mokki"]');
  await page.click('#modal button[type="submit"]'); await page.waitForTimeout(300);
  check("molemmat piiput samaan kirjaukseen", Object.values((await db()).logs).some(l => l.type === "nuohous" && JSON.stringify(l.chimneys) === '["sauna","mokki"]'));
  const t = await text();
  check("yhteenveto näyttää molemmat piiput", t.includes("Saunan piippu") && t.includes("Mökin piippu"));
  check("kortin otsikko", t.includes("Nuohous: saunan ja mökin piippu"));
  // vain mökin piippu
  await page.click('[data-action="addLog"][data-type="nuohous"]'); await page.waitForTimeout(200);
  await page.check('#modal [name="chimneys"][value="mokki"]');
  await page.click('#modal button[type="submit"]'); await page.waitForTimeout(300);
  check("vain mökin piippu", Object.values((await db()).logs).some(l => l.type === "nuohous" && JSON.stringify(l.chimneys) === '["mokki"]'));
  await go(page, "#koti");
  await page.screenshot({ path: OUT + "/piiput-koti.png", fullPage: true });
  const h = await text();
  check("etusivulla sauna ja mökki erikseen", /Sauna/.test(h) && /Mökki/.test(h));
  await go(page, "#huolto"); await page.screenshot({ path: OUT + "/piiput-huolto.png", fullPage: true });
};
