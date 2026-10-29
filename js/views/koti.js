import { render } from "../main.js";
import { checkTitle, expiringChecks, woodStockLabel } from "./laitteet.js";
import { timeGreeting } from "../theme.js";
import { $, S, addMonths, ago, byDateDesc, chip, empty, esc, eur, fmtDate, fmtNum, fmtShort, getInfo, isAdmin, list, nl2br, num, secH, seg, today } from "../core.js";
import { DEFAULT_THEME, F, HOME_CARDS, HOME_SIZES, T, homeTitle } from "../theme.js";
import { saveBarState, tId, tText } from "../views/asetukset.js";
import { CHIMNEYS, anyChimneyMarked, lastSweep, openTodos, todoRow } from "../views/huolto.js";
import { SEASON_NAMES, currentRun, seasonByMonth, seasonItems } from "../views/kausi.js";
import { invRow, shopList, shopRow } from "../views/tavarat.js";
import { bookingLine } from "../views/tiedot.js";

// =============================================================
//  NÄKYMÄT
// =============================================================

// ---------- Koti ----------
// Etusivun kortit. Pääkäyttäjä järjestää, nimeää, piilottaa ja valitsee koon
// suoraan etusivulla (✎ Muokkaa etusivua).
// Jokainen kortti palauttaa sisällön tai null (ei näytettävää).
export const lastLog = type => list("logs").filter(l => l.type === type).sort(byDateDesc)[0];
export const tabAttrs = (view, tab) => `data-action="tab" data-view="${view}" data-tab="${tab}"`;
export const HOME_DATA = {
  notice: () => {
    const n = T().text.notice.trim(); if (!n) return null;
    return { body: `<p class="notes">${nl2br(n)}</p>`, short: esc(n.split("\n")[0]), cls: "notice" };
  },
  address: () => {
    const info = getInfo();
    const addr = info.rescueAddress || info.address;
    if (!addr) return { href: "#perustiedot", body: `<div class="muted">Osoitetta ei ole vielä lisätty.</div>`, short: '<span class="muted">Ei lisätty – lisää Perustiedoissa</span>' };
    const full = addr + (info.municipality ? ", " + info.municipality : "");
    const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(info.coords || full)}`;
    const btns = `<button class="icon-btn" data-action="copy" data-text="${esc(full)}" aria-label="Kopioi osoite" title="Kopioi osoite">⧉</button><a class="icon-btn" target="_blank" rel="noopener" href="${mapUrl}" aria-label="Avaa kartalla" title="Avaa kartalla">🗺️</a>`;
    return { body: `<div class="addr-row"><div><b>${esc(addr)}</b>${info.municipality ? `<div class="muted small">${esc(info.municipality)}</div>` : ""}</div><span class="addr-btns">${btns}</span></div>`, short: esc(full), extra: `<span class="addr-btns">${btns}</span>` };
  },
  bookings: () => {
    const t = today();
    const bks = list("bookings").filter(b => (b.end || b.start) >= t).sort((a, b) => a.start.localeCompare(b.start));
    const now = bks.filter(b => b.start <= t), next = bks.filter(b => b.start > t);
    const range = b => b.end && b.end !== b.start ? `${fmtShort(b.start)}–${fmtShort(b.end)}` : fmtShort(b.start);
    return {
      href: "#varaukset",
      body: (now.length ? `<div class="big">Nyt: ${now.map(b => esc(b.who)).join(", ")}</div>` : "") + (next.slice(0, 3).map(bookingLine).join("") || (now.length ? "" : '<div class="muted">Ei tulevia varauksia.</div>')),
      short: now.length ? `Nyt: ${now.map(b => esc(b.who)).join(", ")}` : next.length ? `${esc(next[0].who)} ${range(next[0])}` : '<span class="muted">Ei tulevia varauksia</span>'
    };
  },
  todos: () => {
    const todos = openTodos();
    return {
      count: todos.length, href: "#tehtavat", noFullLink: true,
      right: `<a href="#tehtavat">Kaikki ›</a>`,
      body: todos.length ? `<div class="list flat">${todos.slice(0, 5).map(todoRow).join("")}</div>` : '<div class="muted">Ei avoimia tehtäviä.</div>',
      short: todos.length ? esc(todos.slice(0, 3).map(x => x.text).join(", ")) : '<span class="muted">Ei avoimia tehtäviä</span>'
    };
  },
  shopping: () => {
    const shop = list("shopping").filter(s => !s.done && shopList(s) === "vie");
    return {
      count: shop.length, href: "#tavarat", attrs: tabAttrs("tavarat", "vie"),
      body: shop.length ? `<div class="chips">${shop.slice(0, 10).map(s => chip(esc(s.text))).join("")}${shop.length > 10 ? chip("+" + (shop.length - 10)) : ""}</div>` : '<div class="muted">Ei mitään muistettavaa.</div>',
      short: shop.length ? esc(shop.slice(0, 4).map(x => x.text).join(", ")) : '<span class="muted">Ei mitään muistettavaa</span>'
    };
  },
  maint: () => {
    // Vanhentuneet / pian vanhenevat tarkastettavat (esim. sammutin) huoltotöiden kortin alkuun
    const exp = expiringChecks();
    const expWarn = () => exp.length ? `<a class="home-exp" href="#huoltotyot" ${tabAttrs("huoltotyot", "tarkastukset")}><span class="chips">${exp.slice(0, 3).map(([c, e]) => chip("⚠ " + checkTitle(c) + ": " + esc(e.text.charAt(0).toLowerCase() + e.text.slice(1)), e.cls)).join("")}${exp.length > 3 ? chip("+" + (exp.length - 3)) : ""}</span></a>` : "";
    const logs = list("logs").filter(l => l.type === "huolto").sort(byDateDesc);
    return {
      href: "#huoltotyot", noFullLink: true,
      right: `<a href="#huoltotyot">Kaikki ›</a>`,
      body: expWarn() + (logs.length ? logs.slice(0, 4).map(l => `<div class="line"><span>${esc(l.title)}</span><span class="muted">${fmtDate(l.date)}</span></div>`).join("") : '<div class="muted">Ei kirjattuja huoltotöitä.</div>'),
      short: (exp.length ? `<span class="${exp[0][1].cls === "bad" ? "bad" : "warn"}">⚠ ${checkTitle(exp[0][0])}${exp.length > 1 ? ` +${exp.length - 1}` : ""}</span> <span class="muted">· </span>` : "")
        + (logs.length ? `${esc(logs[0].title)} <span class="muted">· ${fmtDate(logs[0].date)}</span>` : '<span class="muted">Ei kirjattuja huoltotöitä</span>')
    };
  },
  sweep: () => {
    const l = lastLog("nuohous");
    const sweeps = list("logs").filter(x => x.type === "nuohous").sort(byDateDesc);
    if (anyChimneyMarked(sweeps)) {
      const rows = CHIMNEYS.map(([k]) => [k === "sauna" ? "Sauna" : "Mökki", lastSweep(k, sweeps)]);
      return {
        href: "#huolto", attrs: tabAttrs("huolto", "nuohous"),
        body: `<div class="sweep-home">${rows.map(([n, s]) => `<div><div class="muted small">${n}</div>${s ? `<div class="big">${fmtDate(s.date)}</div><div class="muted small">${ago(s.date)}</div>` : '<div class="muted">Ei kirjattu</div>'}</div>`).join("")}</div>`,
        short: rows.map(([n, s]) => `${n} ${s ? fmtDate(s.date) : "–"}`).join(' <span class="muted">·</span> ')
      };
    }
    return {
      href: "#huolto", attrs: tabAttrs("huolto", "nuohous"),
      body: l ? `<div class="big">${fmtDate(l.date)}</div><div class="muted small">${ago(l.date)}${l.doer === "itse" ? " · itse" : ""}</div>` : '<div class="muted">Ei kirjattu</div>',
      short: l ? `${fmtDate(l.date)} <span class="muted">· ${ago(l.date)}</span>` : '<span class="muted">Ei kirjattu</span>'
    };
  },
  wood: () => {
    const l = lastLog("puut"), st = woodStockLabel();
    const amt = l?.amount ? fmtNum(l.amount) + " " + esc(l.unit || "") : "";
    return {
      href: "#huolto", attrs: tabAttrs("huolto", "puut"),
      body: (l ? `<div class="big">${fmtDate(l.date)}</div><div class="muted small">${[ago(l.date), amt].filter(Boolean).join(" · ")}</div>` : '<div class="muted">Ei kirjattu</div>')
        + (st ? `<div class="stock-pill ${st.cls}">Puuvaja: ${esc(st.label)}</div>` : ""),
      short: (st ? `<span class="${st.cls}">${esc(st.label)}</span> <span class="muted">· </span>` : "") + (l ? `${fmtDate(l.date)} <span class="muted">· ${ago(l.date)}</span>` : '<span class="muted">Ei kirjattu</span>')
    };
  },
  payments: () => {
    if (!F("payDue")) return null;
    const t = today(); const limit = addMonths(t, 1);
    const due = list("payments").filter(p => !p.paid && p.date && p.date <= limit).sort((a, b) => a.date.localeCompare(b.date));
    if (!due.length) return null;
    return {
      href: "#kulut",
      body: due.slice(0, 5).map(p => `<div class="line"><span>${esc(p.name)}</span><span class="${p.date < t ? "bad" : ""}">${eur(p.amount)} · ${fmtShort(p.date)}</span></div>`).join(""),
      short: `${due.length} kpl · ${eur(due.reduce((s, p) => s + num(p.amount), 0))}`
    };
  },
  season: () => {
    const season = seasonByMonth();
    const items = seasonItems(season);
    const run = currentRun(season); const done = run?.completed || {};
    const left = items.filter(i => !done[i.id]);
    const n = items.length, dc = n - left.length;
    const pct = n ? Math.round(dc / n * 100) : 0;
    const head = `<div class="run-head"><div class="big">${SEASON_NAMES[season]}</div>${n ? `<div class="pct ${dc === n ? "ok" : ""}">${dc}/${n}</div>` : ""}</div>${n ? `<div class="bar"><i style="width:${pct}%"></i></div>` : ""}`;
    const rows = left.map(it => `<div class="item"><div class="item-row" data-action="toggleCheck" data-id="${it.id}"><span class="check"></span><div class="item-main"><div class="item-title">${esc(it.title)}</div></div></div></div>`).join("");
    return {
      href: "#kausi", attrs: tabAttrs("kausi", season), noFullLink: true,
      right: `<a href="#kausi" ${tabAttrs("kausi", season)}>Avaa ›</a>`,
      body: head + (!n ? `<div class="muted">Lista on tyhjä. Lisää kohdat Kausi-sivulla.</div>` : left.length ? `<div class="list flat">${rows}</div>` : '<div class="done-msg">✓ Kaikki tehty!</div>'),
      short: `${SEASON_NAMES[season]} <span class="muted">· ${dc}/${n}</span>`
    };
  },
  buy: () => {
    const items = list("shopping").filter(s => !s.done && shopList(s) === "osta").sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
    return {
      count: items.length, href: "#tavarat", attrs: tabAttrs("tavarat", "osta"), noFullLink: true,
      right: `<a href="#tavarat" ${tabAttrs("tavarat", "osta")}>Kaikki ›</a>`,
      body: items.length ? `<div class="list flat">${items.slice(0, 8).map(i => shopRow(i, true)).join("")}</div>` : '<div class="muted">Ei hankittavaa.</div>',
      short: items.length ? esc(items.slice(0, 4).map(x => x.text).join(", ")) : '<span class="muted">Ei hankittavaa</span>'
    };
  },
  inventory: () => {
    const rank = { loppu: 0, vahissa: 1, ok: 2 };
    const inv = list("inventory").sort((a, b) => (rank[a.status || "ok"] - rank[b.status || "ok"]) || a.name.localeCompare(b.name, "fi"));
    const low = inv.filter(i => (i.status || "ok") !== "ok").length;
    return {
      count: inv.length, href: "#tavarat", attrs: tabAttrs("tavarat", "inv"), noFullLink: true,
      right: `<a href="#tavarat" ${tabAttrs("tavarat", "inv")}>Kaikki ›</a>`,
      body: inv.length ? `<div class="list flat">${inv.slice(0, 10).map(invRow).join("")}</div>${inv.length > 10 ? `<div class="muted small">+ ${inv.length - 10} muuta</div>` : ""}` : '<div class="muted">Inventaario on tyhjä.</div>',
      short: inv.length ? `${inv.length} tavaraa${low ? ` · <span class="warn">${low} vähissä tai loppu</span>` : ""}` : '<span class="muted">Inventaario on tyhjä</span>'
    };
  }
};
export const HOME_EMPTY = {
  notice: "Tiedote on tyhjä, joten sitä ei näytetä. Kirjoita tiedote yläpuolelle.",
  payments: "Näkyy vain, kun laskujen eräpäivät ovat käytössä (Lisää → Ulkoasu → Ominaisuudet) ja maksuja erääntyy kuukauden sisällä."
};

export function homeCardHtml(k, size) {
  const d = HOME_DATA[k]?.(); if (!d) return "";
  const label = esc(homeTitle(k)) + (d.count !== undefined ? ` (${d.count})` : "");
  const cls = `card hc hc-${size} ${d.cls || ""}`;
  if (size === "compact") {
    const link = !!d.href && !d.extra;
    const tag = link ? "a" : "div";
    return `<${tag} class="${cls} ${link ? "link" : ""}" ${link ? `href="${d.href}" ${d.attrs || ""}` : ""}><div class="hc-txt"><div class="card-label">${label}</div><div class="hc-v">${d.short}</div></div>${d.extra || ""}${link ? '<span class="chev">›</span>' : ""}</${tag}>`;
  }
  const link = !!d.href && !d.noFullLink;
  const tag = link ? "a" : "div";
  return `<${tag} class="${cls} ${link ? "link" : ""}" ${link ? `href="${d.href}" ${d.attrs || ""}` : ""}><div class="card-label row-between"><span>${label}</span>${d.right || ""}</div>${d.body}</${tag}>`;
}

export function vKoti() {
  const th = T();
  if (S.homeEdit && isAdmin() && S.themeDraft) return vKotiEdit();
  const greet = esc(th.text.greeting).replace(/\{nimi\}/g, esc(S.me.name)).replace(/\{tervehdys\}/g, timeGreeting());
  const body = th.home.order.filter(k => !th.home.hidden[k]).map(k => homeCardHtml(k, th.home.size[k])).join("");
  return (greet.trim() ? `<div class="hello">${greet}</div>` : "")
    + (body ? `<div class="home-grid">${body}</div>` : empty("Etusivulle ei ole valittu näytettäviä kortteja."))
    + (isAdmin() ? `<button class="btn ghost small home-edit-btn" data-action="homeEdit">✎ Muokkaa etusivua</button>` : "");
}

export function vKotiEdit() {
  const D = S.themeDraft, order = D.home.order;
  const vis = order.filter(k => !D.home.hidden[k]), hid = order.filter(k => D.home.hidden[k]);
  let h = `<div class="card he-intro"><div class="card-label">Etusivun muokkaus</div>
    <p class="small">Siirrä kortteja nuolilla, valitse koko ja piilota turhat. <b>Puolikas</b>-kortit asettuvat vierekkäin. Muut näkevät muutokset vasta, kun tallennat.</p>
    ${tText("text.greeting", "Tervehdys ({tervehdys} = Huomenta/Päivää/Iltaa, {nimi} = käyttäjän nimi, tyhjä = ei tervehdystä)", DEFAULT_THEME.text.greeting)}</div>`;
  h += `<div class="home-grid">${vis.map((k, i) => {
    const size = D.home.size[k];
    const def = HOME_CARDS.find(c => c[0] === k)[1];
    const card = homeCardHtml(k, size) || `<div class="card hc hc-${size} he-empty"><div class="card-label">${esc(homeTitle(k))}</div><div class="muted small">${esc(HOME_EMPTY[k] || "Ei näytettävää juuri nyt.")}</div></div>`;
    return `<div class="he hc-${size}" data-key="${k}">
      <div class="he-bar">
        <button class="icon-btn he-drag" aria-label="Raahaa siirtääksesi" title="Raahaa">⠿</button>
        <span class="order-btns"><button class="icon-btn" data-action="homeMove" data-key="${k}" data-dir="-1" ${i === 0 ? "disabled" : ""} aria-label="Ylös">↑</button><button class="icon-btn" data-action="homeMove" data-key="${k}" data-dir="1" ${i === vis.length - 1 ? "disabled" : ""} aria-label="Alas">↓</button></span>
        <div class="seg he-size">${HOME_SIZES.map(([z, l]) => `<button data-action="homeSize" data-key="${k}" data-size="${z}" class="${z === size ? "on" : ""}">${l}</button>`).join("")}</div>
        <button class="icon-btn" data-action="homeHide" data-key="${k}" aria-label="Piilota ${esc(def)}" title="Piilota">✕</button>
      </div>
      <input class="t-title" id="${tId("home.titles." + k)}" data-tk="home.titles.${k}" value="${esc(D.home.titles[k] || "")}" placeholder="Otsikko: ${esc(def)}" autocomplete="off">
      ${k === "notice" ? `<textarea class="t-title" id="${tId("text.notice")}" data-tk="text.notice" rows="2" placeholder="Tiedote kaikille, esim. Laituri korjataan 15.6.">${esc(D.text.notice)}</textarea>` : ""}
      <div class="he-body" aria-hidden="true">${card}</div>
    </div>`;
  }).join("")}</div>`;
  if (hid.length) h += secH("Piilotetut kortit") + `<div class="chips">${hid.map(k => `<button class="chip-btn" data-action="homeShow" data-key="${k}">+ ${esc(homeTitle(k))}</button>`).join("")}</div>`;
  h += `<button class="btn danger ghost block" data-action="homeDefaults">Palauta etusivun oletusasettelu</button>`;
  const [d, txt] = saveBarState();
  h += `<div id="t-savebar" class="savebar ${d ? "dirty" : ""}"><span class="savebar-t">${txt}</span><button class="btn ghost small" data-action="homeCancel">${d ? "Peru" : "Sulje"}</button><button class="btn primary small" data-action="themeSave" ${d ? "" : "disabled"}>Tallenna kaikille</button></div>`;
  return h;
}

// ---------- Korttien raahaus muokkaustilassa (idea 26) ----------
// Kortti otetaan kiinni ⠿-kahvasta ja vedetään paikalleen. Järjestys tallentuu luonnokseen;
// muut näkevät sen vasta, kun painetaan Tallenna kaikille.
let drag = null;
document.addEventListener("pointerdown", e => {
  const h = e.target.closest(".he-drag"); if (!h || !S.homeEdit || !S.themeDraft) return;
  const card = h.closest(".he"); if (!card) return;
  e.preventDefault();
  const r = card.getBoundingClientRect();
  drag = { card, grid: card.parentElement, offX: e.clientX - r.left, offY: e.clientY - r.top };
  card.classList.add("dragging"); document.body.classList.add("drag-active");
  h.setPointerCapture?.(e.pointerId);
});
function follow(e) {
  // Mitataan kortin luonnollinen paikka ilman siirtoa ja siirretään se sormen alle
  drag.card.style.transform = "";
  const n = drag.card.getBoundingClientRect();
  drag.card.style.transform = `translate(${e.clientX - drag.offX - n.left}px, ${e.clientY - drag.offY - n.top}px)`;
}
document.addEventListener("pointermove", e => {
  if (!drag) return;
  // Vieritetään automaattisesti, kun kortti viedään lähelle ylä- tai alareunaa
  const edge = 110;
  if (e.clientY > innerHeight - edge) window.scrollBy(0, 14); else if (e.clientY < edge) window.scrollBy(0, -14);
  drag.card.style.visibility = "hidden";
  const over = document.elementFromPoint(e.clientX, e.clientY)?.closest(".he");
  drag.card.style.visibility = "";
  if (over && over !== drag.card && over.parentElement === drag.grid) {
    const r = over.getBoundingClientRect();
    const before = over.classList.contains("hc-half") ? e.clientX < r.left + r.width / 2 : e.clientY < r.top + r.height / 2;
    drag.grid.insertBefore(drag.card, before ? over : over.nextSibling);
  }
  follow(e);
});
function endDrag() {
  if (!drag) return;
  const { card, grid } = drag; drag = null;
  card.classList.remove("dragging"); card.style.transform = ""; document.body.classList.remove("drag-active");
  const vis = [...grid.querySelectorAll(":scope > .he")].map(x => x.dataset.key);
  const D = S.themeDraft.home;
  const hidden = D.order.filter(k => D.hidden[k]);
  D.order = [...vis, ...hidden];
  render();
}
document.addEventListener("pointerup", endDrag);
document.addEventListener("pointercancel", endDrag);
