// Rivin napautus = tehty, kynä = muokkaa, inventaario → hankittavat
export default async ({ page, go, text, check }) => {
  await go(page, "#koti");
  // Etusivun listat ovat vain luku: ei valintaruutuja, ruksia eikä tilanappeja
  check("etusivulla ei valintaruutuja", await page.locator('.home-grid .check, .home-grid [data-action="toggleCheck"], .home-grid [data-action="toggleTodo"], .home-grid [data-action="toggleShop"], .home-grid [data-action="invStatus"], .home-grid [data-action="delShop"]').count() === 0);
  await page.locator('.home-grid .home-row').first().click(); await page.waitForTimeout(300);
  check("etusivun kausilistan rivi ei kuittaa", !(await text()).includes("1/2"));
  check("rivin napautus avaa Kausi-sivun", page.url().endsWith("#kausi"));
  await page.locator('[data-action="toggleCheck"]').first().click(); await page.waitForTimeout(300);
  await go(page, "#koti");
  check("kuittaus Kausi-sivulla näkyy etusivulla", (await text()).includes("1/2"));
  await go(page, "#tehtavat");
  await page.click('.item-row[data-action="toggleTodo"] .item-title'); await page.waitForTimeout(300);
  check("tehtävä tehdyksi rivin napautuksella", (await page.locator(".item.is-done").count()) === 1);
  check("lomake ei auennut", (await page.locator("#modal.open").count()) === 0);
  await page.click("details.more summary"); await page.click('[data-action="editTodo"]'); await page.waitForTimeout(200);
  check("kynä avaa muokkauksen", (await page.locator("#modal.open").count()) === 1);
  await page.click("[data-mclose]");
  await go(page, "#tavarat"); await page.click('[data-tab="inv"]'); await page.waitForTimeout(200);
  await page.click('[data-action="invStatus"][data-id="i1"]'); await page.waitForTimeout(200);
  await page.click('[data-action="invSetStatus"][data-s="loppu"]'); await page.waitForTimeout(300);
  await page.click('[data-tab="osta"]'); await page.waitForTimeout(200);
  check("loppunut tavara Hankittaviin", (await text()).includes("Kaasupullo"));
  check("Hankittavissa ei ole Vie-nappia", (await page.locator('[data-action="moveShop"]').count()) === 0);
  await go(page, "#koti");
  check("etusivun Hankittavissa ei ole Vie-nappia", (await page.locator('[data-action="moveShop"]').count()) === 0);
  check("etusivun Hankittavissa ei ole poistonappia", (await page.locator('[data-action="delShop"]').count()) === 0);
  await go(page, "#tavarat"); await page.click('[data-tab="osta"]'); await page.waitForTimeout(200);
  check("Tavarat-osiossa poistonappi on", (await page.locator('[data-action="delShop"]').count()) > 0);
};
