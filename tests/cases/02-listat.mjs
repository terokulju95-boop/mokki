// Rivin napautus = tehty, kynä = muokkaa, inventaario → hankittavat
export default async ({ page, go, text, check }) => {
  await go(page, "#koti");
  await page.locator('.home-grid [data-action="toggleCheck"]').first().click(); await page.waitForTimeout(300);
  check("kausilistan kuittaus etusivulta", (await text()).includes("1/2"));
  await go(page, "#tehtavat");
  await page.click('.item-row[data-action="toggleTodo"] .item-title'); await page.waitForTimeout(300);
  check("tehtävä tehdyksi rivin napautuksella", (await page.locator(".item.is-done").count()) === 1);
  check("lomake ei auennut", (await page.locator("#modal.open").count()) === 0);
  await page.click("details.more summary"); await page.click('[data-action="editTodo"]'); await page.waitForTimeout(200);
  check("kynä avaa muokkauksen", (await page.locator("#modal.open").count()) === 1);
  await page.click("[data-mclose]");
  await go(page, "#tavarat"); await page.click('[data-tab="inv"]'); await page.waitForTimeout(200);
  await page.click('[data-action="invStatus"][data-id="i1"]'); await page.waitForTimeout(100);
  await page.click('[data-action="invStatus"][data-id="i1"]'); await page.waitForTimeout(300);
  await page.click('[data-tab="osta"]'); await page.waitForTimeout(200);
  check("loppunut tavara Hankittaviin", (await text()).includes("Kaasupullo"));
  await page.click('[data-action="moveShop"]'); await page.waitForTimeout(300);
  await page.click('[data-tab="vie"]'); await page.waitForTimeout(200);
  check("siirto Vie mukana -listalle", (await text()).includes("Kaasupullo"));
};
