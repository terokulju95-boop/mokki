import { findIn } from "../actions.js";
import { $, INV_CATS, INV_EXPIRY_WARN, INV_NEEDS, INV_RANK, INV_STATUS, chip, curTab, daysBetween, fmtDate, invState, today, details, empty, esc, fmtDT, homeRow, list, secH, seg } from "../core.js";
import { backLink } from "../theme.js";

// ---------- Tavarat ----------
export const shopList = s => s.list === "osta" ? "osta" : "vie";
export function vTavarat() {
  const t = curTab("tavarat", "vie");
  return backLink() + seg("tavarat", [["vie", "🧺 Vie mukana"], ["osta", "🛒 Hankittavat"], ["inv", "📦 Inventaario"]]) + (t === "inv" ? vInventory() : vShopping(t === "osta" ? "osta" : "vie"));
}
export function vShopping(kind) {
  const items = list("shopping").filter(i => shopList(i) === kind);
  const open = items.filter(i => !i.done).sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
  const done = items.filter(i => i.done).sort((a, b) => (b.doneAt || "").localeCompare(a.doneAt || ""));
  const intro = kind === "osta"
    ? "Mitä pitää jossain vaiheessa ostaa tai uusia, esim. tyhjä kaasupullo. Kun merkitset inventaariossa tavaran loppuneeksi, se tulee tänne. Napauta riviä, kun asia on hankittu."
    : "Mitä pitää muistaa ottaa mukaan seuraavalla mökkireissulla. Napauta riviä, kun asia on hoidettu.";
  let h = `<p class="form-note">${intro}</p>
    <form class="quick" data-form="addShop"><input type="hidden" name="list" value="${kind}"><input id="shop-new-${kind}" name="text" placeholder="${kind === "osta" ? "esim. Kaasupullo, saunan tuoksut" : "esim. Kaasupullo, wc-paperia"}" autocomplete="off" enterkeyhint="done"><button class="btn primary">Lisää</button></form>`;
  h += open.length ? `<div class="list">${open.map(shopRow).join("")}</div>` : empty("Lista on tyhjä.");
  if (done.length) h += details("d-shop-" + kind, `${kind === "osta" ? "Hankitut" : "Hoidetut"} (${done.length})`, `<div class="list">${done.map(shopRow).join("")}</div><button class="btn ghost small" data-action="clearDone" data-col="shopping" data-list="${kind}">Tyhjennä listalta</button>`);
  return h;
}
// home = etusivun kortti: vain luku, ei valintaruutua eikä poistonappia (vahinkopainallukset).
// Rivin napautus avaa listan omalla välilehdellään, jossa merkintä tehdään.
export function shopRow(i, home = false) {
  if (home === true) return homeRow(esc(i.text), `<div class="by">${esc(i.createdByName || "")}</div>`, "tavarat", shopList(i));
  const kind = shopList(i);
  const inv = i.invId ? findIn("inventory", i.invId) : null;
  const sub = i.done ? `✓ ${esc(i.doneByName)} · ${fmtDT(i.doneAt)}` : [esc(i.createdByName), inv ? "inventaariosta" + (inv.status && inv.status !== "ok" ? ` (${INV_STATUS[inv.status][0].toLowerCase()})` : "") : ""].filter(Boolean).join(" · ");
  return `<div class="item ${i.done ? "is-done" : ""}"><div class="item-row" data-action="toggleShop" data-id="${i.id}" role="button" aria-label="Merkitse ${kind === "osta" ? "hankituksi" : "hoidetuksi"}: ${esc(i.text)}">
    <span class="check ${i.done ? "on" : ""}"></span>
    <div class="item-main"><div class="item-title">${esc(i.text)}</div><div class="by">${sub}</div></div>
    ${home === true ? "" : `<button class="icon-btn" data-action="delShop" data-id="${i.id}" aria-label="Poista">✕</button>`}
  </div></div>`;
}
// Vanhenemispäivän teksti tavaran alle
export function invExpiry(i) {
  if (!i.expires) return "";
  const d = daysBetween(today(), i.expires);
  if (d < 0) return `<span class="bad">Vanheni ${fmtDate(i.expires)}</span>`;
  if (d <= INV_EXPIRY_WARN) return `<span class="warn">Vanhenee ${fmtDate(i.expires)}${d === 0 ? " (tänään)" : ` (${d} pv)`}</span>`;
  return `Vanhenee ${fmtDate(i.expires)}`;
}
export function invRow(i, home = false) {
  const st = invState(i);
  const [lab, cls] = INV_STATUS[st];
  const sub = [...[i.qty, i.location].filter(Boolean).map(esc), invExpiry(i)].filter(Boolean).join(" · ");
  if (home === true) return homeRow(esc(i.name), sub ? `<div class="by">${sub}</div>` : "", "tavarat", "inv", `<span class="status ${cls} static">${lab}</span>`);
  return `<div class="item"><div class="item-row"><div class="item-main" data-action="editInv" data-id="${i.id}"><div class="item-title">${esc(i.name)}</div>${sub ? `<div class="by">${sub}</div>` : ""}</div><button class="status ${cls}" data-action="invStatus" data-id="${i.id}" aria-label="Tila: ${lab}. Vaihda tila">${lab} <span class="status-caret" aria-hidden="true">▾</span></button></div></div>`;
}
export function vInventory() {
  const inv = list("inventory");
  let h = `<p class="form-note">Mitä mökillä on. Napauta tilaa vaihtaaksesi sen. Vähissä, loppu, vanhentunut tai rikki oleva tavara lisätään Hankittavat-listaan. Jos tavaralla on vanhenemispäivä, se merkitään vanhentuneeksi automaattisesti.</p>
    <button class="btn primary block" data-action="addInv">+ Lisää tavara</button>`;
  if (!inv.length) return h + empty("Inventaario on tyhjä.");
  const cnt = s => inv.filter(i => invState(i) === s).length;
  const need = INV_NEEDS.map(s => [s, cnt(s)]).filter(([, n]) => n);
  const soon = inv.filter(i => i.expires && invState(i) !== "vanhentunut" && daysBetween(today(), i.expires) <= INV_EXPIRY_WARN && daysBetween(today(), i.expires) >= 0).length;
  if (need.length || soon) h += `<div class="card warn-card">${[...need.map(([s, n]) => `${n} ${INV_STATUS[s][0].toLowerCase()}`), soon ? `${soon} vanhenee pian` : ""].filter(Boolean).join(" · ")}</div>`;
  const cats = [...INV_CATS, ...new Set(inv.map(i => i.category).filter(c => !INV_CATS.includes(c)))];
  cats.forEach(c => {
    const items = inv.filter(i => (i.category || "Muu") === c).sort((a, b) => (INV_RANK[invState(a)] - INV_RANK[invState(b)]) || a.name.localeCompare(b.name, "fi"));
    if (!items.length) return;
    h += secH(esc(c)) + `<div class="list">${items.map(i => invRow(i)).join("")}</div>`;
  });
  return h;
}
