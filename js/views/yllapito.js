// =============================================================
//  Ylläpito (vain pääkäyttäjä): varmuuskopio, palautus,
//  tietokannan koko ja vanhojen kirjausten arkistointi.
// =============================================================
import { COLS, S, db, doc, collection, writeBatch, setDoc, getDoc, getDocs, deleteDoc, updateDoc, photoCache, toast, fail, nowIso, ymd, fmtDT, fmtNum, esc, isAdmin, secH, list } from "../core.js";
import { backLink, T } from "../theme.js";
import { render } from "../main.js";
import { ACTIONS } from "../actions.js";

const META_DOC = () => doc(db, "app", "meta");
const FREE_DB_BYTES = 1024 * 1024 * 1024; // Firestoren ilmainen tallennustila 1 GiB
const COL_NAMES = {
  logs: "Huollot, nuohoukset ja puut", todos: "Tehtävät", checkItems: "Kausilistojen kohdat", seasonRuns: "Kausikierrokset",
  inventory: "Inventaario", shopping: "Vie mukana ja hankittavat", payments: "Maksut", repairs: "Korjaukset",
  bookings: "Varaukset", info: "Perustiedot", contacts: "Yhteystiedot", places: "Tärkeät paikat",
  devices: "Laitteet", checks: "Tarkastukset", archive: "Arkisto"
};

// Arvio tallennetun tiedon koosta (merkkeinä ≈ tavuina)
const sizeOf = o => JSON.stringify(o ?? "").length;
const mb = b => b < 1048576 ? Math.max(1, Math.round(b / 1024)).toLocaleString("fi-FI") + " kt" : fmtNum(b / 1048576) + " Mt";

export function dbStats() {
  const rows = COLS.map(c => ({ c, n: list(c).length, bytes: list(c).reduce((s, d) => s + sizeOf(d), 0) }));
  // Kuvien koko: tarkka luku kuvien tarkistuksen jälkeen, muuten tälle laitteelle ladatut
  const photoBytes = S.photoScan ? S.photoScan.total : [...photoCache.values()].reduce((s, v) => s + (v?.length || 0), 0);
  rows.push({ c: "photos", n: S.photoScan ? S.photoScan.items.length : photoCache.size, bytes: photoBytes });
  const total = rows.reduce((s, r) => s + r.bytes, 0) + sizeOf(S.theme) + sizeOf(S.users) + sizeOf(S.pins);
  return { rows, total, photoBytes };
}

export function vYllapito() {
  if (!isAdmin()) return backLink() + `<div class="card muted">Vain pääkäyttäjä.</div>`;
  const st = dbStats();
  const pct = Math.min(100, st.total / FREE_DB_BYTES * 100);
  const meta = S.meta || {};
  let h = backLink();

  // Varmuuskopio
  h += secH("Varmuuskopio") + `<div class="card">
    <p>Lataa kaikki sovelluksen tiedot yhdeksi tiedostoksi puhelimeen tai tietokoneelle. Tiedostosta voi palauttaa kaiken, jos jotain katoaa.</p>
    <div class="dl-row"><dt>Viimeisin</dt><dd>${meta.lastBackupAt ? `${fmtDT(meta.lastBackupAt)} (${esc(meta.lastBackupBy || "")})` : '<span class="warn">Ei vielä otettu</span>'}</dd></div>
    <label class="fld-check"><input type="checkbox" id="bk-photos" checked><span>Kuvat mukaan${S.photoScan ? ` (${mb(st.photoBytes)})` : ""}</span></label>
    <div class="row-btns"><button class="btn primary" data-action="backupDownload">⬇ Lataa varmuuskopio</button>
    <label class="btn ghost file-btn">⬆ Palauta tiedostosta<input type="file" id="bk-file" accept="application/json,.json" hidden></label></div>
    <p class="form-note">Palautus korvaa nykyiset tiedot varmuuskopion tiedoilla. Ota ensin uusi varmuuskopio, jos et ole varma.</p>
  </div>`;

  // Tietokannan koko
  h += secH("Tietokannan koko") + `<div class="card">
    <div class="run-head"><div class="big">${mb(st.total)}</div><div class="muted small">ilmainen raja 1 024 Mt</div></div>
    <div class="bar"><i style="width:${Math.max(1, pct)}%;${pct > 80 ? "background:var(--bad)" : pct > 50 ? "background:var(--warn)" : ""}"></i></div>
    <p class="form-note">${pct < 50 ? "Tilaa on reilusti." : pct < 80 ? "Puolet käytössä – kuvia kannattaa karsia tai arkistoida." : "Raja lähestyy! Poista vanhoja kuvia tai arkistoi kirjauksia."} Arvio perustuu tähän laitteeseen ladattuihin tietoihin.</p>
    <table class="tbl"><thead><tr><th>Tieto</th><th class="r">Määrä</th><th class="r">Koko</th></tr></thead><tbody>
    ${st.rows.filter(r => r.n).sort((a, b) => b.bytes - a.bytes).map(r => `<tr><td>${esc(r.c === "photos" ? "Kuvat" : COL_NAMES[r.c] || r.c)}</td><td class="r">${r.n}</td><td class="r">${mb(r.bytes)}</td></tr>`).join("")}
    </tbody></table></div>`;

  // Kuvien siivous (175)
  h += photoSection();

  // Arkistointi (183)
  h += archiveSection();
  return h;
}

// ---------- Varmuuskopio ----------
function download(name, text) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
// Kuvat haetaan aina suoraan tietokannasta, koska laitteelle on voitu ladata vain osa niistä
async function buildBackup(withPhotos) {
  let photos = null;
  if (withPhotos) {
    const snap = await getDocs(collection(db, "photos"));
    photos = Object.fromEntries(snap.docs.map(d => [d.id, { data: d.data().data, createdAt: d.data().createdAt || null, createdByName: d.data().createdByName || null }]));
  }
  const collections = {};
  COLS.forEach(c => { collections[c] = Object.fromEntries(list(c).map(({ id, ...rest }) => [id, rest])); });
  return {
    app: "mokki", version: 1, createdAt: nowIso(), createdBy: S.me.name,
    users: { users: S.users, pins: S.pins }, theme: S.theme, collections,
    photos
  };
}

async function restore(data) {
  if (data?.app !== "mokki" || !data.collections) { toast("Tiedosto ei ole Mökki-varmuuskopio", true); return; }
  const n = Object.values(data.collections).reduce((s, c) => s + Object.keys(c).length, 0);
  if (!confirm(`Palautetaanko varmuuskopio ${fmtDT(data.createdAt)} (${n} kirjausta${data.photos ? ", " + Object.keys(data.photos).length + " kuvaa" : ""})?\n\nNykyiset tiedot korvataan. Tätä ei voi perua.`)) return;
  const ops = [];
  COLS.forEach(c => {
    const keep = data.collections[c] || {};
    list(c).forEach(d => { if (!keep[d.id]) ops.push(b => b.delete(doc(db, c, d.id))); });
    Object.entries(keep).forEach(([id, v]) => ops.push(b => b.set(doc(db, c, id), v)));
  });
  if (data.photos) Object.entries(data.photos).forEach(([id, v]) => ops.push(b => b.set(doc(db, "photos", id), v)));
  if (data.users?.users) ops.push(b => b.set(doc(db, "app", "users"), { users: data.users.users, pins: data.users.pins || {}, updatedAt: nowIso() }));
  if (data.theme) ops.push(b => b.set(doc(db, "app", "theme"), { ...data.theme, updatedByName: S.me.name, updatedAt: nowIso() }));
  // Firestore sallii enintään 500 muutosta yhdessä erässä
  for (let i = 0; i < ops.length; i += 400) {
    const b = writeBatch(db); ops.slice(i, i + 400).forEach(f => f(b));
    await b.commit().catch(fail);
  }
  toast(`Varmuuskopio palautettu (${ops.length} muutosta)`);
}

document.addEventListener("change", async e => {
  if (e.target.id !== "bk-file" || !e.target.files[0]) return;
  try { await restore(JSON.parse(await e.target.files[0].text())); }
  catch (err) { toast("Tiedoston lukeminen epäonnistui", true); }
  e.target.value = "";
});

Object.assign(ACTIONS, {
  backupDownload: async () => {
    if (!isAdmin()) return;
    const withPhotos = document.getElementById("bk-photos")?.checked !== false;
    toast("Kootaan varmuuskopiota…");
    let data;
    try { data = await buildBackup(withPhotos); } catch (e) { fail(e); return; }
    download(`mokki-varmuuskopio-${ymd(new Date())}.json`, JSON.stringify(data));
    const m = { lastBackupAt: nowIso(), lastBackupBy: S.me.name };
    S.meta = { ...(S.meta || {}), ...m };
    setDoc(META_DOC(), m, { merge: true }).catch(fail);
    toast("Varmuuskopio ladattu"); render();
  }
});

// Ylläpitotiedot (viimeisin varmuuskopio) luetaan kerran sivulle tultaessa
export async function loadMeta() {
  try { const s = await getDoc(META_DOC()); S.meta = s.exists() ? s.data() : {}; render(); } catch { }
}

// ---------- Arkistointi (183) ----------
// Yli vuoden vanhat tehdyt tehtävät ja hoidetut ostokset siirretään arkistoon.
// Mitään ei poisteta: arkistosta voi palauttaa.
const ARCHIVABLE = [["todos", "doneAt", "Tehdyt tehtävät"], ["shopping", "doneAt", "Hoidetut ostokset ja hankinnat"]];
function archiveCandidates(days) {
  const limit = new Date(Date.now() - days * 864e5).toISOString();
  return ARCHIVABLE.flatMap(([c, f]) => list(c).filter(x => x.done && x[f] && x[f] < limit).map(x => ({ c, x })));
}
function archiveSection() {
  const days = S.archiveDays || 365;
  const cand = archiveCandidates(days);
  const arch = list("archive");
  return secH("Arkistointi") + `<div class="card">
    <p>Siirrä vanhat tehdyt kirjaukset arkistoon, jotta listat pysyvät siisteinä. Mitään ei poisteta.</p>
    <label class="fld"><span>Arkistoi vanhemmat kuin</span><select id="arch-days">${[[90, "3 kuukautta"], [180, "6 kuukautta"], [365, "1 vuosi"], [730, "2 vuotta"]].map(([d, l]) => `<option value="${d}" ${d === days ? "selected" : ""}>${l}</option>`).join("")}</select></label>
    <p>${ARCHIVABLE.map(([c, , l]) => `${l}: <b>${cand.filter(k => k.c === c).length}</b>`).join(" · ")}</p>
    <div class="row-btns"><button class="btn" data-action="archiveRun" ${cand.length ? "" : "disabled"}>Arkistoi ${cand.length} kirjausta</button>
    ${arch.length ? `<button class="btn ghost" data-action="archiveShow">Näytä arkisto (${arch.length})</button>` : ""}</div>
  </div>`;
}
document.addEventListener("change", e => { if (e.target.id === "arch-days") { S.archiveDays = Number(e.target.value); render(); } });

Object.assign(ACTIONS, {
  archiveRun: async () => {
    const cand = archiveCandidates(S.archiveDays || 365);
    if (!cand.length || !confirm(`Siirretäänkö ${cand.length} vanhaa kirjausta arkistoon?`)) return;
    for (let i = 0; i < cand.length; i += 200) {
      const b = writeBatch(db);
      cand.slice(i, i + 200).forEach(({ c, x }) => {
        const { id, ...rest } = x;
        b.set(doc(db, "archive", c + "_" + id), { col: c, origId: id, data: rest, archivedAt: nowIso(), archivedBy: S.me.name });
        b.delete(doc(db, c, id));
      });
      await b.commit().catch(fail);
    }
    toast(`${cand.length} kirjausta arkistoitu`);
  },
  archiveShow: () => {
    const arch = list("archive").sort((a, b) => (b.data?.doneAt || "").localeCompare(a.data?.doneAt || ""));
    const m = document.getElementById("modal");
    m.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><div class="sheet-head"><h2>Arkisto</h2><button type="button" class="icon-btn" data-mclose aria-label="Sulje">✕</button></div>
      <div class="sheet-body"><div class="list">${arch.map(a => `<div class="item"><div class="item-row"><div class="item-main"><div class="item-title">${esc(a.data?.text || a.data?.title || "")}</div><div class="by">${esc(a.col === "todos" ? "Tehtävä" : "Ostos")} · ✓ ${esc(a.data?.doneByName || "")} ${fmtDT(a.data?.doneAt)}</div></div><button class="btn small ghost" data-arch-restore="${esc(a.id)}">Palauta</button></div></div>`).join("") || '<div class="empty">Arkisto on tyhjä.</div>'}</div></div></div>`;
    m.classList.add("open");
    m.onclick = async e => {
      const r = e.target.closest("[data-arch-restore]");
      if (r) {
        const a = list("archive").find(x => x.id === r.dataset.archRestore); if (!a) return;
        const b = writeBatch(db); b.set(doc(db, a.col, a.origId), a.data); b.delete(doc(db, "archive", a.id)); await b.commit().catch(fail);
        r.closest(".item").remove(); toast("Palautettu");
        return;
      }
      if (e.target === m || e.target.closest("[data-mclose]")) { m.classList.remove("open"); m.innerHTML = ""; m.onclick = null; }
    };
  }
});

// ---------- Kuvien siivous (175) ----------
// Etsii kaikki kuvat, kertoo niiden koon ja mihin kirjaukseen ne kuuluvat.
// Käyttämättömät kuvat (kirjaus poistettu, lomake suljettu kesken) voi poistaa kerralla.
function photoRefs() {
  const refs = new Map();
  const label = d => d.title || d.name || d.text || d.label || d.who || "";
  COLS.forEach(c => list(c).forEach(d => {
    const src = c === "archive" ? d.data || {} : d;
    (Array.isArray(src.photos) ? src.photos : []).forEach(id => refs.set(id, { col: c === "archive" ? "archive" : c, docId: d.id, title: label(src) }));
  }));
  return refs;
}
async function scanPhotos() {
  S.photoScanning = true; render();
  try {
    const snap = await getDocs(collection(db, "photos"));
    const refs = photoRefs();
    const items = snap.docs.map(d => { const data = d.data().data || ""; photoCache.set(d.id, data); return { id: d.id, bytes: data.length, at: d.data().createdAt, by: d.data().createdByName, ref: refs.get(d.id) || null }; });
    items.sort((a, b) => b.bytes - a.bytes);
    S.photoScan = { items, total: items.reduce((s, i) => s + i.bytes, 0), at: nowIso() };
  } catch (e) { fail(e); }
  S.photoScanning = false; render();
}
function photoSection() {
  const sc = S.photoScan;
  let h = secH("Kuvat") + `<div class="card"><p>Näe, mitkä kuvat vievät eniten tilaa, ja poista käyttämättömät kuvat, jotka eivät enää näy missään.</p>
    <button class="btn" data-action="photoScan" ${S.photoScanning ? "disabled" : ""}>${S.photoScanning ? "Tarkistetaan…" : sc ? "↻ Tarkista uudelleen" : "🔍 Tarkista kuvat"}</button>`;
  if (!sc) return h + `<p class="form-note">Tarkistus lataa kaikki kuvat kerran tälle laitteelle.</p></div>`;
  const unused = sc.items.filter(i => !i.ref);
  const ub = unused.reduce((s, i) => s + i.bytes, 0);
  h += `<div class="stat-grid t-stats"><div><div class="card-label">Kuvia</div><div class="big">${sc.items.length}</div><div class="muted small">${mb(sc.total)}</div></div>
    <div><div class="card-label">Käyttämättömiä</div><div class="big ${unused.length ? "warn" : "ok"}">${unused.length}</div><div class="muted small">${mb(ub)}</div></div></div>`;
  if (unused.length) h += `<button class="btn danger ghost block" data-action="photoDelUnused">Poista ${unused.length} käyttämätöntä kuvaa (${mb(ub)})</button>`;
  h += `</div>`;
  if (sc.items.length) h += `<div class="card-label" style="margin:4px 4px 0">Isoimmat kuvat</div><div class="list">${sc.items.slice(0, 30).map(i => `<div class="item"><div class="item-row">
      <img class="thumb small-thumb" data-photo="${esc(i.id)}" alt="">
      <div class="item-main"><div class="item-title">${mb(i.bytes)}</div><div class="by">${i.ref ? esc((COL_NAMES[i.ref.col] || i.ref.col) + (i.ref.title ? ": " + i.ref.title : "")) : '<span class="warn">Ei käytössä missään</span>'}${i.by ? " · " + esc(i.by) : ""}</div></div>
      <button class="icon-btn" data-action="photoDel" data-id="${esc(i.id)}" aria-label="Poista kuva">🗑</button></div></div>`).join("")}</div>`;
  return h;
}
function dropFromScan(ids) {
  if (!S.photoScan) return;
  S.photoScan.items = S.photoScan.items.filter(i => !ids.includes(i.id));
  S.photoScan.total = S.photoScan.items.reduce((s, i) => s + i.bytes, 0);
}
Object.assign(ACTIONS, {
  photoScan: () => { if (isAdmin()) scanPhotos(); },
  photoDel: async d => {
    const it = S.photoScan?.items.find(i => i.id === d.id); if (!it) return;
    const where = it.ref ? `\n\nKuva on käytössä: ${COL_NAMES[it.ref.col] || it.ref.col}${it.ref.title ? " – " + it.ref.title : ""}. Se poistetaan myös sieltä.` : "";
    if (!confirm(`Poistetaanko kuva (${mb(it.bytes)})?${where}`)) return;
    if (it.ref && it.ref.col !== "archive") {
      const owner = list(it.ref.col).find(x => x.id === it.ref.docId);
      if (owner) await updateDoc(doc(db, it.ref.col, owner.id), { photos: (owner.photos || []).filter(p => p !== it.id) }).catch(fail);
    }
    await deleteDoc(doc(db, "photos", it.id)).catch(fail);
    photoCache.delete(it.id); dropFromScan([it.id]); toast("Kuva poistettu"); render();
  },
  photoDelUnused: async () => {
    const ids = (S.photoScan?.items || []).filter(i => !i.ref).map(i => i.id);
    if (!ids.length || !confirm(`Poistetaanko ${ids.length} käyttämätöntä kuvaa? Niitä ei näy missään sovelluksessa.`)) return;
    for (let i = 0; i < ids.length; i += 400) {
      const b = writeBatch(db); ids.slice(i, i + 400).forEach(id => b.delete(doc(db, "photos", id)));
      await b.commit().catch(fail);
    }
    ids.forEach(id => photoCache.delete(id)); dropFromScan(ids);
    toast(`${ids.length} kuvaa poistettu`); render();
  }
});
