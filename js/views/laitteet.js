// =============================================================
//  Laitteet (46), huoltohistoria laitteittain (47), varaosat (65),
//  puuvaraston tila (50) ja turvatarkastukset (101).
//  Toiminnot kootaan DEVICE_ACTIONS-olioon, jonka actions.js liittää.
// =============================================================
import { S, daysBetween, list, esc, nl2br, chip, empty, secH, fmtDate, fmtDT, today, nowIso, byDateDesc, thumbs, save, patch, remove, toast, openForm, getInfo, MAINT_CATS } from "../core.js";
import { backLink } from "../theme.js";
import { render } from "../main.js";

// ---------- Laiterekisteri ----------
export const DEVICE_FIELDS = [
  { name: "name", label: "Laite", required: true, placeholder: "esim. Vesipumppu", list: ["Vesipumppu", "Lämminvesivaraaja", "Kiuas", "Ilmalämpöpumppu", "Jääkaappi", "Vene", "Perämoottori", "Ruohonleikkuri", "Aggregaatti", "Kaivon pumppu"] },
  { name: "category", label: "Luokka", type: "select", options: [["", "–"], ...MAINT_CATS] },
  { name: "brand", label: "Merkki", placeholder: "esim. Grundfos" },
  { name: "model", label: "Malli", placeholder: "esim. JP 4-47" },
  { name: "serial", label: "Sarjanumero" },
  { name: "year", label: "Ostovuosi", type: "number", placeholder: String(new Date().getFullYear()) },
  { name: "warranty", label: "Takuu voimassa asti", type: "date" },
  { name: "location", label: "Sijainti", placeholder: "esim. Pumppukaivo, saunan pukuhuone" },
  { name: "parts", label: "Varaosat ja tarvikkeet (yksi per rivi)", type: "textarea", rows: 3, placeholder: "esim.\nSuodatin: Grundfos 96XXXX\nPolttimo: E14 25 W" },
  { name: "manual", label: "Ohjekirjan linkki", type: "url", placeholder: "https://…" },
  { name: "notes", label: "Lisätiedot", type: "textarea", rows: 2 },
  { name: "photos", label: "Kuvat (laite, arvokilpi, ohjekirjan sivut)", type: "photos" }
];
const devices = () => list("devices").sort((a, b) => a.name.localeCompare(b.name, "fi"));
export const deviceName = id => list("devices").find(d => d.id === id)?.name || "";
export const deviceOptions = () => [["", "Ei laitetta"], ...devices().map(d => [d.id, d.name])];
const deviceLogs = id => list("logs").filter(l => l.deviceId === id).sort(byDateDesc);
const parts = d => String(d.parts || "").split("\n").map(s => s.trim()).filter(Boolean);

export function vLaitteet() {
  const open = S.deviceOpen && list("devices").find(d => d.id === S.deviceOpen);
  if (open) return deviceDetail(open);
  const ds = devices();
  let h = backLink() + `<p class="form-note">Mökin laitteet ja koneet: malli, takuu, varaosat ja jokaisen laitteen oma huoltohistoria.</p>
    <button class="btn primary block" data-action="addDevice">+ Lisää laite</button>`;
  if (!ds.length) return h + empty("Lisää esim. vesipumppu, varaaja, kiuas ja vene.");
  h += `<div class="list">${ds.map(d => {
    const last = deviceLogs(d.id)[0];
    const sub = [[d.brand, d.model].filter(Boolean).join(" "), d.location].filter(Boolean).map(esc).join(" · ");
    return `<div class="item"><div class="item-row" data-action="openDevice" data-id="${d.id}" role="button">
      <span class="menu-ic">${deviceIcon(d)}</span>
      <div class="item-main"><div class="item-title">${esc(d.name)}</div><div class="by">${sub}${last ? `${sub ? "<br>" : ""}Viimeisin huolto ${fmtDate(last.date)}` : ""}</div></div>
      <span class="chev">›</span></div></div>`;
  }).join("")}</div>`;
  return h;
}
function deviceIcon(d) {
  const n = (d.name + " " + (d.category || "")).toLowerCase();
  return n.includes("vene") || n.includes("moottori") ? "🚤" : n.includes("kiuas") || n.includes("sauna") ? "♨️" : n.includes("pumppu") || n.includes("vesi") || n.includes("varaaja") ? "💧" : n.includes("sähkö") ? "⚡" : "🔧";
}
function deviceDetail(d) {
  const logs = deviceLogs(d.id);
  const row = (l, v) => v ? `<div class="dl-row"><dt>${l}</dt><dd>${v}</dd></div>` : "";
  const warrantyOk = d.warranty && d.warranty >= today();
  let h = `<a class="back" href="#laitteet" data-action="closeDevice">‹ Laitteet</a>
    <div class="card"><div class="card-label row-between"><span>${deviceIcon(d)} Laite</span><button class="link-btn" data-action="editDevice" data-id="${d.id}">Muokkaa</button></div>
    <div class="big">${esc(d.name)}</div>
    <dl class="dl">${row("Merkki ja malli", esc([d.brand, d.model].filter(Boolean).join(" ")))}${row("Sarjanumero", esc(d.serial))}${row("Ostovuosi", esc(d.year))}
    ${row("Takuu", d.warranty ? `${fmtDate(d.warranty)} ${warrantyOk ? chip("voimassa", "ok-chip") : chip("päättynyt")}` : "")}${row("Sijainti", esc(d.location))}${row("Lisätiedot", nl2br(d.notes))}</dl>
    ${d.manual ? `<a class="btn small" target="_blank" rel="noopener" href="${esc(d.manual)}">📖 Ohjekirja</a>` : ""}${thumbs(d.photos)}</div>`;
  const ps = parts(d);
  h += secH("Varaosat ja tarvikkeet") + (ps.length ? `<div class="list">${ps.map((p, i) => `<div class="item"><div class="item-row"><div class="item-main"><div class="item-title">${esc(p)}</div></div><button class="btn small ghost" data-action="partToBuy" data-id="${d.id}" data-i="${i}">+ Hankittaviin</button></div></div>`).join("")}</div>`
    : `<p class="form-note">Lisää varaosat ja tarvikkeet (suodattimet, polttimot, öljyt) muokkaamalla laitetta. Niistä saa yhdellä napilla rivin Hankittaviin.</p>`);
  h += secH(`Huoltohistoria (${logs.length})`, `<button class="link-btn" data-action="addDeviceLog" data-id="${d.id}">+ Kirjaa huolto</button>`);
  h += logs.length ? logs.map(l => `<div class="card log" data-action="editLog" data-id="${l.id}"><div class="log-head"><div class="log-title">${esc(l.title)}</div><div class="log-date">${fmtDate(l.date)}</div></div>${l.notes ? `<p class="notes">${nl2br(l.notes)}</p>` : ""}<div class="by">${esc(l.createdByName)}${l.cost ? " · " + Number(l.cost).toLocaleString("fi-FI", { style: "currency", currency: "EUR" }) : ""}</div></div>`).join("")
    : empty("Ei vielä huoltoja tälle laitteelle.");
  return h;
}

// ---------- Puuvaraston tila (50) ----------
export const WOOD_STOCK = [["taynna", "Täynnä", "ok"], ["puolillaan", "Puolillaan", "warn"], ["vahissa", "Vähissä", "bad"]];
export function woodStockLabel() {
  const i = getInfo(); const s = WOOD_STOCK.find(w => w[0] === i.woodStock);
  return s ? { label: s[1], cls: s[2], by: i.woodStockBy, at: i.woodStockAt } : null;
}
export function woodStockCard() {
  const cur = getInfo().woodStock, st = woodStockLabel();
  return `<div class="card"><div class="card-label">Puuvaja nyt</div>
    <div class="seg stock">${WOOD_STOCK.map(([k, l, c]) => `<button data-action="setWoodStock" data-v="${k}" class="${k === cur ? "on " + c : ""}">${l}</button>`).join("")}</div>
    ${st ? `<div class="by">Päivitti ${esc(st.by || "")} ${fmtDT(st.at)}</div>` : '<div class="form-note">Napauta tilannetta, kun käyt puuvajalla.</div>'}</div>`;
}

// ---------- Turvatarkastukset (101) ----------
const CHECK_SUGGESTIONS = ["Ensiapulaukku", "Sammutin", "Sammutuspeite", "Palovaroittimet", "Häkävaroitin", "Pelastusliivit"];
const CHECK_FIELDS = [
  { name: "name", label: "Kohde", required: true, list: CHECK_SUGGESTIONS },
  { name: "location", label: "Sijainti", placeholder: "esim. Keittiön kaappi" },
  { name: "expires", label: "Voimassa asti", type: "date" },
  { type: "note", label: "Esim. sammuttimen seuraava huolto, ensiapulaukun tarvikkeiden viimeinen käyttöpäivä tai palovaroittimen vaihtovuosi. Jätä tyhjäksi, jos ei vanhene." },
  { name: "notes", label: "Ohje / mitä tarkastetaan", type: "textarea", rows: 2, placeholder: "esim. painemittari vihreällä, sinetti ehjä" }
];
// Voimassaolo (idea: tarkastettavat vanhenevat). Varoitus 60 päivää ennen.
export const EXPIRY_WARN_DAYS = 60;
export function expiryState(c) {
  if (!c.expires) return null;
  const d = daysBetween(today(), c.expires);
  if (d < 0) return { cls: "bad", rank: 0, d, text: `Vanhentunut ${fmtDate(c.expires)}` };
  if (d === 0) return { cls: "bad", rank: 0, d, text: "Vanhenee tänään" };
  if (d <= EXPIRY_WARN_DAYS) return { cls: "warn", rank: 1, d, text: `Vanhenee ${fmtDate(c.expires)} (${d} pv)` };
  return { cls: "ok-chip", rank: 2, d, text: `Voimassa ${fmtDate(c.expires)} asti` };
}
// Vanhentuneet ja pian vanhenevat (etusivua varten), kiireellisin ensin
export const expiringChecks = () => list("checks").map(c => [c, expiryState(c)]).filter(([, e]) => e && e.rank < 2).sort((a, b) => a[1].d - b[1].d);

export function vTarkastukset() {
  const cs = list("checks").map(c => [c, expiryState(c)])
    .sort(([a, ea], [b, eb]) => ((ea?.rank ?? 3) - (eb?.rank ?? 3)) || (ea && eb && ea.rank < 2 ? ea.d - eb.d : 0) || a.name.localeCompare(b.name, "fi"));
  const bad = cs.filter(([, e]) => e?.rank === 0).length, soon = cs.filter(([, e]) => e?.rank === 1).length;
  let h = `<p class="form-note">Merkitse, milloin turvavälineet on viimeksi tarkastettu. Voit lisätä kohteelle voimassaolopäivän, jolloin näet ajoissa, mikä on vanhenemassa.</p>`;
  if (bad || soon) h += `<div class="card expiry-sum ${bad ? "bad" : "warn"}">${[bad ? `<b>${bad} vanhentunut</b>` : "", soon ? `${soon} vanhenee ${EXPIRY_WARN_DAYS} päivän sisällä` : ""].filter(Boolean).join(" · ")}</div>`;
  h += cs.length ? `<div class="list">${cs.map(([c, e]) => {
    const last = c.history?.[0];
    return `<div class="item ${e && e.rank < 2 ? "exp-" + e.cls : ""}"><div class="item-row">
      <div class="item-main"><div class="item-title">${esc(c.name)}</div>
        ${e ? `<div class="chips">${chip(esc(e.text), e.cls)}</div>` : ""}
        <div class="by">${last ? `✓ ${fmtDate(last.date)} · ${esc(last.by)}` : '<span class="warn">Ei tarkastettu</span>'}${c.location ? " · " + esc(c.location) : ""}</div>${c.notes ? `<div class="by">${esc(c.notes)}</div>` : ""}</div>
      <button class="btn small ${last?.date === today() ? "ghost" : ""}" data-action="checkDone" data-id="${c.id}">${last?.date === today() ? "✓ Tänään" : "✓ Tarkastettu"}</button>
      <button class="icon-btn" data-action="editCheck" data-id="${c.id}" aria-label="Muokkaa">✎</button>
    </div></div>`;
  }).join("")}</div>` : "";
  const missing = CHECK_SUGGESTIONS.filter(s => !cs.some(([c]) => c.name.toLowerCase() === s.toLowerCase()));
  h += `<div class="chips">${missing.map(s => `<button class="chip-btn" data-action="addCheck" data-name="${esc(s)}">+ ${esc(s)}</button>`).join("")}<button class="chip-btn" data-action="addCheck">+ Muu</button></div>`;
  return h;
}

// ---------- Toiminnot ----------
const findDev = id => list("devices").find(d => d.id === id);
export const DEVICE_ACTIONS = {
  openDevice: d => { S.deviceOpen = d.id; window.scrollTo(0, 0); render(); },
  closeDevice: () => { S.deviceOpen = null; if (location.hash !== "#laitteet") location.hash = "laitteet"; else render(); },
  addDevice: () => openForm({ formKey: "laite", title: "Uusi laite", fields: DEVICE_FIELDS, onSubmit: v => { S.deviceOpen = save("devices", v); toast("Laite lisätty"); } }),
  editDevice: d => {
    const x = findDev(d.id); if (!x) return;
    openForm({ formKey: "laite", title: "Muokkaa laitetta", fields: DEVICE_FIELDS, values: x, onSubmit: v => save("devices", v, x.id), onDelete: () => { remove("devices", x.id); S.deviceOpen = null; } });
  },
  partToBuy: d => {
    const x = findDev(d.id); const p = x && parts(x)[Number(d.i)]; if (!p) return;
    save("shopping", { text: `${p} (${x.name})`, done: false, list: "osta", deviceId: x.id });
    toast("Lisätty Hankittaviin");
  },
  setWoodStock: d => { save("info", { woodStock: d.v, woodStockBy: S.me.name, woodStockAt: nowIso() }, "main"); },
  addCheck: d => openForm({ title: "Uusi tarkastettava", fields: CHECK_FIELDS, values: { name: d.name || "" }, onSubmit: v => { save("checks", { ...v, history: [] }); } }),
  editCheck: d => {
    const c = list("checks").find(x => x.id === d.id); if (!c) return;
    openForm({ title: "Muokkaa", fields: [...CHECK_FIELDS, { type: "note", label: c.history?.length ? "Aiemmat tarkastukset: " + c.history.slice(0, 6).map(h => `${fmtDate(h.date)} (${h.by})`).join(", ") : "Ei aiempia tarkastuksia." }], values: c, onSubmit: v => save("checks", v, c.id), onDelete: () => remove("checks", c.id) });
  },
  checkDone: d => {
    const c = list("checks").find(x => x.id === d.id); if (!c) return;
    if (c.history?.[0]?.date === today()) return;
    patch("checks", c.id, { history: [{ date: today(), by: S.me.name, at: nowIso() }, ...(c.history || [])].slice(0, 20) });
    toast(`${c.name}: tarkastettu`);
  }
};
