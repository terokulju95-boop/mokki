// Teemaversiot ja omat teemat, sovelluksen kuvake, korttien raahaus
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
export default async ({ page, go, text, check, db }) => {
  await go(page, "#ulkoasu"); await page.waitForTimeout(300);
  check("versiot-osio", (await text()).includes("Versiot ja omat teemat"));
  check("aiempia versioita (testi 03 tallensi)", (await page.locator('[data-action="themeLoad"][data-src="history"]').count()) >= 1);
  await page.click('[data-action="themeSaveNamed"]'); await page.waitForTimeout(300);
  check("oma teema tallennettu", (await text()).includes("Oma teema"));
  await page.click('[data-preset="ruska"]'); await page.waitForTimeout(100);
  await page.click('[data-action="themeLoad"][data-src="saved"]'); await page.waitForTimeout(200);
  check("oma teema ladattiin esikatseluun", (await page.locator("#tk-light-primary").inputValue()) !== "#a33f1f");
  if (await page.locator('[data-action="themeUndo"]').isEnabled()) await page.click('[data-action="themeUndo"]');
  // kuvake
  const icon = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "icons", "icon-512.png");
  await page.setInputFiles("#icon-file", icon); await page.waitForTimeout(1200);
  const d = await db();
  check("kuvake tallennettu", !!d.app?.icon?.i192?.startsWith("data:image"));
  check("kuvake käytössä sivulla", (await page.locator('link[rel="apple-touch-icon"]').getAttribute("href")).startsWith("data:image"));
  check("manifesti päivitetty", (await page.locator('link[rel="manifest"]').getAttribute("href")).startsWith("blob:"));
  // raahaus
  await go(page, "#koti");
  await page.click('[data-action="homeEdit"]'); await page.waitForTimeout(300);
  const before = await page.locator(".he").evaluateAll(els => els.map(e => e.dataset.key));
  await page.locator(".he").nth(0).evaluate(e => e.scrollIntoView({ block: "center" })); await page.waitForTimeout(150);
  const src = page.locator(".he").nth(0).locator(".he-drag"), dst = page.locator(".he").nth(1);
  const a = await src.boundingBox(), b = await dst.boundingBox();
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await page.mouse.down();
  for (let i = 1; i <= 12; i++) { await page.mouse.move(a.x + a.width / 2, a.y + (b.y + b.height * 0.6 - a.y) * i / 12); }
  await page.mouse.up(); await page.waitForTimeout(300);
  const after = await page.locator(".he").evaluateAll(els => els.map(e => e.dataset.key));
  check("raahaus muutti järjestystä", after[0] !== before[0] && after.includes(before[0]), JSON.stringify([before.slice(0, 4), after.slice(0, 4)]));
  await page.click('[data-action="homeCancel"]'); await page.waitForTimeout(200);
};
