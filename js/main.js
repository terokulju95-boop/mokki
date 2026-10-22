import { iconSrc, listenIcon } from "./views/teemat.js";
import { vLaitteet } from "./views/laitteet.js";
// Sovelluksen käynnistys: näkymät, renderöinti, reititys ja kirjautuminen
import { vYllapito, loadMeta } from "./views/yllapito.js";
import { updateNet } from "./actions.js";
import { $, ADMIN_NAME, COLS, DEFAULT_USERS, ICONS, LOGIN_EMAIL, NAV, S, USERS_DOC, USER_KEY, auth, collection, colorFor, db, esc, fail, getInfo, hydratePhotos, initials, isAdmin, nowIso, onAuthStateChanged, onSnapshot, photoCache, sendPasswordResetEmail, setDoc, signInWithEmailAndPassword, toast } from "./core.js";
import { T, THEME_DOC, appName, applyTheme, cacheTheme, discardThemeDraft, mergeTheme, navKeys, previewTheme, themeDirty } from "./theme.js";
import { vKayttajat, vLisaa, vProfiili, vUlkoasu } from "./views/asetukset.js";
import { vHuolto, vHuoltotyot, vTodos } from "./views/huolto.js";
import { vKausi } from "./views/kausi.js";
import { vKoti } from "./views/koti.js";
import { vKulut } from "./views/kulut.js";
import { vTavarat } from "./views/tavarat.js";
import { vKorjaukset, vPerustiedot, vVaraukset } from "./views/tiedot.js";

export const VIEWS = {
  koti: { title: () => getInfo().name || appName(), render: vKoti },
  huolto: { title: () => "Nuohous ja puut", render: vHuolto },
  huoltotyot: { title: () => "Huoltotyöt", render: vHuoltotyot },
  tehtavat: { title: () => "Tehtävät", render: () => vTodos() },
  kausi: { title: () => "Kausilistat", render: vKausi },
  tavarat: { title: () => "Tavarat", render: vTavarat },
  kulut: { title: () => "Kulut", render: vKulut },
  lisaa: { title: () => "Lisää", render: vLisaa },
  perustiedot: { title: () => "Perustiedot", render: vPerustiedot },
  varaukset: { title: () => "Varauskalenteri", render: vVaraukset },
  korjaukset: { title: () => "Korjaussuunnitelma", render: vKorjaukset },
  kayttajat: { title: () => "Käyttäjät", render: vKayttajat },
  profiili: { title: () => "Oma profiili", render: vProfiili },
  ulkoasu: { title: () => "Ulkoasu ja ominaisuudet", render: vUlkoasu },
  yllapito: { title: () => "Ylläpito", render: vYllapito },
  laitteet: { title: () => S.deviceOpen ? "Laite" : "Laitteet", render: vLaitteet }
};

// ---------- Renderöinti ----------
export let rq = false;
export function scheduleRender() { if (rq) return; rq = true; requestAnimationFrame(() => { rq = false; render(); }); }
export function render() {
  if (!S.me || !S.started) return;
  const view = $("#view");
  const a = document.activeElement;
  const keep = a && view.contains(a) && a.id ? { id: a.id, val: a.value, s: a.selectionStart } : null;
  if (S.view === "ulkoasu" && isAdmin() && !S.themeDraft) {
    S.themeDraft = structuredClone(S.theme);
    S.themePal = S.theme.mode !== "auto" ? S.theme.mode : (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    previewTheme();
  }
  const V = VIEWS[S.view] || VIEWS.koti;
  $("#title").textContent = V.title();
  document.title = V.title() === appName() ? appName() : V.title() + " · " + appName();
  view.innerHTML = V.render();
  if (S.animate) {
    // Sivun vaihtuessa sisältö liukuu esiin porrastetusti
    S.animate = false;
    [...view.children].slice(0, 12).forEach((el, i) => el.style.setProperty("--i", i));
    view.classList.remove("enter"); void view.offsetWidth; view.classList.add("enter");
  }
  renderNav();
  if (keep) {
    const el = document.getElementById(keep.id);
    if (el) { el.value = keep.val; el.focus(); try { el.setSelectionRange(keep.s, keep.s); } catch { } }
  }
  hydratePhotos(view);
}
export function renderNav() {
  const keys = navKeys();
  const active = keys.includes(S.view) ? S.view : "lisaa";
  const pending = isAdmin() ? S.users.filter(u => !S.pins[u]).length : 0;
  const labels = T().text.nav;
  const nav = $("#nav");
  nav.style.gridTemplateColumns = `repeat(${keys.length}, 1fr)`;
  nav.classList.toggle("many", keys.length > 6);
  nav.innerHTML = NAV.filter(([k]) => keys.includes(k)).sort((a, b) => keys.indexOf(a[0]) - keys.indexOf(b[0])).map(([k, l]) => `<a href="#${k}" class="${k === active ? "on" : ""}" ${k === active ? 'aria-current="page"' : ""}><svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[k]}</svg><span>${esc(labels[k] || l)}</span>${k === "lisaa" && pending ? `<b class="badge">${pending}</b>` : ""}</a>`).join("");
}
export function routeFromHash() { const h = location.hash.slice(1); S.view = VIEWS[h] ? h : "koti"; }
window.addEventListener("hashchange", () => {
  const prev = S.view;
  routeFromHash();
  if (S.view === "yllapito" && prev !== "yllapito") loadMeta();
  if (S.view !== "laitteet") S.deviceOpen = null;
  const editing = prev === "ulkoasu" ? !S.homeEdit : (prev === "koti" && S.homeEdit);
  if (editing && S.view !== prev && S.themeDraft) {
    if (themeDirty() && !confirm("Muutoksia ei ole tallennettu. Hylätäänkö ne?")) { location.hash = prev; return; }
    discardThemeDraft();
  }
  previewTheme();
  S.animate = true;
  S.editOrder = false; window.scrollTo(0, 0); render();
});


// =============================================================
//  KIRJAUTUMINEN: yhteinen Firebase-tunnus + oma nimi ja PIN
// =============================================================
export function authError(e) {
  const c = e?.code || "";
  if (c.includes("invalid-credential") || c.includes("wrong-password") || c.includes("user-not-found")) return "Väärä salasana.";
  if (c.includes("network-request-failed")) return "Ei verkkoyhteyttä.";
  if (c.includes("too-many-requests")) return "Liian monta yritystä. Odota hetki.";
  if (c.includes("api-key") || c.includes("configuration")) return "Firebase-asetukset puuttuvat (firebase-config.js).";
  return "Virhe: " + (e?.message || c);
}

export const cabinLogo = () => iconSrc() ? `<img class="auth-logo" src="${iconSrc()}" alt="">` : CABIN_SVG;
export const CABIN_SVG = `<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="16" fill="#2f5d46"/><path d="M12 33 32 15l20 18" fill="none" stroke="#f3efe4" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M17 30v18h30V30" fill="#f3efe4"/><rect x="28" y="36" width="8" height="12" rx="1" fill="#2f5d46"/><rect x="40" y="18" width="5" height="9" fill="#f3efe4"/></svg>`;

export function showOnly(id) {
  ["boot", "auth", "app"].forEach(x => { const el = document.getElementById(x); if (el) el.hidden = x !== id; });
}
export function showMessage(msg, isErr = false) {
  showOnly("auth");
  $("#auth").innerHTML = `<div class="auth-card">${cabinLogo()}<p class="${isErr ? "bad" : "muted"}">${esc(msg)}</p></div>`;
}

// 1) Laitteen kirjautuminen yhteisellä tunnuksella
export function showDeviceLogin() {
  showOnly("auth");
  $("#auth").innerHTML = `<div class="auth-card">${cabinLogo()}<h1>${esc(appName())}</h1>${T().text.tagline ? `<p class="muted">${esc(T().text.tagline)}</p>` : ""}
    <form id="authform" class="form">
      <input type="email" name="email" value="${esc(LOGIN_EMAIL)}" autocomplete="username" hidden>
      <label class="fld"><span>Yhteinen salasana</span><input name="password" type="password" required autocomplete="current-password"></label>
      <div class="auth-err" id="autherr" role="alert"></div>
      <button class="btn primary block">Kirjaudu</button>
    </form>
    <p class="form-note">Tämä tehdään vain kerran laitteella. Sen jälkeen valitset oman nimesi ja PIN-koodisi.</p>
    <button class="link-btn muted" id="auth-reset">Unohtuiko salasana?</button>
  </div>`;
  const form = $("#authform"), err = $("#autherr");
  $("#auth-reset").onclick = async () => {
    try { await sendPasswordResetEmail(auth, LOGIN_EMAIL); err.className = "auth-err ok"; err.textContent = "Vaihtolinkki lähetetty osoitteeseen " + LOGIN_EMAIL; }
    catch (e) { err.textContent = authError(e); }
  };
  form.onsubmit = async e => {
    e.preventDefault(); err.className = "auth-err"; err.textContent = "";
    const btn = form.querySelector("button"); btn.disabled = true; btn.textContent = "Kirjaudutaan…";
    try { await signInWithEmailAndPassword(auth, LOGIN_EMAIL, form.elements.password.value); }
    catch (ex) { err.textContent = authError(ex); btn.disabled = false; btn.textContent = "Kirjaudu"; }
  };
}

// 2) Oman nimen valinta
export function showPicker() {
  S.authView = "picker";
  showOnly("auth");
  $("#auth").innerHTML = `<div class="auth-card">${cabinLogo()}<h1>Kuka olet?</h1>
    <div class="picker">${S.users.map(u => `<button class="pick-btn ${u === ADMIN_NAME ? "admin" : ""}" data-name="${esc(u)}"><span class="avatar" style="background:${colorFor(u)}">${esc(initials(u))}</span><span>${u === ADMIN_NAME ? "👑 " : ""}${esc(u)}</span></button>`).join("")}</div>
  </div>`;
  $("#auth").querySelectorAll(".pick-btn").forEach(b => b.onclick = () => showPinPad(b.dataset.name));
}

// 3) PIN-koodi
export function showPinPad(name) {
  let buf = "";
  S.authView = "pin";
  showOnly("auth");
  $("#auth").innerHTML = `<div class="auth-card">
    <button class="link-btn back-btn" id="pin-back">‹ Takaisin</button>
    <span class="avatar big-avatar" style="background:${colorFor(name)}">${esc(initials(name))}</span>
    <h1>${name === ADMIN_NAME ? "👑 " : ""}${esc(name)}</h1><p class="muted">Syötä PIN-koodi</p>
    <div class="pin-dots" id="pin-dots"></div>
    <div class="auth-err" id="pin-err" role="alert"></div>
    <div class="pinpad">${["1", "2", "3", "4", "5", "6", "7", "8", "9", "clear", "0", "back"].map(k => `<button class="pin-key ${k.length > 1 ? "fn" : ""}" data-k="${k}" aria-label="${k === "back" ? "Poista" : k === "clear" ? "Tyhjennä" : k}">${k === "back" ? "⌫" : k === "clear" ? "C" : k}</button>`).join("")}</div>
  </div>`;
  const dots = () => $("#pin-dots").innerHTML = [0, 1, 2, 3].map(i => `<i class="${i < buf.length ? "on" : ""}"></i>`).join("");
  const err = t => $("#pin-err").textContent = t;
  dots();
  $("#pin-back").onclick = showPicker;
  const press = k => {
    if (k === "clear") { buf = ""; err(""); return dots(); }
    if (k === "back") { buf = buf.slice(0, -1); err(""); return dots(); }
    if (buf.length >= 4) return;
    buf += k; dots();
    if (buf.length < 4) return;
    const stored = S.pins[name];
    if (!stored) {
      if (name === ADMIN_NAME) { loginAs(name); toast("Aseta itsellesi PIN: Lisää → Oma profiili", false); return; }
      err(`PIN-koodia ei ole asetettu. Pyydä ${ADMIN_NAME}a asettamaan se.`); buf = ""; return setTimeout(dots, 200);
    }
    if (buf === stored) return loginAs(name);
    err("Väärä PIN-koodi."); buf = ""; setTimeout(dots, 200);
    $("#pin-dots").classList.remove("shake"); void $("#pin-dots").offsetWidth; $("#pin-dots").classList.add("shake");
  };
  $("#auth").querySelectorAll(".pin-key").forEach(b => b.onclick = () => press(b.dataset.k));
  document.onkeydown = e => {
    if ($("#pin-dots") == null) { document.onkeydown = null; return; }
    if (/^\d$/.test(e.key)) press(e.key);
    else if (e.key === "Backspace") press("back");
  };
}

export function loginAs(name) {
  document.onkeydown = null; S.authView = null;
  S.me = { name };
  try { localStorage.setItem(USER_KEY, name); } catch { }
  startApp();
}
export function switchUser() {
  try { localStorage.removeItem(USER_KEY); } catch { }
  stopData(); S.me = null; S.d = {}; S.tab = {}; S.editOrder = false;
  discardThemeDraft();
  location.hash = "";
  showPicker();
}

export function saveUsers(users, pins) {
  S.users = users; S.pins = pins;
  setDoc(USERS_DOC(), { users, pins, updatedAt: nowIso() }).catch(fail);
  scheduleRender();
}

export function startData() {
  stopData();
  S.started = true;
  S.pending = {};
  COLS.forEach(c => {
    // includeMetadataChanges: saadaan tieto, mitkä muutokset odottavat vielä lähetystä palvelimelle
    S.unsubs.push(onSnapshot(collection(db, c), { includeMetadataChanges: true }, snap => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const changed = JSON.stringify(docs) !== JSON.stringify(S.d[c]);
      S.d[c] = docs;
      S.pending[c] = snap.docs.filter(d => d.metadata?.hasPendingWrites).length;
      updateNet();
      if (changed) scheduleRender();
    }, err => console.error(c, err)));
  });
  // Kuvat ladataan välimuistiin, jotta ne näkyvät mökillä myös ilman verkkoa
  S.unsubs.push(onSnapshot(collection(db, "photos"), snap => {
    snap.docs.forEach(d => photoCache.set(d.id, d.data().data));
    hydratePhotos($("#view"));
  }, err => console.error("photos", err)));
}
export function stopData() { S.unsubs.forEach(u => u()); S.unsubs = []; S.started = false; }

export function startApp() {
  if (isAdmin() && !S.meta) loadMeta();
  if (!S.started) { startData(); routeFromHash(); }
  showOnly("app");
  updateNet();
  render();
}

// Kun käyttäjälista on ladattu, jatketaan oikeaan näkymään
export function afterUsersLoaded() {
  if (S.me) {
    if (!S.users.includes(S.me.name)) { switchUser(); return; }
    scheduleRender(); return;
  }
  if (S.authView === "pin") return;
  let saved = null; try { saved = localStorage.getItem(USER_KEY); } catch { }
  if (saved && S.users.includes(saved)) loginAs(saved);
  else showPicker();
}

export function onThemeSnap(snap) {
  if (!snap.exists() && snap.metadata.fromCache) return; // ei tietoa vielä → pidetään laitteen muistama teema
  const data = snap.exists() ? snap.data() : {};
  S.theme = mergeTheme(data);
  S.themeMeta = data.updatedAt ? { by: data.updatedByName, at: data.updatedAt } : null;
  cacheTheme();
  if (!S.themeDraft) applyTheme(S.theme);
  if (S.me && S.started) scheduleRender();
}

export let usersUnsub = null, themeUnsub = null, iconUnsub = null;
onAuthStateChanged(auth, user => {
  S.user = user;
  if (usersUnsub) { usersUnsub(); usersUnsub = null; }
  if (themeUnsub) { themeUnsub(); themeUnsub = null; }
  stopData(); S.me = null; S.d = {}; S.usersLoaded = false;
  discardThemeDraft();
  if (!user) { showDeviceLogin(); return; }
  themeUnsub = onSnapshot(THEME_DOC(), onThemeSnap, err => console.warn("theme", err));
  if (iconUnsub) iconUnsub();
  iconUnsub = listenIcon();
  showMessage("Ladataan…");
  usersUnsub = onSnapshot(USERS_DOC(), snap => {
    if (!snap.exists()) {
      if (snap.metadata.fromCache) {
        if (!navigator.onLine) showMessage("Ensimmäinen käynnistys vaatii verkkoyhteyden.", true);
        return;
      }
      saveUsers([...DEFAULT_USERS], {});
    } else {
      const d = snap.data();
      S.users = Array.isArray(d.users) && d.users.length ? d.users : [...DEFAULT_USERS];
      S.pins = d.pins || {};
    }
    S.usersLoaded = true;
    afterUsersLoaded();
  }, err => {
    console.error(err);
    showMessage(err.code === "permission-denied"
      ? "Ei käyttöoikeutta tietokantaan. Tarkista Firestoren säännöt (UID)."
      : "Yhteysvirhe: " + err.message, true);
  });
});

// ---------- PWA ----------
// Kun uusi versio on julkaistu, näytetään "Päivitä"-ilmoitus (idea 190).
if ("serviceWorker" in navigator && location.protocol === "https:") {
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register("sw.js").then(reg => {
    // Tarkistetaan päivitykset aina, kun sovellus tuodaan taas näkyviin
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") reg.update().catch(() => { }); });
  }).catch(e => console.warn("SW", e));
  navigator.serviceWorker.addEventListener("controllerchange", () => { if (hadController) showUpdateBanner(); });
}
export function showUpdateBanner() {
  if (document.getElementById("update-banner")) return;
  const b = document.createElement("div");
  b.id = "update-banner"; b.className = "update-banner";
  b.innerHTML = `<span>✨ Uusi versio saatavilla</span><button class="btn small primary" type="button">Päivitä</button>`;
  b.querySelector("button").onclick = () => location.reload();
  document.body.appendChild(b);
}
