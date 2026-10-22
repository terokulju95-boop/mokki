import { T } from "../theme.js";
import { $, S, curTab, esc, fmtDT, list, nl2br, nowIso, save, seg, thumbs } from "../core.js";
import { backLink } from "../theme.js";

// ---------- Kausilistat ----------
// Kevään lista maalis–elokuu, talven lista syys–helmikuu.
export const SEASON_NAMES = { talvi: "❄️ Talviteloille", kevat: "🌱 Kevään käyttöönotto" };
// Kausien alkukuukaudet säädetään Ulkoasu → Ominaisuudet (idea 68). Oletus: kevät maaliskuu, talvi syyskuu.
export const seasonStart = season => T().seasons[season];
export const seasonByMonth = () => {
  const m = new Date().getMonth() + 1, k = seasonStart("kevat"), t = seasonStart("talvi");
  const inSpring = k < t ? m >= k && m < t : !(m >= t && m < k);
  return inSpring ? "kevat" : "talvi";
};
export const defaultSeason = seasonByMonth;
// Kausi lasketaan alkaneeksi kaksi kuukautta ennen virallista alkua, jotta etuajassa aloitettu lista pysyy voimassa.
export function runThreshold(season) {
  const d = new Date(), y = d.getFullYear(), m = d.getMonth() + 1, sm = seasonStart(season);
  return new Date(m >= sm ? y : y - 1, sm - 3, 1).toISOString();
}
export const seasonItems = season => list("checkItems").filter(i => i.season === season).sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || (a.createdAt || "").localeCompare(b.createdAt || ""));
export const seasonRuns = season => list("seasonRuns").filter(r => r.season === season).sort((a, b) => (b.startedAt || "").localeCompare(a.startedAt || ""));
// Kuluvan kauden kierros. Edellisvuoden kierros jää historiaan, ja uusi alkaa automaattisesti ensimmäisestä ruksista.
export const currentRun = season => { const r = seasonRuns(season)[0]; return r && (r.startedAt || "") >= runThreshold(season) ? r : null; };

export function startRun(season) {
  const y = new Date().getFullYear();
  return save("seasonRuns", { season, label: (season === "talvi" ? "Talviteloille " : "Kevään käyttöönotto ") + y, startedAt: nowIso(), startedByName: S.me.name, completed: {} });
}

export function vKausi() {
  const season = curTab("kausi", defaultSeason());
  const items = seasonItems(season);
  const run = currentRun(season);
  const done = run?.completed || {};
  const doneCount = items.filter(i => done[i.id]).length;
  let h = backLink() + seg("kausi", [["talvi", SEASON_NAMES.talvi], ["kevat", SEASON_NAMES.kevat]], defaultSeason());

  if (run) {
    const pct = items.length ? Math.round(doneCount / items.length * 100) : 0;
    h += `<div class="card run"><div class="run-head"><div><div class="card-label">Käynnissä oleva kausi</div><div class="big">${esc(run.label)}</div><div class="muted small">Aloitti ${esc(run.startedByName)} ${fmtDT(run.startedAt)}</div></div><div class="pct ${pct === 100 ? "ok" : ""}">${doneCount}/${items.length}</div></div><div class="bar"><i style="width:${pct}%"></i></div>${pct === 100 && items.length ? '<div class="done-msg">✓ Kaikki tehty!</div>' : ""}</div>`;
  } else if (items.length) {
    h += `<div class="card muted">Tämän kauden lista on vielä koskematon. Kausi alkaa automaattisesti, kun merkitset ensimmäisen kohdan tehdyksi. Napauta kohtaa merkitäksesi sen, kynästä ✎ voit muokata.</div>`;
  }

  if (!items.length) {
    h += `<div class="card center"><p>Lista on tyhjä.</p><button class="btn primary" data-action="seedItems" data-season="${season}">Lisää valmiit oletuskohdat</button><p class="form-note">Kohtia voi muokata, järjestää ja poistaa jälkeenpäin.</p></div>`;
  } else {
    h += `<div class="list">${items.map((it, idx) => checkItemRow(it, done[it.id], idx, items.length)).join("")}</div>`;
  }

  h += `<div class="row-btns wrap">
    <button class="btn" data-action="addItem" data-season="${season}">+ Lisää kohta</button>
    ${items.length > 1 ? `<button class="btn ghost" data-action="toggleOrder">${S.editOrder ? "✓ Valmis" : "↕ Järjestä"}</button>` : ""}
    ${run ? `<button class="btn ghost" data-action="newRun" data-season="${season}">↻ Aloita uusi kausi</button>` : ""}
    ${seasonRuns(season).length ? `<button class="btn ghost" data-action="runHistory" data-season="${season}">Historia</button>` : ""}
  </div>`;
  return h;
}

export function checkItemRow(it, d, idx, n) {
  const open = S.expanded.has(it.id);
  const hasMore = it.instructions || it.photos?.length;
  return `<div class="item ${d ? "is-done" : ""}">
    <div class="item-row" data-action="toggleCheck" data-id="${it.id}" role="button" aria-label="${d ? "Peru merkintä" : "Merkitse tehdyksi"}: ${esc(it.title)}">
      <span class="check ${d ? "on" : ""}"></span>
      <div class="item-main">
        <div class="item-title">${esc(it.title)}${hasMore ? ` <button class="info-dot" data-action="expand" data-id="${it.id}" aria-label="Näytä ohje">${it.photos?.length ? "📷" : "ⓘ"} ${open ? "piilota" : "ohje"}</button>` : ""}</div>
        ${d ? `<div class="by">✓ ${esc(d.byName)} · ${fmtDT(d.at)}</div>` : ""}
      </div>
      ${S.editOrder
        ? `<div class="order-btns"><button class="icon-btn" data-action="moveItem" data-id="${it.id}" data-dir="-1" ${idx === 0 ? "disabled" : ""} aria-label="Ylös">↑</button><button class="icon-btn" data-action="moveItem" data-id="${it.id}" data-dir="1" ${idx === n - 1 ? "disabled" : ""} aria-label="Alas">↓</button></div>`
        : `<button class="icon-btn" data-action="editItem" data-id="${it.id}" aria-label="Muokkaa">✎</button>`}
    </div>
    ${open && hasMore ? `<div class="item-more">${it.instructions ? `<p>${nl2br(it.instructions)}</p>` : ""}${thumbs(it.photos)}</div>` : ""}
  </div>`;
}
