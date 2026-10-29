import { findIn } from "../actions.js";
import { $, INV_CATS, INV_STATUS, curTab, details, empty, esc, fmtDT, homeRow, list, secH, seg } from "../core.js";
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
export function invRow(i, home = false) {
  const [lab, cls] = INV_STATUS[i.status || "ok"] || INV_STATUS.ok;
  const sub = [i.qty, i.location].filter(Boolean).map(esc).join(" · ");
  if (home === true) return homeRow(esc(i.name), sub ? `<div class="by">${sub}</div>` : "", "tavarat", "inv", `<span class="status ${cls} static">${lab}</span>`);
  return `<div class="item"><div class="item-row"><div class="item-main" data-action="editInv" data-id="${i.id}"><div class="item-title">${esc(i.name)}</div>${sub ? `<div class="by">${sub}</div>` : ""}</div><button class="status ${cls}" data-action="invStatus" data-id="${i.id}">${lab}</button></div></div>`;
}
export function vInventory() {
  const inv = list("inventory");
  let h = `<p class="form-note">Mitä mökillä on. Napauta tilaa (OK → Vähissä → Loppu). Vähissä tai loppu oleva tavara lisätään Hankittavat-listaan.</p>
    <button class="btn primary block" data-action="addInv">+ Lisää tavara</button>`;
  if (!inv.length) return h + empty("Inventaario on tyhjä.");
  const low = inv.filter(i => i.status && i.status !== "ok").length;
  if (low) h += `<div class="card warn-card">${low} tavaraa vähissä tai loppu.</div>`;
  const cats = [...INV_CATS, ...new Set(inv.map(i => i.category).filter(c => !INV_CATS.includes(c)))];
  cats.forEach(c => {
    const items = inv.filter(i => (i.category || "Muu") === c).sort((a, b) => a.name.localeCompare(b.name, "fi"));
    if (!items.length) return;
    h += secH(esc(c)) + `<div class="list">${items.map(invRow).join("")}</div>`;
  });
  return h;
}
