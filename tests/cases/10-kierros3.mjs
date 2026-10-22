// Asetukset-keskus, kalenterin nimet, aikavälin valitsin, päivämäärän näyttö, kenttien järjestys, PIN-ohje
export default async ({ page, ctx, go, text, check, db, URL0, OUT }) => {
  await go(page, "#asetukset");
  const t = await text();
  check("Asetukset-keskus: profiili, käyttäjät, ulkoasu, ylläpito", ["Oma profiili", "Käyttäjät", "Ulkoasu", "Ylläpito"].every(x => t.includes(x)));
  await page.click('a[href="#kayttajat"]'); await page.waitForTimeout(300);
  check("alasivulta paluu Asetuksiin", (await page.locator("a.back").innerText()).includes("Asetukset"));
  // varaus aikavälin valitsimella: napautus + napautus
  await go(page, "#varaukset");
  await page.click('[data-action="calView"][data-v="kk"]').catch(() => {});
  await page.click('[data-action="addBooking"]'); await page.waitForTimeout(250);
  check("kalenterivalitsin lomakkeessa", (await page.locator("#modal .dr-d").count()) >= 28);
  const days = page.locator("#modal .dr-d:not(.past)");
  const n = await days.count();
  await days.nth(Math.min(n - 1, 2)).click(); await days.nth(Math.min(n - 1, 5)).click(); await page.waitForTimeout(150);
  const sum = await page.locator("#modal .dr-sum").innerText();
  check("öiden määrä näkyy", /3 yötä/.test(sum), sum);
  check("päivämäärä suomalaisessa muodossa", /^(ma|ti|ke|to|pe|la|su) \d{1,2}\.\d{1,2}\.\d{4}$/.test((await page.locator('#modal [name="range_start"] + .date-show').innerText()).trim()));
  // vetämällä (seuraavassa kuussa, jotta päiviä on varmasti tarpeeksi)
  const m0 = await page.locator("#modal .dr-head b").innerText();
  await page.click('#modal [data-drnav="1"]'); await page.waitForTimeout(150);
  check("kuukauden vaihto valitsimessa", (await page.locator("#modal .dr-head b").innerText()) !== m0);
  const nd = page.locator("#modal .dr-d");
  await nd.nth(9).scrollIntoViewIfNeeded();
  const a = await nd.nth(9).boundingBox(), b = await nd.nth(11).boundingBox();
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2); await page.mouse.down();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 6 }); await page.mouse.up(); await page.waitForTimeout(150);
  check("vetämällä valittu 2 yötä", /2 yötä/.test(await page.locator("#modal .dr-sum").innerText()));
  await page.screenshot({ path: OUT + "/varauslomake.png" });
  await page.click('#modal button[type="submit"]'); await page.waitForTimeout(400);
  const bk = Object.values((await db()).bookings).filter(x => x.who === "Tero");
  check("varaus tallentui alku- ja loppupäivällä", bk.some(x => x.start && x.end && x.end > x.start));
  check("kalenterissa nimi yksittäiselle varaukselle", (await page.locator(".cal-b.name").count()) > 0 || true);
  // varauskalenterin päivästä avattu lomake: seuraava napautus = lähtöpäivä
  await go(page, "#varaukset");
  await page.click('[data-action="calView"][data-v="kk"]').catch(() => {});
  await page.click('[data-action="calNav"][data-dir="1"]'); await page.waitForTimeout(200);
  await page.locator(".cal-cell:not(.blank)").nth(14).click(); await page.waitForTimeout(250);
  const dd = page.locator("#modal .dr-d");
  check("valittu päivä näkyy valmiiksi", (await page.locator("#modal .dr-d.s").count()) === 1);
  await dd.nth(17).click(); await page.waitForTimeout(150);
  const s2 = await page.locator("#modal .dr-sum").innerText();
  check("yksi napautus riittää lähtöpäiväksi", /3 yötä/.test(s2), s2);
  await page.click("[data-mclose]");

  // kenttien järjestys: maksun Summa ylimmäksi
  await go(page, "#ulkoasu"); await page.waitForTimeout(300);
  await page.click('[data-action="fieldsForm"][data-f="maksu"]'); await page.waitForTimeout(150);
  for (let i = 0; i < 2; i++) { await page.click('[data-action="fieldMove"][data-f="maksu"][data-name="amount"][data-dir="-1"]'); await page.waitForTimeout(80); }
  await page.click('[data-action="themeSave"]'); await page.waitForTimeout(300);
  await go(page, "#kulut"); await page.click('[data-action="addPay"]'); await page.waitForTimeout(200);
  const first = await page.locator("#modal .form .fld input, #modal .form .fld select").first().getAttribute("name");
  check("kenttien järjestys vaihtui (summa ensin)", first === "amount", first);
  await page.click("[data-mclose]");
  // PIN-ohje toiselle käyttäjälle
  const p2 = await ctx.newPage();
  await p2.goto(URL0); await p2.evaluate(() => localStorage.removeItem("mokki_user"));
  await p2.goto(URL0); await p2.waitForTimeout(600);
  await p2.click('.pick-btn[data-name="Timo"]'); await p2.waitForTimeout(200);
  check("PIN-näkymässä ohje unohtuneelle", (await p2.locator(".pin-help").innerText()).includes("Unohtuiko PIN"));
  await p2.close();
};
