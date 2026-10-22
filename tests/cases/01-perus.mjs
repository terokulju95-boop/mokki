// Perusnäkymät, etusivu, 112 poistettu, nuohous ilman aikataulua
export default async ({ page, go, text, check }) => {
  await go(page, "#koti");
  const t = await text();
  check("etusivu latautuu", t.includes(", Tero!"));
  check("ei soita 112 -linkkiä", (await page.locator('a[href^="tel:112"]').count()) === 0);
  check("osoitekortti näkyy", t.includes("Rantatie 5"));
  check("talven kausilista etusivulla 0/2 (viime vuoden ruksit eivät lasku)", t.includes("0/2"));
  check("huoltotyöt-kortti", t.includes("Kiukaan kivet"));
  check("inventaario-kortti", t.toUpperCase().includes("INVENTAARIO"));
  await go(page, "#huolto");
  check("nuohous: ei seuraavaa aikaa", !(await text()).includes("Seuraava"));
  check("nuohous ja puut -välilehdet", (await page.locator(".seg button").count()) === 2);
  await go(page, "#huoltotyot");
  check("huoltotyöt-osio", (await text()).includes("Kiukaan kivet"));
};
