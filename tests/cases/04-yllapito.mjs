// Varmuuskopio ja palautus, tietokannan koko, arkistointi, offline-tila, päivitysilmoitus
import fs from "fs";
export default async ({ page, go, text, check, db }) => {
  await go(page, "#lisaa");
  check("Ylläpito Lisää-valikossa", (await text()).includes("Ylläpito"));
  await go(page, "#yllapito");
  let t = await text();
  check("tietokannan koko näkyy", t.includes("ilmainen raja"));
  check("varmuuskopiota ei vielä otettu", t.includes("Ei vielä otettu"));
  const [dl] = await Promise.all([page.waitForEvent("download"), page.click('[data-action="backupDownload"]')]);
  const file = await dl.path();
  const backup = JSON.parse(fs.readFileSync(file, "utf8"));
  check("varmuuskopio sisältää tiedot", backup.app === "mokki" && Object.keys(backup.collections.logs).length >= 3);
  await page.waitForTimeout(300);
  check("viimeisin varmuuskopio päivittyi", !(await text()).includes("Ei vielä otettu"));
  // poistetaan huoltokirjaus ja palautetaan
  await page.evaluate(async () => { const m = await import("/js/core.js"); m.remove("logs", "l3"); });
  await page.waitForTimeout(300);
  check("kirjaus poistettu ennen palautusta", !(await db()).logs.l3);
  await page.setInputFiles("#bk-file", file); await page.waitForTimeout(800);
  check("palautus toi kirjauksen takaisin", !!(await db()).logs.l3);
  // arkistointi: vanha tehty tehtävä
  await page.evaluate(async () => { const m = await import("/js/core.js"); m.save("todos", { text: "Vanha juttu", done: true, doneAt: "2020-01-01T10:00:00Z", doneByName: "Tero" }); });
  await go(page, "#yllapito");
  await page.click('[data-action="archiveRun"]'); await page.waitForTimeout(500);
  const d = await db();
  check("vanha tehtävä arkistoitu", Object.values(d.archive || {}).some(a => a.data?.text === "Vanha juttu") && !Object.values(d.todos).some(x => x.text === "Vanha juttu"));
  await go(page, "#yllapito");
  await page.click('[data-action="archiveShow"]'); await page.waitForTimeout(200);
  await page.click("[data-arch-restore]"); await page.waitForTimeout(400);
  check("arkistosta palautus", Object.values((await db()).todos).some(x => x.text === "Vanha juttu"));
  await page.click("[data-mclose]");
  // offline: muutos odottaa
  await go(page, "#tehtavat");
  await page.evaluate(() => { window.__mockOffline = true; });
  await page.context().setOffline(true); await page.waitForTimeout(100);
  await page.fill("#todo-new", "Offline-tehtävä"); await page.press("#todo-new", "Enter"); await page.waitForTimeout(400);
  const net = await page.locator("#netstatus").innerText();
  check("offline: odottava muutos näkyy", net.includes("1 muutos odottaa"), net);
  await page.context().setOffline(false);
  await page.evaluate(() => window.__mockOnline()); await page.waitForTimeout(400);
  check("online: palkki piiloutuu", await page.locator("#netstatus").isHidden());
  check("online: vahvistus", (await page.locator("#toast").innerText()).includes("tallennettu"));
  // päivitysilmoitus
  await page.evaluate(async () => (await import("/js/main.js")).showUpdateBanner());
  check("päivitysilmoitus näkyy", await page.locator("#update-banner").isVisible());
  await page.evaluate(() => document.getElementById("update-banner").remove());
};
