// Varauksen tila, henkilömäärä, päällekkäisyys, viikko- ja vuosinäkymä
export default async ({ page, go, text, check, OUT }) => {
  await go(page, "#varaukset");
  await page.click('[data-action="addBooking"]'); await page.waitForTimeout(200);
  const ds = new Date(Date.now() + 6 * 864e5); const iso = `${ds.getFullYear()}-${String(ds.getMonth() + 1).padStart(2, "0")}-${String(ds.getDate()).padStart(2, "0")}`;
  const de = new Date(Date.now() + 9 * 864e5); const iso2 = `${de.getFullYear()}-${String(de.getMonth() + 1).padStart(2, "0")}-${String(de.getDate()).padStart(2, "0")}`;
  await page.fill('#modal [name="start"]', iso); await page.fill('#modal [name="end"]', iso2);
  await page.selectOption('#modal [name="status"]', "alustava");
  await page.fill('#modal [name="people"]', "4");
  await page.fill('#modal [name="guests"]', "Liisa ja lapset");
  await page.click('#modal button[type="submit"]'); await page.waitForTimeout(400);
  const t = await text();
  check("alustava-merkki", t.includes("Alustava"));
  check("henkilömäärä", t.includes("👥 4"));
  check("vieraat", t.includes("Liisa ja lapset"));
  check("päällekkäisyys merkitty listaan", t.includes("Päällekkäin"));
  const ym = iso.slice(0, 7), cur = new Date().toISOString().slice(0, 7);
  if (ym !== cur) { await page.click('[data-action="calNav"][data-dir="1"]'); await page.waitForTimeout(200); }
  check("päällekkäinen päivä korostettu kalenterissa", await page.locator(".cal-cell.clash").count() > 0);
  check("alustava raidoitettu", await page.locator(".cal-b.tent").count() > 0);
  await page.click('[data-action="calView"][data-v="vk"]'); await page.waitForTimeout(200);
  check("viikkonäkymä", await page.locator(".week-day").count() === 7);
  await page.click('[data-action="calNav"][data-dir="1"]'); await page.waitForTimeout(200);
  check("viikkonäkymässä varaus", (await page.locator(".week").innerText()).includes("Tero"));
  await page.screenshot({ path: OUT + "/varaukset-viikko.png" });
  await page.click('[data-action="calView"][data-v="v"]'); await page.waitForTimeout(200);
  check("vuosinäkymä 12 kuukautta", await page.locator(".ym").count() === 12);
  check("vuosinäkymän yöt per henkilö", (await page.locator(".year-legend").innerText()).includes("yötä"));
  await page.screenshot({ path: OUT + "/varaukset-vuosi.png" });
  await page.locator(".ym").nth(new Date().getMonth()).click(); await page.waitForTimeout(200);
  check("kuukauden avaus vuosinäkymästä", await page.locator(".cal-grid").count() === 1);
};
