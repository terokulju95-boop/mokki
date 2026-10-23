import { $, parseYmd, ymd, MONTHS, PLACE_SUGGESTIONS, S, chip, colorFor, daysBetween, details, empty, esc, eur, fmtDate, fmtShort, getInfo, initials, list, nl2br, num, pad, secH, thumbs, today } from "../core.js";
import { backLink } from "../theme.js";

// ---------- Perustiedot ----------
export const INFO_FIELDS = [
  { type: "heading", label: "Mökki" },
  { name: "name", label: "Mökin nimi", placeholder: "esim. Rantamökki" },
  { name: "address", label: "Katuosoite" },
  { name: "municipality", label: "Postinumero ja -toimipaikka / kunta" },
  { name: "rescueAddress", label: "Pelastustieosoite (jos eri kuin katuosoite)" },
  { name: "coords", label: "Koordinaatit", placeholder: "esim. 60.4521, 25.1043" },
  { name: "propertyId", label: "Kiinteistötunnus", placeholder: "esim. 505-401-3-45" },
  { name: "directions", label: "Ajo-ohje perille", type: "textarea" },
  { type: "heading", label: "Avaimet ja koodit" },
  { name: "keys", label: "Avainten säilytys", type: "textarea", rows: 2 },
  { name: "wifiName", label: "Wifi-verkko" },
  { name: "wifiPass", label: "Wifi-salasana" },
  { name: "alarmCode", label: "Hälytin- tai lukkokoodi" },
  { type: "heading", label: "Muuta" },
  { name: "other", label: "Muuta tärkeää", type: "textarea" }
];
export function vPerustiedot() {
  const i = getInfo();
  const row = (l, v) => v ? `<div class="dl-row"><dt>${l}</dt><dd>${v}</dd></div>` : "";
  const mapQ = i.coords || [i.address, i.municipality].filter(Boolean).join(", ");
  let h = backLink();
  h += `<div class="card"><div class="card-label row-between"><span>Mökki</span><button class="link-btn" data-action="editInfo">Muokkaa</button></div>
    <dl class="dl">
      ${row("Nimi", esc(i.name))}
      ${row("Osoite", esc([i.address, i.municipality].filter(Boolean).join(", ")))}
      ${row("Pelastustieosoite", esc(i.rescueAddress))}
      ${row("Koordinaatit", esc(i.coords))}
      ${row("Kiinteistötunnus", esc(i.propertyId))}
      ${row("Ajo-ohje", nl2br(i.directions))}
    </dl>
    ${!i.address && !i.name ? '<p class="muted">Tietoja ei ole vielä lisätty.</p>' : ""}
    ${mapQ ? `<a class="btn small" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQ)}">Avaa kartalla</a>` : ""}
  </div>`;
  if (i.keys || i.wifiName || i.wifiPass || i.alarmCode || i.other) {
    h += `<div class="card"><div class="card-label">Avaimet, koodit ja muuta</div><dl class="dl">
      ${row("Avaimet", nl2br(i.keys))}${row("Wifi", esc(i.wifiName))}${row("Wifi-salasana", esc(i.wifiPass))}${row("Koodi", esc(i.alarmCode))}${row("Muuta", nl2br(i.other))}
    </dl></div>`;
  }

  const places = list("places").sort((a, b) => a.title.localeCompare(b.title, "fi"));
  h += secH("Tärkeät paikat ja ohjeet", `<button class="link-btn" data-action="addPlace">+ Lisää</button>`);
  h += `<p class="form-note">Kuvat ja ohjeet, jotka on hyvä löytää mökillä: sähkökaappi, venttiilit, kaivo… Kuvat toimivat myös ilman verkkoa.</p>`;
  h += places.length ? places.map(p => `<div class="card log" data-action="editPlace" data-id="${p.id}"><div class="log-title">${esc(p.title)}</div>${p.description ? `<p class="notes">${nl2br(p.description)}</p>` : ""}${thumbs(p.photos)}<div class="by">${esc(p.updatedByName || p.createdByName)}</div></div>`).join("") : "";
  const missing = PLACE_SUGGESTIONS.filter(s => !places.some(p => p.title.toLowerCase() === s.toLowerCase()));
  if (missing.length) h += `<div class="chips">${missing.map(s => `<button class="chip-btn" data-action="addPlace" data-title="${esc(s)}">+ ${esc(s)}</button>`).join("")}</div>`;

  const contacts = list("contacts").sort((a, b) => (a.role || "").localeCompare(b.role || "", "fi") || a.name.localeCompare(b.name, "fi"));
  h += secH("Yhteystiedot", `<button class="link-btn" data-action="addContact">+ Lisää</button>`);
  h += contacts.length ? `<div class="list">${contacts.map(c => `<div class="item"><div class="item-row"><div class="item-main" data-action="editContact" data-id="${c.id}"><div class="item-title">${esc(c.name)}</div><div class="by">${esc([c.role, c.email].filter(Boolean).join(" · "))}${c.notes ? "<br>" + esc(c.notes) : ""}</div></div>${c.phone ? `<a class="btn small" href="tel:${esc(c.phone.replace(/\s/g, ""))}">📞 Soita</a>` : ""}</div></div>`).join("")}</div>` : empty("Lisää esim. nuohooja, puunmyyjä, naapuri ja sähkömies.");
  return h;
}

// ---------- Varauskalenteri ----------
// Varauksen tila (109), henkilömäärä ja vieraat (110), päällekkäisyydet (111), viikko- ja vuosinäkymä (112)
const bEnd = b => b.end || b.start;
const isTent = b => b.status === "alustava";
const onDay = (bks, ds) => bks.filter(b => b.start <= ds && bEnd(b) >= ds);
export const clashesOf = (b, bks = list("bookings")) => bks.filter(x => x.id !== b.id && x.start <= bEnd(b) && bEnd(x) >= b.start);
const WD = ["ma", "ti", "ke", "to", "pe", "la", "su"];
const cap = s => s[0].toUpperCase() + s.slice(1);
const mondayOf = ds => { const d = parseYmd(ds); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return ymd(d); };
const addDays = (ds, n) => { const d = parseYmd(ds); d.setDate(d.getDate() + n); return ymd(d); };

function bookingChips(b, withClash = true) {
  const c = [];
  if (isTent(b)) c.push(chip("Alustava", "warn"));
  if (b.people) c.push(chip("👥 " + esc(b.people)));
  if (withClash && clashesOf(b).length) c.push(chip("⚠ Päällekkäin", "bad"));
  return c.join("");
}
export function bookingLine(b) {
  const range = b.end && b.end !== b.start ? `${fmtShort(b.start)}–${fmtDate(b.end)}` : fmtDate(b.start);
  return `<div class="line ${isTent(b) ? "tentative-line" : ""}"><span><i class="dot ${isTent(b) ? "tent" : ""}" style="--c:${colorFor(b.who)};background:${colorFor(b.who)}"></i>${esc(b.who)}${isTent(b) ? ' <span class="muted small">(alustava)</span>' : ""}</span><span class="muted">${range}</span></div>`;
}
// Yksi varaus päivällä → koko nimi (katkaistaan tarvittaessa), useampi → nimikirjaimet
function calChip(b, full = false) {
  return `<span class="cal-b ${isTent(b) ? "tent" : ""} ${full ? "name" : ""}" style="--c:${colorFor(b.who)}" title="${esc(b.who)}">${esc(full ? b.who : initials(b.who))}</span>`;
}
export function vVaraukset() {
  const t = today();
  const view = S.calView || "kk";
  const bks = list("bookings");
  let h = backLink() + `<div class="seg">${[["vk", "Viikko"], ["kk", "Kuukausi"], ["v", "Vuosi"]].map(([k, l]) => `<button data-action="calView" data-v="${k}" class="${k === view ? "on" : ""}">${l}</button>`).join("")}</div>`;

  if (view === "vk") {
    const mon = S.calWeek || mondayOf(t);
    const sun = addDays(mon, 6);
    const wk = Math.ceil(((parseYmd(mon) - new Date(parseYmd(mon).getFullYear(), 0, 1)) / 864e5 + new Date(parseYmd(mon).getFullYear(), 0, 1).getDay() + 1) / 7);
    h += `<div class="card cal"><div class="cal-head"><button class="icon-btn" data-action="calNav" data-dir="-1" aria-label="Edellinen viikko">‹</button><b>Viikko ${wk} · ${fmtShort(mon)}–${fmtDate(sun)}</b><button class="icon-btn" data-action="calNav" data-dir="1" aria-label="Seuraava viikko">›</button></div>
      <div class="week">${[0, 1, 2, 3, 4, 5, 6].map(i => {
        const ds = addDays(mon, i), bs = onDay(bks, ds);
        return `<button class="week-day ${ds === t ? "today" : ""} ${ds < t ? "past" : ""} ${bs.length > 1 ? "clash" : ""}" data-action="calDay" data-date="${ds}">
          <span class="week-d"><b>${WD[i]}</b> ${parseYmd(ds).getDate()}.${parseYmd(ds).getMonth() + 1}.</span>
          <span class="week-bs">${bs.length ? bs.map(b => `<span class="week-b ${isTent(b) ? "tent" : ""}" style="--c:${colorFor(b.who)}">${esc(b.who)}${b.people ? ` · ${esc(b.people)} hlö` : ""}${isTent(b) ? " · alustava" : ""}</span>`).join("") : '<span class="muted small">vapaa</span>'}</span>
          ${bs.length > 1 ? '<span class="clash-ic" title="Päällekkäiset varaukset">⚠</span>' : ""}</button>`;
      }).join("")}</div></div>`;
  } else if (view === "v") {
    const Y = S.calYear || Number(t.slice(0, 4));
    const nights = {};
    // Yöt per henkilö valittuna vuonna (saapumispäivästä lähtöpäivää edeltävään yöhön)
    bks.forEach(b => { for (let ds = b.start; ds < bEnd(b); ds = addDays(ds, 1)) if (ds.startsWith(String(Y))) nights[b.who] = (nights[b.who] || 0) + 1; });
    h += `<div class="card cal"><div class="cal-head"><button class="icon-btn" data-action="calNav" data-dir="-1" aria-label="Edellinen vuosi">‹</button><b>${Y}</b><button class="icon-btn" data-action="calNav" data-dir="1" aria-label="Seuraava vuosi">›</button></div>
      <div class="year">${MONTHS.map((mn, mi) => {
        const off = (new Date(Y, mi, 1).getDay() + 6) % 7, dim = new Date(Y, mi + 1, 0).getDate();
        let cells = "";
        for (let i = 0; i < off; i++) cells += "<i></i>";
        for (let d = 1; d <= dim; d++) {
          const ds = `${Y}-${pad(mi + 1)}-${pad(d)}`, bs = onDay(bks, ds);
          cells += `<i class="${bs.length ? "b" : ""} ${bs.length && bs.every(isTent) ? "tent" : ""} ${bs.length > 1 ? "clash" : ""} ${ds === t ? "today" : ""}" ${bs.length ? `style="--c:${colorFor(bs[0].who)}"` : ""}></i>`;
        }
        return `<button class="ym" data-action="calMonthOpen" data-ym="${Y}-${pad(mi + 1)}"><b>${cap(mn)}</b><span class="ym-grid">${cells}</span></button>`;
      }).join("")}</div>
      ${Object.keys(nights).length ? `<div class="year-legend">${Object.entries(nights).sort((a, b) => b[1] - a[1]).map(([w, n]) => `<span><i class="dot" style="background:${colorFor(w)}"></i>${esc(w)} ${n} yötä</span>`).join("")}</div>` : ""}
      <div class="form-note">Napauta kuukautta nähdäksesi sen tarkemmin. Punainen reunus = päällekkäisiä varauksia.</div></div>`;
  } else {
    const ym = S.calMonth || t.slice(0, 7);
    const [Y, M] = ym.split("-").map(Number);
    const offset = (new Date(Y, M - 1, 1).getDay() + 6) % 7;
    const daysIn = new Date(Y, M, 0).getDate();
    let cells = "";
    for (let i = 0; i < offset; i++) cells += '<div class="cal-cell blank"></div>';
    for (let d = 1; d <= daysIn; d++) {
      const ds = `${Y}-${pad(M)}-${pad(d)}`;
      const bs = onDay(bks, ds);
      cells += `<button class="cal-cell ${ds === t ? "today" : ""} ${ds < t ? "past" : ""} ${bs.length > 1 ? "clash" : ""}" data-action="calDay" data-date="${ds}" aria-label="${d}. ${MONTHS[M - 1]}${bs.length > 1 ? ", päällekkäisiä varauksia" : ""}"><span class="cal-d">${d}</span><span class="cal-bs">${bs.length === 1 ? calChip(bs[0], true) : bs.slice(0, 3).map(b => calChip(b)).join("")}</span>${bs.length > 1 ? '<span class="clash-ic">⚠</span>' : ""}</button>`;
    }
    h += `<div class="card cal"><div class="cal-head"><button class="icon-btn" data-action="calNav" data-dir="-1" aria-label="Edellinen kuukausi">‹</button><b>${cap(MONTHS[M - 1])} ${Y}</b><button class="icon-btn" data-action="calNav" data-dir="1" aria-label="Seuraava kuukausi">›</button></div>
      <div class="cal-grid">${WD.map(w => `<div class="cal-w">${w}</div>`).join("")}${cells}</div>
      <div class="form-note">Napauta päivää lisätäksesi varauksen. Raidallinen = alustava, ⚠ = päällekkäin.</div></div>`;
  }
  h += `<button class="btn primary block" data-action="addBooking">+ Uusi varaus</button>`;
  const up = bks.filter(b => bEnd(b) >= t).sort((a, b) => a.start.localeCompare(b.start));
  const past = bks.filter(b => bEnd(b) < t).sort((a, b) => b.start.localeCompare(a.start));
  h += usageStats(bks);
  h += secH("Tulevat") + (up.length ? `<div class="list">${up.map(b => bookingRow(b)).join("")}</div>` : empty("Ei tulevia varauksia."));
  if (past.length) h += details("d-past", `Menneet (${past.length})`, `<div class="list">${past.slice(0, 30).map(b => bookingRow(b, false)).join("")}</div>`);
  return h;
}
// ---------- Käyttötilastot (idea 84) ----------
// Yöt lasketaan saapumispäivästä lähtöpäivää edeltävään yöhön. Vuodenvaihteen yli menevä
// varaus jakautuu kummallekin vuodelle. Alustavat varaukset näytetään erikseen.
export function usageStats(bks) {
  const t = today(), cy = Number(t.slice(0, 4));
  const years = new Set([cy]);
  bks.forEach(b => { for (let ds = b.start; ds < bEnd(b); ds = addDays(ds, 1)) years.add(Number(ds.slice(0, 4))); });
  const ys = [...years].sort((a, b) => b - a);
  const Y = ys.includes(S.statYear) ? S.statYear : cy, YS = String(Y);
  const st = {};
  bks.forEach(b => {
    let n = 0, fut = 0;
    for (let ds = b.start; ds < bEnd(b); ds = addDays(ds, 1)) if (ds.startsWith(YS)) { n++; if (ds >= t) fut++; }
    if (!n) return;
    const s = (st[b.who] ??= { nights: 0, future: 0, tent: 0, visits: 0 });
    if (isTent(b)) { s.tent += n; return; }
    s.nights += n; s.future += fut; s.visits++;
  });
  const rows = Object.entries(st).sort((a, b) => b[1].nights - a[1].nights || b[1].tent - a[1].tent || a[0].localeCompare(b[0], "fi"));
  const total = rows.reduce((s, [, v]) => s + v.nights, 0);
  const max = Math.max(1, ...rows.map(([, v]) => v.nights + v.tent));
  const yo = n => `${n} ${n === 1 ? "yö" : "yötä"}`;
  let h = secH("Käyttötilastot");
  if (ys.length > 1) h += `<div class="chips years">${ys.map(yy => `<button class="chip-btn ${yy === Y ? "on" : ""}" data-action="statYear" data-year="${yy}">${yy}</button>`).join("")}</div>`;
  if (!rows.length) return h + empty(`Vuodelle ${Y} ei ole varauksia.`);
  h += `<div class="card"><div class="card-label">Mökillä vuonna ${Y}</div>
    <div class="big">${yo(total)}</div><div class="muted small">${rows.filter(([, v]) => v.nights).length} henkilöä · ${rows.reduce((s, [, v]) => s + v.visits, 0)} käyntiä</div>
    <div class="bars usage">${rows.map(([w, v]) => {
      const meta = [v.visits ? `${v.visits} ${v.visits === 1 ? "käynti" : "käyntiä"}` : "", v.future ? `${v.future} tulossa` : "", v.tent ? `${v.tent} alustavaa` : "", total && v.nights ? Math.round(v.nights / total * 100) + " %" : ""].filter(Boolean).join(" · ");
      return `<div class="usage-row"><div class="bar-row"><span class="bar-l"><i class="dot" style="background:${colorFor(w)}"></i>${esc(w)}</span><span class="bar-t"><i style="width:${Math.max(2, v.nights / max * 100)}%;background:${colorFor(w)}"></i>${v.tent ? `<i class="tent" style="width:${v.tent / max * 100}%;--c:${colorFor(w)}"></i>` : ""}</span><span class="bar-v">${yo(v.nights)}</span></div>
        ${meta ? `<div class="muted small usage-meta">${meta}</div>` : ""}</div>`;
    }).join("")}</div>
    <div class="form-note">Yöt lasketaan saapumisillasta lähtöaamuun. Alustavat varaukset eivät ole mukana yhteismäärässä.</div></div>`;
  return h;
}
export function bookingRow(b, withClash = true) {
  const range = b.end && b.end !== b.start ? `${fmtDate(b.start)} – ${fmtDate(b.end)}` : fmtDate(b.start);
  const nights = b.end ? daysBetween(b.start, b.end) : 0;
  const chips = bookingChips(b, withClash);
  return `<div class="item"><div class="item-row"><span class="avatar ${isTent(b) ? "tent" : ""}" style="background:${colorFor(b.who)}">${esc(initials(b.who))}</span><div class="item-main" data-action="editBooking" data-id="${b.id}"><div class="item-title">${esc(b.who)}</div><div class="by">${range}${nights > 0 ? ` · ${nights} yötä` : ""}${b.note ? " · " + esc(b.note) : ""}${b.guests ? "<br>Mukana: " + esc(b.guests) : ""}</div>${chips ? `<div class="chips">${chips}</div>` : ""}</div></div></div>`;
}

// ---------- Korjaussuunnitelma ----------
export function vKorjaukset() {
  const reps = list("repairs");
  const open = reps.filter(r => r.status !== "valmis");
  const est = open.reduce((s, r) => s + num(r.estimate), 0);
  let h = backLink();
  h += `<div class="card"><div class="card-label">Tulevat korjaukset yhteensä (arvio)</div><div class="huge">${eur(est)}</div>`;
  const byYear = {};
  open.forEach(r => { const k = r.targetYear || "Ei vuotta"; byYear[k] = (byYear[k] || 0) + num(r.estimate); });
  if (Object.keys(byYear).length) h += `<table class="tbl"><tbody>${Object.keys(byYear).sort().map(k => `<tr><td>${esc(k)}</td><td class="r">${eur(byYear[k])}</td></tr>`).join("")}</tbody></table>`;
  h += `</div><button class="btn primary block" data-action="addRepair">+ Lisää korjauskohde</button>`;
  [["tyon_alla", "Työn alla"], ["suunniteltu", "Suunnitellut"], ["valmis", "Valmiit"]].forEach(([st, label]) => {
    const rs = reps.filter(r => (r.status || "suunniteltu") === st).sort((a, b) => String(a.targetYear || 9999).localeCompare(String(b.targetYear || 9999)) || a.title.localeCompare(b.title, "fi"));
    if (!rs.length) return;
    h += secH(label) + rs.map(r => `<div class="card log" data-action="editRepair" data-id="${r.id}">
      <div class="log-head"><div class="log-title">${esc(r.title)}</div><div class="log-date">${r.status === "valmis" && r.doneDate ? fmtDate(r.doneDate) : esc(r.targetYear || "")}</div></div>
      <div class="chips">${r.estimate ? chip("Arvio " + eur(r.estimate)) : ""}${r.actualCost ? chip("Toteutunut " + eur(r.actualCost), "strong") : ""}</div>
      ${r.description ? `<p class="notes">${nl2br(r.description)}</p>` : ""}${thumbs(r.photos)}
      <div class="by">Lisännyt ${esc(r.createdByName)}</div></div>`).join("");
  });
  if (!reps.length) h += empty("Lisää esim. katon uusiminen, ulkomaalaus, terassin korjaus.");
  return h;
}
