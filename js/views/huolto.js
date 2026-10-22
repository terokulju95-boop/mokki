import { deviceOptions, deviceName, woodStockCard, vTarkastukset } from "./laitteet.js";
import { $, S, MAINT_CATS, WOOD_TYPES, WOOD_UNITS, ago, byDateDesc, chip, curTab, details, empty, esc, eur, fmtDT, fmtDate, fmtNum, list, nl2br, num, seg, thumbs, today } from "../core.js";
import { F, backLink } from "../theme.js";

// ---------- Huolto ----------
export const LOG_FIELDS = {
  nuohous: [
    { name: "date", label: "Päivämäärä", type: "date", required: true, def: today },
    { name: "doer", label: "Kuka nuohosi", type: "select", options: [["nuohooja", "Nuohooja / yritys"], ["itse", "Itse"]] },
    { name: "provider", label: "Nuohooja / yritys", placeholder: "esim. Nuohous Virtanen" },
    { name: "cost", label: "Hinta (€)", type: "number", placeholder: "0,00" },
    { name: "notes", label: "Huomiot", type: "textarea", placeholder: "esim. nuohoojan havainnot, korjattavaa" },
    { name: "photos", label: "Kuvat (kuitti, nuohoustodistus)", type: "photos" }
  ],
  puut: [
    { name: "date", label: "Tilauspäivä", type: "date", required: true, def: today },
    { name: "amount", label: "Määrä", type: "number", placeholder: "esim. 4" },
    { name: "unit", label: "Yksikkö", type: "select", options: WOOD_UNITS },
    { name: "wood", label: "Puulaji", type: "select", options: WOOD_TYPES },
    { name: "provider", label: "Toimittaja", placeholder: "Keneltä tilattiin" },
    { name: "cost", label: "Hinta yhteensä (€)", type: "number", placeholder: "0,00" },
    { name: "notes", label: "Lisätiedot", type: "textarea", placeholder: "esim. pilkkeen pituus, kuivuus, toimitus" },
    { name: "photos", label: "Kuvat (kuitti)", type: "photos" }
  ],
  huolto: [
    { name: "title", label: "Mitä tehtiin", required: true, placeholder: "esim. Saunan kiukaan kivet vaihdettu" },
    { name: "date", label: "Päivämäärä", type: "date", required: true, def: today },
    { name: "category", label: "Kategoria", type: "select", options: MAINT_CATS },
    { name: "deviceId", label: "Laite", type: "select", options: deviceOptions },
    { name: "doer", label: "Tekijä", type: "select", options: [["itse", "Itse tehty"], ["ulkopuolinen", "Ulkopuolinen tekijä"]] },
    { name: "provider", label: "Kuka teki / yritys" },
    { name: "cost", label: "Kustannus (€)", type: "number", placeholder: "0,00" },
    { name: "notes", label: "Lisätiedot", type: "textarea" },
    { name: "photos", label: "Kuvat", type: "photos" }
  ]
};
export const LOG_ADD = { nuohous: "Kirjaa nuohous", puut: "Kirjaa puutilaus", huolto: "Kirjaa huoltotyö" };

export function vHuolto() {
  let t = curTab("huolto", "nuohous"); if (t !== "puut") t = "nuohous";
  let h = backLink() + seg("huolto", [["nuohous", "Nuohous"], ["puut", "Puut"]], "nuohous");
  const logs = list("logs").filter(l => l.type === t).sort(byDateDesc);
  if (t === "nuohous") h += sweepSummary(logs);
  if (t === "puut") h += woodStockCard() + woodSummary(logs);
  h += `<button class="btn primary block" data-action="addLog" data-type="${t}">+ ${LOG_ADD[t]}</button>`;
  h += logs.length ? logs.map(logCard).join("") : empty("Ei vielä merkintöjä.");
  return h;
}

export function sweepSummary(logs) {
  const last = logs[0];
  if (!last) return `<div class="card"><div class="card-label">Edellinen nuohous</div><div class="muted">Nuohousta ei ole vielä kirjattu.</div></div>`;
  return `<div class="card"><div class="card-label">Edellinen nuohous</div><div class="big">${fmtDate(last.date)}</div>
    <div class="muted small">${ago(last.date)} · ${last.doer === "itse" ? "Itse" : esc(last.provider || "Nuohooja")}${last.cost ? " · " + eur(last.cost) : ""}</div></div>`;
}

export function woodSummary(logs) {
  if (!logs.length) return "";
  const years = {};
  logs.forEach(l => {
    const y = (l.date || "").slice(0, 4); if (!y) return;
    years[y] ??= { cost: 0, units: {} };
    years[y].cost += num(l.cost);
    if (l.amount) years[y].units[l.unit || ""] = (years[y].units[l.unit || ""] || 0) + num(l.amount);
  });
  const last = logs[0];
  const priced = logs.filter(l => l.amount && l.cost && l.unit === last.unit);
  const avg = priced.length ? priced.reduce((s, l) => s + num(l.cost), 0) / priced.reduce((s, l) => s + num(l.amount), 0) : 0;
  return `<div class="card">
    <div class="stat-grid">
      <div><div class="card-label">Edellinen tilaus</div><div class="big">${fmtDate(last.date)}</div><div class="muted small">${ago(last.date)}<br>${last.amount ? fmtNum(last.amount) + " " + esc(last.unit || "") : ""}${last.cost ? " · " + eur(last.cost) : ""}</div></div>
      <div><div class="card-label">Keskihinta</div><div class="big">${avg ? eur(avg) : "–"}</div><div class="muted small">per ${esc(last.unit || "yksikkö")}</div></div>
    </div>
    <table class="tbl"><thead><tr><th>Vuosi</th><th>Määrä</th><th class="r">Hinta</th></tr></thead><tbody>
    ${Object.keys(years).sort().reverse().map(y => `<tr><td>${y}</td><td>${Object.entries(years[y].units).map(([u, a]) => fmtNum(a) + " " + esc(u)).join(", ") || "–"}</td><td class="r">${eur(years[y].cost)}</td></tr>`).join("")}
    </tbody></table></div>`;
}

export function logCard(l) {
  const chips = [];
  if (l.type === "puut") {
    if (l.amount) chips.push(chip(`${fmtNum(l.amount)} ${esc(l.unit || "")}`));
    if (l.wood) chips.push(chip(esc(l.wood)));
    if (l.amount && l.cost) chips.push(chip(`${eur(num(l.cost) / num(l.amount))} / ${esc(l.unit || "yks")}`));
  }
  if (l.type === "huolto" && l.category) chips.push(chip(esc(l.category)));
  if (l.deviceId && deviceName(l.deviceId)) chips.push(chip("🔧 " + esc(deviceName(l.deviceId))));
  if (l.doer) chips.push(chip(l.doer === "itse" ? "Itse tehty" : "Teetetty"));
  if (l.cost) chips.push(chip(eur(l.cost), "strong"));
  const title = l.type === "huolto" ? esc(l.title) : l.type === "nuohous" ? "Nuohous" : "Polttopuut";
  return `<div class="card log" data-action="editLog" data-id="${l.id}">
    <div class="log-head"><div class="log-title">${title}${l.provider ? ` <span class="muted">· ${esc(l.provider)}</span>` : ""}</div><div class="log-date">${fmtDate(l.date)}</div></div>
    ${chips.length ? `<div class="chips">${chips.join("")}</div>` : ""}
    ${l.notes ? `<p class="notes">${nl2br(l.notes)}</p>` : ""}${thumbs(l.photos)}
    <div class="by">Kirjannut ${esc(l.createdByName)}${l.updatedByName ? ` · muokannut ${esc(l.updatedByName)}` : ""}</div></div>`;
}

// ---------- Tehtävät ----------
export function openTodos() {
  return list("todos").filter(t => !t.done).sort((a, b) =>
    ((b.priority === "tarkea") - (a.priority === "tarkea")) || (F("todoDue") ? (a.due || "9999").localeCompare(b.due || "9999") : 0) || (a.createdAt || "").localeCompare(b.createdAt || ""));
}
export function vHuoltotyot() {
  const tab = curTab("huoltotyot", "tyot");
  const h0 = backLink() + seg("huoltotyot", [["tyot", "🔧 Huoltotyöt"], ["tarkastukset", "🧯 Tarkastukset"]], "tyot");
  if (tab === "tarkastukset") return h0 + vTarkastukset();
  const logs = list("logs").filter(l => l.type === "huolto").sort(byDateDesc);
  return h0 + `<button class="btn primary block" data-action="addLog" data-type="huolto">+ ${LOG_ADD.huolto}</button>`
    + (logs.length ? logs.map(logCard).join("") : empty("Ei vielä kirjattuja huoltotöitä."));
}
export function vTodos() {
  const all = openTodos();
  const cats = [...new Set(all.map(t => t.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, "fi"));
  const cat = cats.includes(S.todoCat) ? S.todoCat : "";
  const open = cat ? all.filter(t => t.category === cat) : all;
  const done = list("todos").filter(t => t.done).sort((a, b) => (b.doneAt || "").localeCompare(a.doneAt || ""));
  let h = backLink() + `<form class="quick" data-form="addTodo"><input id="todo-new" name="text" placeholder="Uusi tehtävä, esim. Vaihda saunan lauteet" autocomplete="off" enterkeyhint="done"><button class="btn primary">Lisää</button></form>`;
  h += `<p class="form-note">Napauta tehtävää merkitäksesi sen tehdyksi. Kynästä ✎ voit muokata tehtävää.</p>`;
  if (cats.length) h += `<div class="chips">${[["", "Kaikki"], ...cats.map(c => [c, c])].map(([k, l]) => `<button class="chip-btn ${k === cat ? "on" : ""}" data-action="todoCat" data-cat="${esc(k)}">${esc(l)}${k ? ` (${all.filter(t => t.category === k).length})` : ""}</button>`).join("")}</div>`;
  h += open.length ? `<div class="list">${open.map(todoRow).join("")}</div>` : empty("Ei avoimia tehtäviä 🎉");
  if (done.length) h += details("d-todos", `Tehdyt (${done.length})`, `<div class="list">${done.map(todoRow).join("")}</div><button class="btn ghost small" data-action="clearDone" data-col="todos">Poista tehdyt listalta</button>`);
  return h;
}
export function todoRow(t) {
  const chips = [];
  if (t.priority === "tarkea") chips.push(chip("Tärkeä", "warn"));
  if (t.category) chips.push(chip(esc(t.category)));
  if (F("todoDue") && t.due && !t.done) chips.push(chip(fmtDate(t.due), t.due < today() ? "bad" : ""));
  if (t.assignee) chips.push(chip("👤 " + esc(t.assignee)));
  return `<div class="item ${t.done ? "is-done" : ""}"><div class="item-row" data-action="toggleTodo" data-id="${t.id}" role="button" aria-label="${t.done ? "Merkitse tekemättömäksi" : "Merkitse tehdyksi"}: ${esc(t.text)}">
    <span class="check ${t.done ? "on" : ""}"></span>
    <div class="item-main"><div class="item-title">${esc(t.text)}</div>
    ${chips.length ? `<div class="chips">${chips.join("")}</div>` : ""}
    ${t.done ? `<div class="by">✓ ${esc(t.doneByName)} · ${fmtDT(t.doneAt)}</div>` : `<div class="by">Lisännyt ${esc(t.createdByName)}</div>`}</div>
    <button class="icon-btn" data-action="editTodo" data-id="${t.id}" aria-label="Muokkaa">✎</button>
  </div></div>`;
}
