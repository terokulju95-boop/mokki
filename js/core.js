// =============================================================
//  Mökki – perheen yhteinen mökkikirja
//  Pelkkä HTML/JS + Firebase (Auth + Firestore, offline-tuki)
// =============================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  initializeFirestore, getFirestore, persistentLocalCache, persistentMultipleTabManager,
  collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot, getDoc, getDocs, writeBatch, deleteField
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig, LOGIN_EMAIL, ADMIN_NAME, DEFAULT_USERS, CABIN_NAME } from "../firebase-config.js";

// ---------- Firebase ----------
export const fbApp = initializeApp(firebaseConfig);
export const auth = getAuth(fbApp);
export let db;
try {
  db = initializeFirestore(fbApp, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
  });
} catch (e) {
  console.warn("Offline-välimuisti ei käytössä", e);
  db = getFirestore(fbApp);
}

// ---------- Vakiot ----------
export const USER_KEY = "mokki_user";
export const USERS_DOC = () => doc(db, "app", "users");
export const COLS = ["logs", "todos", "checkItems", "seasonRuns", "inventory", "shopping",
  "payments", "repairs", "bookings", "info", "contacts", "places", "devices", "checks", "archive"];



export const ICONS = {
  koti: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h5v-6h4v6h5V9.5"/>',
  huolto: '<path d="M12 3c.6 3.4 5 5.6 5 10.2A5 5 0 0 1 7 13.2c0-2.4 1.3-4 2.4-5 .3 1.8 1.2 2.8 2.5 3.2.6-2.7-.4-5.6.1-8.4z"/>',
  huoltotyot: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9l-3.8 3.8z"/>',
  tehtavat: '<path d="M3 6.5 5 8.5 9 4.5"/><path d="M3 13.5 5 15.5 9 11.5"/><path d="M13 7h8M13 14h8M13 20h8"/>',
  kausi: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="m9 15 2 2 4-4"/>',
  tavarat: '<path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z"/><path d="m3 7.5 9 4.5 9-4.5M12 12v9"/>',
  kulut: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.6a4 4 0 1 0 0 6.8M7.5 11h6M7.5 13.2h6"/>',
  varaukset: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M7.5 14h3M13.5 14h3M7.5 17.5h3"/>',
  korjaukset: '<path d="M3 21h18"/><path d="M5 21V10l7-5 7 5v11"/><path d="M10 21v-5h4v5"/>',
  laitteet: '<path d="M9 3v5M15 3v5"/><path d="M6 8h12v3a6 6 0 0 1-12 0z"/><path d="M12 17v4"/>',
  perustiedot: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  lisaa: '<path d="M4 6h16M4 12h16M4 18h16"/>'
};
// Osiot, joita pääkäyttäjä voi sijoittaa alavalikkoon. Loput näkyvät Lisää-valikossa.
// [avain, lyhyt nimi alavalikossa, emoji, nimi Lisää-valikossa, kuvaus]
export const SECTIONS = [
  ["huolto", "Lämmitys", "🔥", "Nuohous ja puut", "Edellinen nuohous ja puutilaukset"],
  ["huoltotyot", "Huollot", "🔧", "Huoltotyöt", "Tehdyt huoltotyöt"],
  ["tehtavat", "Tehtävät", "✅", "Tehtävät", "Tulevat tehtävät"],
  ["laitteet", "Laitteet", "🔌", "Laitteet", "Pumppu, varaaja, kiuas, vene – huollot ja varaosat"],
  ["kausi", "Kausi", "🍂", "Kausilistat", "Talviteloille ja kevään käyttöönotto"],
  ["tavarat", "Tavarat", "📦", "Tavarat", "Vie mukana, hankittavat ja inventaario"],
  ["kulut", "Kulut", "💶", "Kulut", "Laskut ja vuoden kulut"],
  ["varaukset", "Varaukset", "📅", "Varauskalenteri", "Kuka on mökillä milloin"],
  ["korjaukset", "Korjaukset", "🛠️", "Korjaussuunnitelma", "Isommat remontit ja kustannusarviot"],
  ["perustiedot", "Tiedot", "🏡", "Perustiedot", "Osoite, avaimet, yhteystiedot, tärkeät paikat"]
];
export const NAV = [["koti", "Koti"], ...SECTIONS.map(x => [x[0], x[1]]), ["lisaa", "Lisää"]];
export const NAV_MAX = 5;
export const DEFAULT_NAV_ITEMS = ["huolto", "huoltotyot", "tehtavat", "tavarat"];

export const LOG_TYPES = { nuohous: "Nuohous", puut: "Polttopuut", huolto: "Huoltotyöt" };
export const MAINT_CATS = ["Sähkö", "Vesi & viemäri", "Lämmitys & tulisijat", "Rakennus", "Sauna", "Piha & laituri", "Vene & moottori", "Laitteet", "Muu"];
export const WOOD_TYPES = ["Koivu", "Sekapuu", "Leppä", "Mänty", "Kuusi", "Haapa", "Muu"];
export const WOOD_UNITS = [["irto-m³", "irto-m³"], ["pino-m³", "pino-m³"], ["motti", "motti (k-m³)"], ["säkki", "säkki"], ["kpl", "kpl"]];
export const INV_CATS = ["Ruoka & juoma", "Siivous & hygienia", "Polttoaineet & sytykkeet", "Työkalut & tarvikkeet", "Liinavaatteet", "Ensiapu & turvallisuus", "Muu"];
export const INV_STATUS = { ok: ["OK", "ok"], vahissa: ["Vähissä", "warn"], loppu: ["Loppu", "bad"] };
export const PAY_CATS = ["Vakuutus", "Sähkö", "Jätehuolto", "Kiinteistövero", "Tiemaksu", "Vesi & jätevesi", "Nettiyhteys", "Muu"];
export const RECUR = [["kerta", "Kertamaksu"], ["kk", "Kuukausittain"], ["3kk", "Neljännesvuosittain"], ["6kk", "Puolivuosittain"], ["vuosi", "Vuosittain"]];
export const RECUR_MONTHS = { kk: 1, "3kk": 3, "6kk": 6, vuosi: 12 };
export const REP_STATUS = [["suunniteltu", "Suunniteltu"], ["tyon_alla", "Työn alla"], ["valmis", "Valmis"]];
export const MONTHS = ["tammikuu", "helmikuu", "maaliskuu", "huhtikuu", "toukokuu", "kesäkuu", "heinäkuu", "elokuu", "syyskuu", "lokakuu", "marraskuu", "joulukuu"];
export const PALETTE = ["#2f7d5b", "#b8622f", "#3e6db5", "#9b4f96", "#b0892a", "#c0473f", "#2b8a8a", "#6b6b2f"];

export const DEFAULT_ITEMS = {
  talvi: [
    ["Vesipumppu irti ja kuivaan, lämpimään säilöön", ""],
    ["Vedet pois putkistosta – hanat auki ja tyhjennysventtiilit auki", "Venttiilien paikat löytyvät Perustiedot → Tärkeät paikat."],
    ["Lämminvesivaraaja sähköt pois ja tyhjäksi", ""],
    ["WC-istuimen ja lattiakaivojen vesilukot tyhjäksi tai pakkasnestettä", ""],
    ["Laituri ylös tai talvikuntoon", ""],
    ["Vene ylös, tyhjäksi ja suojaan", ""],
    ["Perämoottori talvikuntoon", ""],
    ["Pihakalusteet ja grilli sisälle", ""],
    ["Jääkaappi ja pakastin tyhjäksi, ovet raolleen", ""],
    ["Jäätyvät tavarat pois (juomat, maalit, pesuaineet)", ""],
    ["Ruoat pois ja hiirenloukut paikoilleen", ""],
    ["Savupelti kiinni ja tuhkat pois", ""],
    ["Sähköt pois – katso sähkökaapin kuva", "Lisää tähän kuva sähkökaapista siinä asennossa, johon sulakkeet ja kytkimet kuuluu jättää talveksi."],
    ["Ikkunat ja ovet lukkoon", ""]
  ],
  kevat: [
    ["Sähköt päälle – katso sähkökaapin kuva", ""],
    ["Tarkista talven jäljet: katto, vuodot, hiiret", ""],
    ["Tyhjennysventtiilit kiinni", ""],
    ["Vesipumppu paikalleen ja vedet päälle", "Tarkista vuodot ennen kuin jätät pumpun päälle."],
    ["Lämminvesivaraaja täyteen vettä ENNEN sähköjen kytkemistä", "Tyhjä varaaja voi vaurioitua, jos vastus kytketään päälle ilman vettä."],
    ["Palovaroittimien testaus ja paristot", ""],
    ["Jääkaappi päälle", ""],
    ["Laituri paikalleen", ""],
    ["Vene ja moottori vesille", ""],
    ["Pihakalusteet ja grilli ulos", ""],
    ["Tuuletus ja kevätsiivous", ""]
  ]
};
export const PLACE_SUGGESTIONS = ["Sähkökaappi", "Vesijohdon pääsulku", "Tyhjennysventtiilit", "Vesipumppu", "Kaivo", "Sakokaivo / umpisäiliö", "Polttopuuvarasto", "Sammutin ja sammutuspeite"];

// ---------- Tila ----------
export const S = {
  user: null, me: null, users: [...DEFAULT_USERS], pins: {}, usersLoaded: false, d: {}, view: "koti", tab: {}, unsubs: [], started: false,
  expanded: new Set(), openDetails: new Set(), editOrder: false, calMonth: null, kulutYear: null, pendingName: null,
  theme: null, themeDraft: null, themePal: "light", themeMeta: null, homeEdit: false
};
export const photoCache = new Map();

// ---------- Apurit ----------
export const $ = (s, r = document) => r.querySelector(s);
export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const nl2br = s => esc(s).replace(/\n/g, "<br>");
export const pad = n => String(n).padStart(2, "0");
export const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const today = () => ymd(new Date());
export const nowIso = () => new Date().toISOString();
export const parseYmd = s => { const [y, m, d] = String(s).split("-").map(Number); return new Date(y, (m || 1) - 1, d || 1); };
export const fmtDate = s => { if (!s) return ""; const d = parseYmd(s); return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`; };
export const fmtShort = s => { const d = parseYmd(s); return `${d.getDate()}.${d.getMonth() + 1}.`; };
export const fmtDT = iso => { if (!iso) return ""; const d = new Date(iso); return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()} klo ${d.getHours()}.${pad(d.getMinutes())}`; };
export const daysBetween = (a, b) => Math.round((parseYmd(b) - parseYmd(a)) / 86400000);
export const eur = n => (Number(n) || 0).toLocaleString("fi-FI", { style: "currency", currency: "EUR" });
export const fmtNum = n => Number(n || 0).toLocaleString("fi-FI", { maximumFractionDigits: 2 });
export const num = v => { const n = parseFloat(String(v ?? "").replace(/\s/g, "").replace(",", ".")); return isFinite(n) ? n : 0; };
export const byDateDesc = (a, b) => (b.date || "").localeCompare(a.date || "") || (b.createdAt || "").localeCompare(a.createdAt || "");
export const list = c => S.d[c] || [];
export const getInfo = () => list("info").find(x => x.id === "main") || {};
export const isAdmin = () => S.me?.name === ADMIN_NAME;
export const memberNames = () => [...S.users];
export const curTab = (view, def) => S.tab[view] || def;

export function ago(s) {
  if (!s) return "";
  const d = daysBetween(s, today());
  if (d === 0) return "tänään";
  if (d === 1) return "eilen";
  if (d === -1) return "huomenna";
  if (d < 0) return `${-d} pv päästä`;
  if (d < 60) return `${d} pv sitten`;
  const m = Math.round(d / 30.44);
  if (m < 24) return `${m} kk sitten`;
  return `${(d / 365.25).toFixed(1).replace(".", ",")} v sitten`;
}
export function addMonths(s, n) {
  const d = parseYmd(s); const day = d.getDate();
  d.setDate(1); d.setMonth(d.getMonth() + n);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return ymd(d);
}
export function colorFor(name) {
  let h = 0; for (const c of String(name || "")) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}
export const initials = name => String(name || "?").slice(0, 2);
export function clean(o) { const r = {}; for (const [k, v] of Object.entries(o)) r[k] = v === undefined ? null : v; return r; }

// ---------- Tallennus (ei odoteta palvelinta → toimii offline) ----------
export function meta() { return { createdByName: S.me.name, createdAt: nowIso() }; }
export function fail(e) { console.error(e); toast("Tallennus epäonnistui: " + (e.code || e.message), true); }
// Esikatselutilassa (admin katsoo sovellusta toisena käyttäjänä) mitään ei tallenneta
const readOnlyBlock = () => { if (!S.readOnly) return false; toast("Esikatselutila – muutoksia ei tallenneta", true); return true; };
export function save(col, data, id) {
  if (readOnlyBlock()) return null;
  const ref = id ? doc(db, col, id) : doc(collection(db, col));
  const payload = id ? { ...clean(data), updatedByName: S.me.name, updatedAt: nowIso() } : { ...clean(data), ...meta() };
  (id ? setDoc(ref, payload, { merge: true }) : setDoc(ref, payload)).catch(fail);
  return ref.id;
}
export function patch(col, id, data) { if (readOnlyBlock()) return; updateDoc(doc(db, col, id), data).catch(fail); }
export function remove(col, id) { if (readOnlyBlock()) return; deleteDoc(doc(db, col, id)).catch(fail); }

// ---------- Kuvat ----------
export function newPhoto(dataUrl) {
  const ref = doc(collection(db, "photos"));
  photoCache.set(ref.id, dataUrl);
  setDoc(ref, { data: dataUrl, ...meta() }).catch(fail);
  return ref.id;
}
export function delPhoto(id) { photoCache.delete(id); deleteDoc(doc(db, "photos", id)).catch(() => {}); }
export function delPhotos(ids) { (ids || []).forEach(delPhoto); }
// Kuvien lataustapa tällä laitteella (idea 182): "lazy" = vasta kun kuva tulee näkyviin,
// "all" = kaikki kuvat etukäteen, jotta ne näkyvät mökillä ilman verkkoa.
const PHOTO_MODE_KEY = "mokki_photo_mode";
export const photoMode = () => { try { return localStorage.getItem(PHOTO_MODE_KEY) === "all" ? "all" : "lazy"; } catch { return "lazy"; } };
export function setPhotoMode(m) { try { localStorage.setItem(PHOTO_MODE_KEY, m); } catch { } }
async function loadPhoto(img) {
  const id = img.dataset.photo;
  if (photoCache.has(id)) { img.src = photoCache.get(id); return; }
  img.classList.add("loading");
  try {
    const s = await getDoc(doc(db, "photos", id));
    if (s.exists()) { photoCache.set(id, s.data().data); img.src = s.data().data; }
    else { img.classList.add("missing"); img.alt = "Kuva puuttuu"; }
  } catch { img.classList.add("missing"); img.alt = "Kuva ei saatavilla"; }
  img.classList.remove("loading");
}
const photoObserver = "IntersectionObserver" in window
  ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { photoObserver.unobserve(e.target); loadPhoto(e.target); } }), { rootMargin: "300px" })
  : null;
export function hydratePhotos(root = document) {
  root.querySelectorAll("img[data-photo]").forEach(img => {
    if (img.getAttribute("src")) return;
    const id = img.dataset.photo;
    if (photoCache.has(id)) { img.src = photoCache.get(id); return; }
    photoObserver ? photoObserver.observe(img) : loadPhoto(img);
  });
}
export function compressImage(file, maxDim = 1400) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const s = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.round(img.width * s), h = Math.round(img.height * s);
      const c = document.createElement("canvas"); c.width = w; c.height = h;
      c.getContext("2d").drawImage(img, 0, 0, w, h);
      let q = 0.78, out = c.toDataURL("image/jpeg", q);
      while (out.length > 700000 && q > 0.35) { q -= 0.1; out = c.toDataURL("image/jpeg", q); }
      resolve(out);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Kuvaa ei voitu lukea")); };
    img.src = url;
  });
}
export function thumbs(ids) {
  return ids?.length ? `<div class="thumbs">${ids.map(id => `<img class="thumb" data-photo="${esc(id)}" alt="Kuva">`).join("")}</div>` : "";
}
export function openLightbox(src) {
  const lb = $("#lightbox");
  lb.innerHTML = `<button class="lb-close" aria-label="Sulje">✕</button><div class="lb-scroll"><img src="${src}" alt=""></div><div class="lb-hint">Napauta kuvaa suurentaaksesi</div>`;
  lb.classList.add("open");
  lb.onclick = e => {
    if (e.target.tagName === "IMG") { e.target.classList.toggle("zoom"); lb.classList.toggle("zoomed"); return; }
    lb.classList.remove("open", "zoomed"); lb.innerHTML = "";
  };
}

// ---------- Toast ----------
export let toastTimer;
export function toast(msg, isErr = false) {
  const t = $("#toast");
  t.textContent = msg; t.className = "toast show" + (isErr ? " err" : "");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.className = "toast", isErr ? 5000 : 2500);
}


// ---------- Lomake-ikkuna ----------
export function fieldHtml(f, v) {
  const req = f.required ? "required" : "";
  const ph = f.placeholder ? `placeholder="${esc(f.placeholder)}"` : "";
  switch (f.type) {
    case "heading": return `<h3 class="form-h">${esc(f.label)}</h3>`;
    case "note": return `<p class="form-note">${esc(f.label)}</p>`;
    case "textarea": return `<label class="fld"><span>${esc(f.label)}</span><textarea name="${f.name}" rows="${f.rows || 3}" ${req} ${ph}>${esc(v ?? "")}</textarea></label>`;
    case "select": {
      const opts = (typeof f.options === "function" ? f.options() : f.options).map(o => Array.isArray(o) ? o : [o, o]);
      return `<label class="fld"><span>${esc(f.label)}</span><select name="${f.name}" ${req}>${opts.map(([val, l]) => `<option value="${esc(val)}" ${String(v ?? "") === String(val) ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></label>`;
    }
    case "checkbox": return `<label class="fld-check"><input type="checkbox" name="${f.name}" ${v ? "checked" : ""}><span>${esc(f.label)}</span></label>`;
    case "photos": return `<div class="fld" data-photos="${f.name}"><span>${esc(f.label)}</span><div class="thumbs edit"></div><label class="btn small ghost file-btn">📷 Lisää kuva<input type="file" accept="image/*" multiple data-pfield="${f.name}" hidden></label></div>`;
    case "number": {
      // Rahakentät (otsikossa €): numeronäppäimistö, € -merkki ja muotoilu 1 250,00 (idea 81)
      const money = f.money || /€/.test(f.label);
      const empty = v === null || v === undefined || v === "";
      const val = empty ? "" : money ? fmtMoney(v) : esc(String(v).replace(".", ","));
      const input = `<input name="${f.name}" type="text" inputmode="decimal" value="${val}" ${req} ${money ? 'data-money="1" placeholder="0,00"' : ph}>`;
      return `<label class="fld"><span>${esc(money ? f.label.replace(/\s*\(€\)/, "") : f.label)}</span>${money ? `<span class="money">${input}<i>€</i></span>` : input}</label>`;
    }
    default: {
      const listId = f.list ? `dl_${f.name}` : "";
      return `<label class="fld"><span>${esc(f.label)}</span><input name="${f.name}" type="${f.type || "text"}" value="${esc(v ?? "")}" ${req} ${ph} ${f.list ? `list="${listId}"` : ""} autocomplete="off"></label>${f.list ? `<datalist id="${listId}">${f.list.map(o => `<option value="${esc(o)}">`).join("")}</datalist>` : ""}`;
    }
  }
}

// Lomakkeen kenttien suodatin (idea 169): theme.js asettaa funktion, joka piilottaa adminin piilottamat kentät
export const formFilter = { fn: (key, fields) => fields };
export function openForm({ title, fields, values = {}, onSubmit, onDelete, submitLabel = "Tallenna", formKey }) {
  if (formKey) fields = formFilter.fn(formKey, fields);
  const m = $("#modal");
  const photoState = {};
  const added = new Set();
  let finished = false;
  const initial = f => values[f.name] !== undefined && values[f.name] !== null ? values[f.name] : (typeof f.def === "function" ? f.def() : f.def);

  m.innerHTML = `<div class="sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <div class="sheet-head"><h2>${esc(title)}</h2><button type="button" class="icon-btn" data-mclose aria-label="Sulje">✕</button></div>
    <form class="form">${fields.map(f => fieldHtml(f, initial(f))).join("")}
      <div class="form-actions">${onDelete ? '<button type="button" class="btn danger ghost" data-mdel>Poista</button>' : "<span></span>"}<button type="submit" class="btn primary">${esc(submitLabel)}</button></div>
    </form></div>`;
  const form = m.querySelector("form");

  const drawPhotos = name => {
    const box = m.querySelector(`[data-photos="${name}"] .thumbs`);
    box.innerHTML = photoState[name].map(id => `<div class="thumb-wrap"><img class="thumb" data-photo="${esc(id)}" alt=""><button type="button" class="thumb-del" data-pdel="${name}" data-id="${esc(id)}" aria-label="Poista kuva">✕</button></div>`).join("");
    hydratePhotos(box);
  };
  fields.filter(f => f.type === "photos").forEach(f => { photoState[f.name] = [...(values[f.name] || [])]; drawPhotos(f.name); });

  m.querySelectorAll("input[data-pfield]").forEach(inp => inp.addEventListener("change", async () => {
    const name = inp.dataset.pfield;
    for (const file of inp.files) {
      try {
        const url = await compressImage(file);
        const id = newPhoto(url); added.add(id);
        photoState[name].push(id); drawPhotos(name);
      } catch (e) { toast("Kuvan lisäys epäonnistui", true); }
    }
    inp.value = "";
  }));

  const close = () => {
    if (!finished) added.forEach(delPhoto);
    m.classList.remove("open"); m.innerHTML = ""; m.onclick = null;
    document.removeEventListener("keydown", onKey);
  };
  const onKey = e => { if (e.key === "Escape") close(); };
  document.addEventListener("keydown", onKey);

  m.onclick = e => {
    if (e.target === m || e.target.closest("[data-mclose]")) return close();
    const pd = e.target.closest("[data-pdel]");
    if (pd) { const n = pd.dataset.pdel; photoState[n] = photoState[n].filter(x => x !== pd.dataset.id); drawPhotos(n); return; }
    if (e.target.closest("[data-mdel]")) {
      if (!confirm("Poistetaanko varmasti?")) return;
      onDelete();
      fields.filter(f => f.type === "photos").forEach(f => { delPhotos(values[f.name]); delPhotos([...photoState[f.name]].filter(id => added.has(id))); });
      finished = true; close(); toast("Poistettu");
    }
  };

  form.onsubmit = e => {
    e.preventDefault();
    const out = {};
    for (const f of fields) {
      if (f.type === "heading" || f.type === "note") continue;
      if (f.type === "photos") { out[f.name] = photoState[f.name]; continue; }
      const el = form.elements[f.name];
      if (f.type === "checkbox") out[f.name] = el.checked;
      else if (f.type === "number") out[f.name] = el.value.trim() === "" ? null : num(el.value);
      else out[f.name] = el.value.trim();
    }
    if (onSubmit(out) === false) return;
    fields.filter(f => f.type === "photos").forEach(f => (values[f.name] || []).forEach(id => { if (!photoState[f.name].includes(id)) delPhoto(id); }));
    finished = true; close();
  };

  m.classList.add("open");
  m.scrollTop = 0;
}

export function openSheet(title, html) {
  const m = $("#modal");
  m.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><div class="sheet-head"><h2>${esc(title)}</h2><button type="button" class="icon-btn" data-mclose aria-label="Sulje">✕</button></div><div class="sheet-body">${html}</div></div>`;
  m.classList.add("open");
  hydratePhotos(m);
  m.onclick = e => {
    if (e.target === m || e.target.closest("[data-mclose]")) { m.classList.remove("open"); m.innerHTML = ""; m.onclick = null; }
  };
}

// ---------- Yleiset palaset ----------
export const seg = (view, tabs, def) => {
  const cur = curTab(view, def ?? tabs[0][0]);
  return `<div class="seg" role="tablist">${tabs.map(([k, l]) => `<button role="tab" data-action="tab" data-view="${view}" data-tab="${k}" class="${k === cur ? "on" : ""}">${l}</button>`).join("")}</div>`;
};
export const empty = t => `<div class="empty">${t}</div>`;
export const secH = (t, extra = "") => `<div class="sec-h"><h2>${t}</h2>${extra}</div>`;
export const details = (id, summary, inner) => `<details id="${id}" class="more" ${S.openDetails.has(id) ? "open" : ""}><summary>${summary}</summary>${inner}</details>`;
export const chip = (t, cls = "") => `<span class="chip ${cls}">${t}</span>`;


export { initializeApp, getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut, sendPasswordResetEmail, initializeFirestore, getFirestore, persistentLocalCache, persistentMultipleTabManager, collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot, getDoc, getDocs, writeBatch, deleteField, firebaseConfig, LOGIN_EMAIL, ADMIN_NAME, DEFAULT_USERS, CABIN_NAME };

export const fmtMoney = v => (Number(v) || 0).toLocaleString("fi-FI", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
// Rahakenttä muotoillaan, kun siitä poistutaan: "1250" → "1 250,00"
document.addEventListener("focusout", e => {
  const el = e.target;
  if (!el?.dataset?.money || !el.value.trim()) return;
  const n = num(el.value);
  if (isFinite(n)) el.value = fmtMoney(n);
});
