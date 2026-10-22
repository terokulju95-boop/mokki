// Tervehdys, uudet teemat, Lisää-ryhmät, kausikuukaudet, tehtäväluokat, siirtymät
export default async ({ page, go, text, check }) => {
  await go(page, "#koti");
  check("vuorokaudenajan tervehdys", /^(Huomenta|Päivää|Iltaa|Hyvää yötä), Tero!/.test((await text()).trim()));
  check("siirtymäanimaatio käytössä", await page.locator("#view.enter").count() === 1);
  await go(page, "#lisaa");
  const groups = await page.locator(".menu-group").allInnerTexts();
  check("Lisää-valikossa ryhmäotsikot", groups.length >= 2, JSON.stringify(groups));
  await go(page, "#ulkoasu");
  for (const k of ["ruska", "kaamos", "kesayo", "saaristo"]) check("teema " + k, await page.locator(`[data-preset="${k}"]`).count() === 1);
  // talvi alkaa vasta joulukuussa → nyt (lokakuu) kevään lista; testi laskee odotetun arvon itse
  await page.selectOption("#tk-seasons-talvi", "12");
  await page.fill("#tk-menu-groups-asetukset", "Ihmiset");
  await page.click('[data-action="themeSave"]'); await page.waitForTimeout(300);
  const m = new Date().getMonth() + 1;
  const expectSpring = m >= 3 && m < 12;
  await go(page, "#koti");
  const t = await text();
  check("kausikuukausi vaikuttaa etusivun listaan", expectSpring ? t.includes("Kevään käyttöönotto") : t.includes("Talviteloille"));
  await go(page, "#lisaa");
  check("ryhmän nimi vaihtui", (await page.locator(".menu-group").allInnerTexts()).some(g => g.toUpperCase() === "IHMISET"));
  // tehtävän luokka
  await go(page, "#tehtavat");
  await page.fill("#todo-new", "Saunan lauteet öljyyn"); await page.press("#todo-new", "Enter"); await page.waitForTimeout(300);
  await page.locator('.item-row:has-text("Saunan lauteet öljyyn") [data-action="editTodo"]').click(); await page.waitForTimeout(200);
  await page.selectOption('#modal [name="category"]', "Sauna");
  await page.click('#modal button[type="submit"]'); await page.waitForTimeout(300);
  check("luokkasuodatin näkyy", await page.locator('[data-action="todoCat"][data-cat="Sauna"]').count() === 1);
  await page.click('[data-action="todoCat"][data-cat="Sauna"]'); await page.waitForTimeout(200);
  const tt = await text();
  check("suodatus luokan mukaan", tt.includes("Saunan lauteet öljyyn") && !tt.includes("Vaihda saunan lauteet") || !tt.includes("Offline-tehtävä"));
};
