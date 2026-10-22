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
  collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot, getDoc, writeBatch, deleteField
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig, LOGIN_EMAIL, ADMIN_NAME, DEFAULT_USERS, CABIN_NAME } from "./firebase-config.js";

// ---------- Firebase ----------
const fbApp = initializeApp(firebaseConfig);
const auth = getAuth(fbApp);
let db;
try {
  db = initializeFirestore(fbApp, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
  });
} catch (e) {
  console.warn("Offline-välimuisti ei käytössä", e);
  db = getFirestore(fbApp);
}

// ---------- Vakiot ----------
const USER_KEY = "mokki_user";
const USERS_DOC = () => doc(db, "app", "users");
const COLS = ["logs", "todos", "checkItems", "seasonRuns", "inventory", "shopping",
  "payments", "repairs", "bookings", "info", "contacts", "places"];



const ICONS = {
  koti: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h5v-6h4v6h5V9.5"/>',
  huolto: '<path d="M12 3c.6 3.4 5 5.6 5 10.2A5 5 0 0 1 7 13.2c0-2.4 1.3-4 2.4-5 .3 1.8 1.2 2.8 2.5 3.2.6-2.7-.4-5.6.1-8.4z"/>',
  huoltotyot: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9l-3.8 3.8z"/>',
  tehtavat: '<path d="M3 6.5 5 8.5 9 4.5"/><path d="M3 13.5 5 15.5 9 11.5"/><path d="M13 7h8M13 14h8M13 20h8"/>',
  kausi: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/><path d="m9 15 2 2 4-4"/>',
  tavarat: '<path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z"/><path d="m3 7.5 9 4.5 9-4.5M12 12v9"/>',
  kulut: '<circle cx="12" cy="12" r="9"/><path d="M15.5 8.6a4 4 0 1 0 0 6.8M7.5 11h6M7.5 13.2h6"/>',
  varaukset: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M7.5 14h3M13.5 14h3M7.5 17.5h3"/>',
  korjaukset: '<path d="M3 21h18"/><path d="M5 21V10l7-5 7 5v11"/><path d="M10 21v-5h4v5"/>',
  perustiedot: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  lisaa: '<path d="M4 6h16M4 12h16M4 18h16"/>'
};
// Osiot, joita pääkäyttäjä voi sijoittaa alavalikkoon. Loput näkyvät Lisää-valikossa.
// [avain, lyhyt nimi alavalikossa, emoji, nimi Lisää-valikossa, kuvaus]
const SECTIONS = [
  ["huolto", "Lämmitys", "🔥", "Nuohous ja puut", "Edellinen nuohous ja puutilaukset"],
  ["huoltotyot", "Huollot", "🔧", "Huoltotyöt", "Tehdyt huoltotyöt"],
  ["tehtavat", "Tehtävät", "✅", "Tehtävät", "Tulevat tehtävät"],
  ["kausi", "Kausi", "🍂", "Kausilistat", "Talviteloille ja kevään käyttöönotto"],
  ["tavarat", "Tavarat", "📦", "Tavarat", "Vie mukana, hankittavat ja inventaario"],
  ["kulut", "Kulut", "💶", "Kulut", "Laskut ja vuoden kulut"],
  ["varaukset", "Varaukset", "📅", "Varauskalenteri", "Kuka on mökillä milloin"],
  ["korjaukset", "Korjaukset", "🛠️", "Korjaussuunnitelma", "Isommat remontit ja kustannusarviot"],
  ["perustiedot", "Tiedot", "🏡", "Perustiedot", "Osoite, avaimet, yhteystiedot, tärkeät paikat"]
];
const NAV = [["koti", "Koti"], ...SECTIONS.map(x => [x[0], x[1]]), ["lisaa", "Lisää"]];
const NAV_MAX = 5;
const DEFAULT_NAV_ITEMS = ["huolto", "huoltotyot", "tehtavat", "tavarat"];

const LOG_TYPES = { nuohous: "Nuohous", puut: "Polttopuut", huolto: "Huoltotyöt" };
const MAINT_CATS = ["Sähkö", "Vesi & viemäri", "Lämmitys & tulisijat", "Rakennus", "Sauna", "Piha & laituri", "Vene & moottori", "Laitteet", "Muu"];
const WOOD_TYPES = ["Koivu", "Sekapuu", "Leppä", "Mänty", "Kuusi", "Haapa", "Muu"];
const WOOD_UNITS = [["irto-m³", "irto-m³"], ["pino-m³", "pino-m³"], ["motti", "motti (k-m³)"], ["säkki", "säkki"], ["kpl", "kpl"]];
const INV_CATS = ["Ruoka & juoma", "Siivous & hygienia", "Polttoaineet & sytykkeet", "Työkalut & tarvikkeet", "Liinavaatteet", "Ensiapu & turvallisuus", "Muu"];
const INV_STATUS = { ok: ["OK", "ok"], vahissa: ["Vähissä", "warn"], loppu: ["Loppu", "bad"] };
const PAY_CATS = ["Vakuutus", "Sähkö", "Jätehuolto", "Kiinteistövero", "Tiemaksu", "Vesi & jätevesi", "Nettiyhteys", "Muu"];
const RECUR = [["kerta", "Kertamaksu"], ["kk", "Kuukausittain"], ["3kk", "Neljännesvuosittain"], ["6kk", "Puolivuosittain"], ["vuosi", "Vuosittain"]];
const RECUR_MONTHS = { kk: 1, "3kk": 3, "6kk": 6, vuosi: 12 };
const REP_STATUS = [["suunniteltu", "Suunniteltu"], ["tyon_alla", "Työn alla"], ["valmis", "Valmis"]];
const MONTHS = ["tammikuu", "helmikuu", "maaliskuu", "huhtikuu", "toukokuu", "kesäkuu", "heinäkuu", "elokuu", "syyskuu", "lokakuu", "marraskuu", "joulukuu"];
const PALETTE = ["#2f7d5b", "#b8622f", "#3e6db5", "#9b4f96", "#b0892a", "#c0473f", "#2b8a8a", "#6b6b2f"];

const DEFAULT_ITEMS = {
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
const PLACE_SUGGESTIONS = ["Sähkökaappi", "Vesijohdon pääsulku", "Tyhjennysventtiilit", "Vesipumppu", "Kaivo", "Sakokaivo / umpisäiliö", "Polttopuuvarasto", "Sammutin ja sammutuspeite"];

// ---------- Tila ----------
const S = {
  user: null, me: null, users: [...DEFAULT_USERS], pins: {}, usersLoaded: false, d: {}, view: "koti", tab: {}, unsubs: [], started: false,
  expanded: new Set(), openDetails: new Set(), editOrder: false, calMonth: null, kulutYear: null, pendingName: null,
  theme: null, themeDraft: null, themePal: "light", themeMeta: null, homeEdit: false
};
const photoCache = new Map();

// ---------- Apurit ----------
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const nl2br = s => esc(s).replace(/\n/g, "<br>");
const pad = n => String(n).padStart(2, "0");
const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const today = () => ymd(new Date());
const nowIso = () => new Date().toISOString();
const parseYmd = s => { const [y, m, d] = String(s).split("-").map(Number); return new Date(y, (m || 1) - 1, d || 1); };
const fmtDate = s => { if (!s) return ""; const d = parseYmd(s); return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()}`; };
const fmtShort = s => { const d = parseYmd(s); return `${d.getDate()}.${d.getMonth() + 1}.`; };
const fmtDT = iso => { if (!iso) return ""; const d = new Date(iso); return `${d.getDate()}.${d.getMonth() + 1}.${d.getFullYear()} klo ${d.getHours()}.${pad(d.getMinutes())}`; };
const daysBetween = (a, b) => Math.round((parseYmd(b) - parseYmd(a)) / 86400000);
const eur = n => (Number(n) || 0).toLocaleString("fi-FI", { style: "currency", currency: "EUR" });
const fmtNum = n => Number(n || 0).toLocaleString("fi-FI", { maximumFractionDigits: 2 });
const num = v => { const n = parseFloat(String(v ?? "").replace(/\s/g, "").replace(",", ".")); return isFinite(n) ? n : 0; };
const byDateDesc = (a, b) => (b.date || "").localeCompare(a.date || "") || (b.createdAt || "").localeCompare(a.createdAt || "");
const list = c => S.d[c] || [];
const getInfo = () => list("info").find(x => x.id === "main") || {};
const isAdmin = () => S.me?.name === ADMIN_NAME;
const memberNames = () => [...S.users];
const curTab = (view, def) => S.tab[view] || def;

function ago(s) {
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
function addMonths(s, n) {
  const d = parseYmd(s); const day = d.getDate();
  d.setDate(1); d.setMonth(d.getMonth() + n);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return ymd(d);
}
function colorFor(name) {
  let h = 0; for (const c of String(name || "")) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}
const initials = name => String(name || "?").slice(0, 2);
function clean(o) { const r = {}; for (const [k, v] of Object.entries(o)) r[k] = v === undefined ? null : v; return r; }

// ---------- Tallennus (ei odoteta palvelinta → toimii offline) ----------
function meta() { return { createdByName: S.me.name, createdAt: nowIso() }; }
function fail(e) { console.error(e); toast("Tallennus epäonnistui: " + (e.code || e.message), true); }
function save(col, data, id) {
  const ref = id ? doc(db, col, id) : doc(collection(db, col));
  const payload = id ? { ...clean(data), updatedByName: S.me.name, updatedAt: nowIso() } : { ...clean(data), ...meta() };
  (id ? setDoc(ref, payload, { merge: true }) : setDoc(ref, payload)).catch(fail);
  return ref.id;
}
function patch(col, id, data) { updateDoc(doc(db, col, id), data).catch(fail); }
function remove(col, id) { deleteDoc(doc(db, col, id)).catch(fail); }

// ---------- Kuvat ----------
function newPhoto(dataUrl) {
  const ref = doc(collection(db, "photos"));
  photoCache.set(ref.id, dataUrl);
  setDoc(ref, { data: dataUrl, ...meta() }).catch(fail);
  return ref.id;
}
function delPhoto(id) { photoCache.delete(id); deleteDoc(doc(db, "photos", id)).catch(() => {}); }
function delPhotos(ids) { (ids || []).forEach(delPhoto); }
function hydratePhotos(root = document) {
  root.querySelectorAll("img[data-photo]").forEach(async img => {
    if (img.getAttribute("src")) return;
    const id = img.dataset.photo;
    if (photoCache.has(id)) { img.src = photoCache.get(id); return; }
    try {
      const s = await getDoc(doc(db, "photos", id));
      if (s.exists()) { photoCache.set(id, s.data().data); img.src = s.data().data; }
    } catch { img.classList.add("missing"); img.alt = "Kuva ei saatavilla"; }
  });
}
function compressImage(file, maxDim = 1400) {
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
function thumbs(ids) {
  return ids?.length ? `<div class="thumbs">${ids.map(id => `<img class="thumb" data-photo="${esc(id)}" alt="Kuva">`).join("")}</div>` : "";
}
function openLightbox(src) {
  const lb = $("#lightbox");
  lb.innerHTML = `<button class="lb-close" aria-label="Sulje">✕</button><div class="lb-scroll"><img src="${src}" alt=""></div><div class="lb-hint">Napauta kuvaa suurentaaksesi</div>`;
  lb.classList.add("open");
  lb.onclick = e => {
    if (e.target.tagName === "IMG") { e.target.classList.toggle("zoom"); lb.classList.toggle("zoomed"); return; }
    lb.classList.remove("open", "zoomed"); lb.innerHTML = "";
  };
}

// ---------- Toast ----------
let toastTimer;
function toast(msg, isErr = false) {
  const t = $("#toast");
  t.textContent = msg; t.className = "toast show" + (isErr ? " err" : "");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.className = "toast", isErr ? 5000 : 2500);
}

// =============================================================
//  ULKOASU (teema) – pääkäyttäjä muokkaa, näkyy kaikille
//  Tallennetaan Firestoreen app/theme. Laite muistaa viimeisimmän
//  teeman, jotta se näkyy heti käynnistyksessä ja ilman verkkoa.
// =============================================================
const THEME_DOC = () => doc(db, "app", "theme");
const THEME_KEY = "mokki_theme";
// [avain, oletusotsikko, oletuskoko]
const HOME_CARDS = [
  ["notice", "Tiedote", "full"], ["season", "Kausilista", "full"], ["bookings", "Mökillä", "full"], ["todos", "Tehtävät", "full"],
  ["shopping", "Vie mukana seuraavalla kerralla", "full"], ["buy", "Hankittavat", "full"], ["inventory", "Inventaario", "full"],
  ["maint", "Huoltotyöt", "full"], ["sweep", "Edellinen nuohous", "half"], ["wood", "Edelliset puut", "half"],
  ["payments", "Maksut erääntymässä", "full"], ["address", "Mökin osoite", "compact"]
];
const HOME_SIZES = [["full", "Iso"], ["compact", "Pieni"], ["half", "Puolikas"]];
const NAV_DEFAULTS = Object.fromEntries(NAV);
const COLOR_FIELDS = [
  ["bg", "Taustaväri"], ["card", "Korttien väri"], ["ink", "Tekstin väri"], ["head", "Otsikoiden väri"],
  ["muted", "Himmeä teksti"], ["label", "Korttien pienet otsikot"], ["line", "Reunaviivat"],
  ["primary", "Pääväri (painikkeet, valinnat)"], ["accent", "Korostusväri (kulupylväät)"],
  ["ok", "Kunnossa / OK"], ["warn", "Varoitus"], ["bad", "Virhe / myöhässä"]
];
const FONTS = {
  system: ["Järjestelmän oletus", 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'],
  rounded: ["Pyöreä", 'ui-rounded, "SF Pro Rounded", Nunito, "Varela Round", system-ui, sans-serif'],
  modern: ["Moderni", '"Avenir Next", Avenir, "Segoe UI Variable", "Segoe UI", "Helvetica Neue", Helvetica, Arial, sans-serif'],
  serif: ["Klassinen (serif)", '"Iowan Old Style", "Palatino Linotype", Palatino, Georgia, "Times New Roman", serif']
};
const DENSITY = { compact: ["Tiivis", 10, 12, 8], normal: ["Normaali", 14, 16, 12], roomy: ["Väljä", 18, 20, 16] };
const SHADOWS = { none: "Ei varjoa", soft: "Pehmeä", strong: "Voimakas" };
const HEAD_WEIGHTS = [[500, "Kevyt"], [600, "Puolilihava"], [700, "Lihava"], [800, "Erittäin lihava"]];
const STATUS_COLORS = { light: { ok: "#2f7d4f", warn: "#8f620f", bad: "#b3402e" }, dark: { ok: "#82d1a1", warn: "#e6b95e", bad: "#f08c7a" } };
const mkPal = (m, bg, card, ink, muted, line, primary, accent) => ({ bg, card, ink, head: ink, muted, label: muted, line, primary, accent, ...STATUS_COLORS[m] });
const THEME_PRESETS = {
  metsa: { name: "Metsä", light: mkPal("light", "#f3f0e8", "#fffdf8", "#1d2721", "#6a736c", "#e3ddd0", "#2f5d46", "#b8622f"), dark: mkPal("dark", "#121814", "#1b231e", "#e8ece6", "#9aa59c", "#2b3530", "#74b391", "#e09463") },
  jarvi: { name: "Järvi", light: mkPal("light", "#eef2f5", "#fbfdff", "#1a2530", "#5f6d7a", "#d9e1e8", "#2d5f8a", "#c27a2c"), dark: mkPal("dark", "#10161c", "#18212a", "#e6edf3", "#93a2b0", "#273340", "#7fb2de", "#e3a35f") },
  sauna: { name: "Sauna", light: mkPal("light", "#f6efe6", "#fffaf3", "#2a1f18", "#76675a", "#e8dccd", "#8a4b2a", "#3f6b4f"), dark: mkPal("dark", "#1a1410", "#241c16", "#f1e8de", "#b0a191", "#3a2e25", "#e0a17a", "#8fc3a1") },
  graniitti: { name: "Graniitti", light: mkPal("light", "#f2f2f0", "#ffffff", "#1c1d1f", "#686b70", "#e0e0dc", "#3b4a5a", "#a87f1e"), dark: mkPal("dark", "#121314", "#1c1d1f", "#ececea", "#9a9da1", "#2c2e31", "#a9b8c8", "#e0bd62") },
  kanerva: { name: "Kanerva", light: mkPal("light", "#f5f1f4", "#fffcfe", "#261c24", "#715f6c", "#e7dce4", "#7a3f6e", "#2f7d74"), dark: mkPal("dark", "#161115", "#20181f", "#efe6ed", "#a898a4", "#352a33", "#d39bc6", "#78c8bd") }
};
const DEFAULT_THEME = {
  mode: "auto", topbar: "plain",
  light: { ...THEME_PRESETS.metsa.light }, dark: { ...THEME_PRESETS.metsa.dark },
  shape: { radius: 16, btnRadius: 12, inputRadius: 11, border: 1, shadow: "soft", density: "normal" },
  type: { scale: 100, font: "system", headFont: "system", titleSize: 1.25, headWeight: 700, labelCaps: true },
  text: { appName: CABIN_NAME, tagline: "Perheen yhteinen mökkikirja", greeting: "Hei, {nimi}!", notice: "", nav: { ...NAV_DEFAULTS } },
  home: { order: HOME_CARDS.map(c => c[0]), hidden: {}, titles: {}, size: Object.fromEntries(HOME_CARDS.map(c => [c[0], c[2]])) },
  features: { todoDue: false, payDue: false, payRecurring: false },
  navItems: [...DEFAULT_NAV_ITEMS]
};
const T = () => S.themeDraft || S.theme || DEFAULT_THEME;
// Valinnaiset aikatauluominaisuudet (oletuksena pois). Tiedot säilyvät, vaikka ominaisuus on pois päältä.
const FEATURES = [
  ["todoDue", "Tehtävien määräajat", "Tehtävälle voi asettaa määräajan, ja myöhässä olevat näkyvät punaisella."],
  ["payDue", "Laskujen eräpäivät", "Maksuissa näytetään eräpäivä, myöhässä olevat korostetaan ja etusivulle saa Maksut erääntymässä -kortin."],
  ["payRecurring", "Toistuvat laskut", "Maksulle voi valita toistuvuuden. Maksetuksi merkitessä sovellus tarjoaa seuraavaa erää ja Kulut-sivu näyttää vuosiarvion."]
];
const F = k => !!T().features?.[k];
const appName = () => T().text.appName || CABIN_NAME;
const homeTitle = k => T().home.titles[k] || HOME_CARDS.find(c => c[0] === k)[1];

// Tarkistetaan kaikki arvot, koska ne päätyvät jokaisen laitteen tyyleihin.
function mergeTheme(src) {
  const t = structuredClone(DEFAULT_THEME);
  const s = src && typeof src === "object" ? src : {};
  const HEX = /^#[0-9a-f]{6}$/i;
  const oneOf = (v, arr, def) => arr.includes(v) ? v : def;
  const numIn = (v, a, b, def) => typeof v === "number" && isFinite(v) && v >= a && v <= b ? v : def;
  const str = (v, def, max = 200) => typeof v === "string" ? v.slice(0, max) : def;
  t.mode = oneOf(s.mode, ["auto", "light", "dark"], t.mode);
  t.topbar = oneOf(s.topbar, ["plain", "color"], t.topbar);
  for (const m of ["light", "dark"]) for (const k of Object.keys(t[m])) if (HEX.test(s[m]?.[k] || "")) t[m][k] = s[m][k].toLowerCase();
  const sh = s.shape || {}, ty = s.type || {}, tx = s.text || {}, hm = s.home || {};
  t.shape.radius = numIn(sh.radius, 0, 40, t.shape.radius);
  t.shape.btnRadius = numIn(sh.btnRadius, 0, 30, t.shape.btnRadius);
  t.shape.inputRadius = numIn(sh.inputRadius, 0, 30, t.shape.inputRadius);
  t.shape.border = numIn(sh.border, 0, 4, t.shape.border);
  t.shape.shadow = oneOf(sh.shadow, Object.keys(SHADOWS), t.shape.shadow);
  t.shape.density = oneOf(sh.density, Object.keys(DENSITY), t.shape.density);
  t.type.scale = numIn(ty.scale, 80, 140, t.type.scale);
  t.type.font = oneOf(ty.font, Object.keys(FONTS), t.type.font);
  t.type.headFont = oneOf(ty.headFont, Object.keys(FONTS), t.type.headFont);
  t.type.titleSize = numIn(ty.titleSize, 0.9, 2.2, t.type.titleSize);
  t.type.headWeight = oneOf(ty.headWeight, HEAD_WEIGHTS.map(w => w[0]), t.type.headWeight);
  if (typeof ty.labelCaps === "boolean") t.type.labelCaps = ty.labelCaps;
  for (const k of Object.keys(t.features)) if (typeof s.features?.[k] === "boolean") t.features[k] = s.features[k];
  t.text.appName = str(tx.appName, t.text.appName, 40);
  t.text.tagline = str(tx.tagline, t.text.tagline, 100);
  t.text.greeting = str(tx.greeting, t.text.greeting, 100);
  t.text.notice = str(tx.notice, "", 2000);
  for (const k of Object.keys(NAV_DEFAULTS)) t.text.nav[k] = str(tx.nav?.[k], NAV_DEFAULTS[k], 14);
  if (t.text.nav.huolto === "Huolto") t.text.nav.huolto = NAV_DEFAULTS.huolto; // vanha nimi, osio on nyt pelkkä nuohous ja puut
  if (Array.isArray(s.navItems)) t.navItems = [...new Set(s.navItems.filter(k => SECTIONS.some(x => x[0] === k)))].slice(0, NAV_MAX);
  if (Array.isArray(hm.order)) {
    const known = hm.order.flatMap(k => k === "latest" ? ["sweep", "wood"] : [k]).filter(k => HOME_CARDS.some(c => c[0] === k));
    t.home.order = [...new Set([...known, ...t.home.order])];
  }
  for (const [k] of HOME_CARDS) {
    const old = k === "sweep" || k === "wood" ? hm.hidden?.latest : undefined;
    if (hm.hidden?.[k] === true || old === true) t.home.hidden[k] = true;
    if (HOME_SIZES.some(z => z[0] === hm.size?.[k])) t.home.size[k] = hm.size[k];
    if (typeof hm.titles?.[k] === "string" && hm.titles[k].trim()) t.home.titles[k] = hm.titles[k].slice(0, 60);
  }
  return t;
}

function lum(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255].map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; })
    .reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
}
const contrast = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const onColor = c => contrast(c, "#ffffff") >= contrast(c, "#111111") ? "#ffffff" : "#111111";

function themeCss(t) {
  const sh = t.shape, ty = t.type, dn = DENSITY[sh.density] || DENSITY.normal;
  const shadow = dark => sh.shadow === "none" ? "none"
    : sh.shadow === "strong" ? (dark ? "0 6px 22px rgba(0,0,0,.45)" : "0 2px 4px rgba(30,40,30,.08), 0 12px 30px rgba(30,40,30,.12)")
      : (dark ? "none" : "0 1px 2px rgba(30,40,30,.06), 0 6px 18px rgba(30,40,30,.05)");
  const vars = (p, dark) => {
    const tint = (c, n) => `color-mix(in srgb, ${c} ${n}%, ${p.card})`;
    return `--bg:${p.bg};--card:${p.card};--ink:${p.ink};--head:${p.head};--muted:${p.muted};--label:${p.label};--line:${p.line};` +
      `--green:${p.primary};--green-d:${p.primary};--green-l:${tint(p.primary, 14)};--on-green:${onColor(p.primary)};--rust:${p.accent};` +
      `--bad:${p.bad};--bad-l:${tint(p.bad, 16)};--warn:${p.warn};--warn-l:${tint(p.warn, 16)};--ok:${p.ok};--ok-l:${tint(p.ok, 16)};` +
      `--shadow:${shadow(dark)};color-scheme:${dark ? "dark" : "light"};`;
  };
  const shared = `--r:${sh.radius}px;--rb:${sh.btnRadius}px;--ri:${sh.inputRadius}px;--bw:${sh.border}px;` +
    `--pad-y:${dn[1]}px;--pad-x:${dn[2]}px;--gap:${dn[3]}px;` +
    `--font:${FONTS[ty.font][1]};--font-head:${FONTS[ty.headFont][1]};--head-w:${ty.headWeight};` +
    `--label-tt:${ty.labelCaps ? "uppercase" : "none"};--title-size:${ty.titleSize}rem;`;
  const dark = vars(t.dark, true);
  return `:root{${shared}${vars(t.light, false)}}html{font-size:${ty.scale}%}` +
    `@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){${dark}}}:root[data-theme="dark"]{${dark}}`;
}

// force = "light"/"dark" esikatselussa (näytetään muokattava paletti)
function applyTheme(t, force) {
  let el = document.getElementById("theme-style");
  if (!el) { el = document.createElement("style"); el.id = "theme-style"; document.head.appendChild(el); }
  el.textContent = themeCss(t);
  const root = document.documentElement;
  const mode = force || t.mode;
  if (mode === "light" || mode === "dark") root.dataset.theme = mode; else delete root.dataset.theme;
  root.dataset.topbar = t.topbar;
  const dark = mode === "dark" || (mode === "auto" && matchMedia("(prefers-color-scheme: dark)").matches);
  const p = dark ? t.dark : t.light;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", t.topbar === "color" ? p.primary : p.bg);
}
const previewTheme = () => applyTheme(T(), S.themeDraft && S.view === "ulkoasu" ? S.themePal : null);
const themeDirty = () => !!S.themeDraft && JSON.stringify(S.themeDraft) !== JSON.stringify(S.theme);
function cacheTheme() { try { localStorage.setItem(THEME_KEY, JSON.stringify(S.theme)); } catch { } }
function discardThemeDraft() { S.homeEdit = false; if (!S.themeDraft) return; S.themeDraft = null; applyTheme(S.theme); }

S.theme = (() => { try { return mergeTheme(JSON.parse(localStorage.getItem(THEME_KEY) || "{}")); } catch { return mergeTheme({}); } })();
applyTheme(S.theme);
matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", previewTheme);

// ---------- Lomake-ikkuna ----------
function fieldHtml(f, v) {
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
    case "number": return `<label class="fld"><span>${esc(f.label)}</span><input name="${f.name}" type="text" inputmode="decimal" value="${v === null || v === undefined || v === "" ? "" : esc(String(v).replace(".", ","))}" ${req} ${ph}></label>`;
    default: {
      const listId = f.list ? `dl_${f.name}` : "";
      return `<label class="fld"><span>${esc(f.label)}</span><input name="${f.name}" type="${f.type || "text"}" value="${esc(v ?? "")}" ${req} ${ph} ${f.list ? `list="${listId}"` : ""} autocomplete="off"></label>${f.list ? `<datalist id="${listId}">${f.list.map(o => `<option value="${esc(o)}">`).join("")}</datalist>` : ""}`;
    }
  }
}

function openForm({ title, fields, values = {}, onSubmit, onDelete, submitLabel = "Tallenna" }) {
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

function openSheet(title, html) {
  const m = $("#modal");
  m.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"><div class="sheet-head"><h2>${esc(title)}</h2><button type="button" class="icon-btn" data-mclose aria-label="Sulje">✕</button></div><div class="sheet-body">${html}</div></div>`;
  m.classList.add("open");
  hydratePhotos(m);
  m.onclick = e => {
    if (e.target === m || e.target.closest("[data-mclose]")) { m.classList.remove("open"); m.innerHTML = ""; m.onclick = null; }
  };
}

// ---------- Yleiset palaset ----------
const seg = (view, tabs, def) => {
  const cur = curTab(view, def ?? tabs[0][0]);
  return `<div class="seg" role="tablist">${tabs.map(([k, l]) => `<button role="tab" data-action="tab" data-view="${view}" data-tab="${k}" class="${k === cur ? "on" : ""}">${l}</button>`).join("")}</div>`;
};
const empty = t => `<div class="empty">${t}</div>`;
const secH = (t, extra = "") => `<div class="sec-h"><h2>${t}</h2>${extra}</div>`;
const navKeys = () => ["koti", ...T().navItems, "lisaa"];
const backLink = () => navKeys().includes(S.view) ? "" : `<a class="back" href="#lisaa">‹ Lisää</a>`;
const details = (id, summary, inner) => `<details id="${id}" class="more" ${S.openDetails.has(id) ? "open" : ""}><summary>${summary}</summary>${inner}</details>`;
const chip = (t, cls = "") => `<span class="chip ${cls}">${t}</span>`;

// =============================================================
//  NÄKYMÄT
// =============================================================

// ---------- Koti ----------
// Etusivun kortit. Pääkäyttäjä järjestää, nimeää, piilottaa ja valitsee koon
// suoraan etusivulla (✎ Muokkaa etusivua).
// Jokainen kortti palauttaa sisällön tai null (ei näytettävää).
const lastLog = type => list("logs").filter(l => l.type === type).sort(byDateDesc)[0];
const tabAttrs = (view, tab) => `data-action="tab" data-view="${view}" data-tab="${tab}"`;
const HOME_DATA = {
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
    const logs = list("logs").filter(l => l.type === "huolto").sort(byDateDesc);
    return {
      href: "#huoltotyot", noFullLink: true,
      right: `<a href="#huoltotyot">Kaikki ›</a>`,
      body: logs.length ? logs.slice(0, 4).map(l => `<div class="line"><span>${esc(l.title)}</span><span class="muted">${fmtDate(l.date)}</span></div>`).join("") : '<div class="muted">Ei kirjattuja huoltotöitä.</div>',
      short: logs.length ? `${esc(logs[0].title)} <span class="muted">· ${fmtDate(logs[0].date)}</span>` : '<span class="muted">Ei kirjattuja huoltotöitä</span>'
    };
  },
  sweep: () => {
    const l = lastLog("nuohous");
    return {
      href: "#huolto", attrs: tabAttrs("huolto", "nuohous"),
      body: l ? `<div class="big">${fmtDate(l.date)}</div><div class="muted small">${ago(l.date)}${l.doer === "itse" ? " · itse" : ""}</div>` : '<div class="muted">Ei kirjattu</div>',
      short: l ? `${fmtDate(l.date)} <span class="muted">· ${ago(l.date)}</span>` : '<span class="muted">Ei kirjattu</span>'
    };
  },
  wood: () => {
    const l = lastLog("puut");
    const amt = l?.amount ? fmtNum(l.amount) + " " + esc(l.unit || "") : "";
    return {
      href: "#huolto", attrs: tabAttrs("huolto", "puut"),
      body: l ? `<div class="big">${fmtDate(l.date)}</div><div class="muted small">${[ago(l.date), amt].filter(Boolean).join(" · ")}</div>` : '<div class="muted">Ei kirjattu</div>',
      short: l ? `${fmtDate(l.date)} <span class="muted">· ${[ago(l.date), amt].filter(Boolean).join(" · ")}</span>` : '<span class="muted">Ei kirjattu</span>'
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
      body: items.length ? `<div class="list flat">${items.slice(0, 8).map(shopRow).join("")}</div>` : '<div class="muted">Ei hankittavaa.</div>',
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
const HOME_EMPTY = {
  notice: "Tiedote on tyhjä, joten sitä ei näytetä. Kirjoita tiedote yläpuolelle.",
  payments: "Näkyy vain, kun laskujen eräpäivät ovat käytössä (Lisää → Ulkoasu → Ominaisuudet) ja maksuja erääntyy kuukauden sisällä."
};

function homeCardHtml(k, size) {
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

function vKoti() {
  const th = T();
  if (S.homeEdit && isAdmin() && S.themeDraft) return vKotiEdit();
  const greet = esc(th.text.greeting).replace(/\{nimi\}/g, esc(S.me.name));
  const body = th.home.order.filter(k => !th.home.hidden[k]).map(k => homeCardHtml(k, th.home.size[k])).join("");
  return (greet.trim() ? `<div class="hello">${greet}</div>` : "")
    + (body ? `<div class="home-grid">${body}</div>` : empty("Etusivulle ei ole valittu näytettäviä kortteja."))
    + (isAdmin() ? `<button class="btn ghost small home-edit-btn" data-action="homeEdit">✎ Muokkaa etusivua</button>` : "");
}

function vKotiEdit() {
  const D = S.themeDraft, order = D.home.order;
  const vis = order.filter(k => !D.home.hidden[k]), hid = order.filter(k => D.home.hidden[k]);
  let h = `<div class="card he-intro"><div class="card-label">Etusivun muokkaus</div>
    <p class="small">Siirrä kortteja nuolilla, valitse koko ja piilota turhat. <b>Puolikas</b>-kortit asettuvat vierekkäin. Muut näkevät muutokset vasta, kun tallennat.</p>
    ${tText("text.greeting", "Tervehdys ({nimi} = käyttäjän nimi, tyhjä = ei tervehdystä)", DEFAULT_THEME.text.greeting)}</div>`;
  h += `<div class="home-grid">${vis.map((k, i) => {
    const size = D.home.size[k];
    const def = HOME_CARDS.find(c => c[0] === k)[1];
    const card = homeCardHtml(k, size) || `<div class="card hc hc-${size} he-empty"><div class="card-label">${esc(homeTitle(k))}</div><div class="muted small">${esc(HOME_EMPTY[k] || "Ei näytettävää juuri nyt.")}</div></div>`;
    return `<div class="he hc-${size}">
      <div class="he-bar">
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

// ---------- Huolto ----------
const LOG_FIELDS = {
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
    { name: "doer", label: "Tekijä", type: "select", options: [["itse", "Itse tehty"], ["ulkopuolinen", "Ulkopuolinen tekijä"]] },
    { name: "provider", label: "Kuka teki / yritys" },
    { name: "cost", label: "Kustannus (€)", type: "number", placeholder: "0,00" },
    { name: "notes", label: "Lisätiedot", type: "textarea" },
    { name: "photos", label: "Kuvat", type: "photos" }
  ]
};
const LOG_ADD = { nuohous: "Kirjaa nuohous", puut: "Kirjaa puutilaus", huolto: "Kirjaa huoltotyö" };

function vHuolto() {
  let t = curTab("huolto", "nuohous"); if (t !== "puut") t = "nuohous";
  let h = backLink() + seg("huolto", [["nuohous", "Nuohous"], ["puut", "Puut"]], "nuohous");
  const logs = list("logs").filter(l => l.type === t).sort(byDateDesc);
  if (t === "nuohous") h += sweepSummary(logs);
  if (t === "puut") h += woodSummary(logs);
  h += `<button class="btn primary block" data-action="addLog" data-type="${t}">+ ${LOG_ADD[t]}</button>`;
  h += logs.length ? logs.map(logCard).join("") : empty("Ei vielä merkintöjä.");
  return h;
}

function sweepSummary(logs) {
  const last = logs[0];
  if (!last) return `<div class="card"><div class="card-label">Edellinen nuohous</div><div class="muted">Nuohousta ei ole vielä kirjattu.</div></div>`;
  return `<div class="card"><div class="card-label">Edellinen nuohous</div><div class="big">${fmtDate(last.date)}</div>
    <div class="muted small">${ago(last.date)} · ${last.doer === "itse" ? "Itse" : esc(last.provider || "Nuohooja")}${last.cost ? " · " + eur(last.cost) : ""}</div></div>`;
}

function woodSummary(logs) {
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

function logCard(l) {
  const chips = [];
  if (l.type === "puut") {
    if (l.amount) chips.push(chip(`${fmtNum(l.amount)} ${esc(l.unit || "")}`));
    if (l.wood) chips.push(chip(esc(l.wood)));
    if (l.amount && l.cost) chips.push(chip(`${eur(num(l.cost) / num(l.amount))} / ${esc(l.unit || "yks")}`));
  }
  if (l.type === "huolto" && l.category) chips.push(chip(esc(l.category)));
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
function openTodos() {
  return list("todos").filter(t => !t.done).sort((a, b) =>
    ((b.priority === "tarkea") - (a.priority === "tarkea")) || (F("todoDue") ? (a.due || "9999").localeCompare(b.due || "9999") : 0) || (a.createdAt || "").localeCompare(b.createdAt || ""));
}
function vHuoltotyot() {
  const logs = list("logs").filter(l => l.type === "huolto").sort(byDateDesc);
  return backLink() + `<button class="btn primary block" data-action="addLog" data-type="huolto">+ ${LOG_ADD.huolto}</button>`
    + (logs.length ? logs.map(logCard).join("") : empty("Ei vielä kirjattuja huoltotöitä."));
}
function vTodos() {
  const open = openTodos();
  const done = list("todos").filter(t => t.done).sort((a, b) => (b.doneAt || "").localeCompare(a.doneAt || ""));
  let h = backLink() + `<form class="quick" data-form="addTodo"><input id="todo-new" name="text" placeholder="Uusi tehtävä, esim. Vaihda saunan lauteet" autocomplete="off" enterkeyhint="done"><button class="btn primary">Lisää</button></form>`;
  h += `<p class="form-note">Napauta tehtävää merkitäksesi sen tehdyksi. Kynästä ✎ voit muokata tehtävää.</p>`;
  h += open.length ? `<div class="list">${open.map(todoRow).join("")}</div>` : empty("Ei avoimia tehtäviä 🎉");
  if (done.length) h += details("d-todos", `Tehdyt (${done.length})`, `<div class="list">${done.map(todoRow).join("")}</div><button class="btn ghost small" data-action="clearDone" data-col="todos">Poista tehdyt listalta</button>`);
  return h;
}
function todoRow(t) {
  const chips = [];
  if (t.priority === "tarkea") chips.push(chip("Tärkeä", "warn"));
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

// ---------- Kausilistat ----------
// Kevään lista maalis–elokuu, talven lista syys–helmikuu.
const SEASON_NAMES = { talvi: "❄️ Talviteloille", kevat: "🌱 Kevään käyttöönotto" };
const SEASON_START_MONTH = { kevat: 3, talvi: 9 };
const seasonByMonth = () => { const m = new Date().getMonth() + 1; return m >= 3 && m <= 8 ? "kevat" : "talvi"; };
const defaultSeason = seasonByMonth;
// Kausi lasketaan alkaneeksi kaksi kuukautta ennen virallista alkua, jotta etuajassa aloitettu lista pysyy voimassa.
function runThreshold(season) {
  const d = new Date(), y = d.getFullYear(), m = d.getMonth() + 1, sm = SEASON_START_MONTH[season];
  return new Date(m >= sm ? y : y - 1, sm - 3, 1).toISOString();
}
const seasonItems = season => list("checkItems").filter(i => i.season === season).sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || (a.createdAt || "").localeCompare(b.createdAt || ""));
const seasonRuns = season => list("seasonRuns").filter(r => r.season === season).sort((a, b) => (b.startedAt || "").localeCompare(a.startedAt || ""));
// Kuluvan kauden kierros. Edellisvuoden kierros jää historiaan, ja uusi alkaa automaattisesti ensimmäisestä ruksista.
const currentRun = season => { const r = seasonRuns(season)[0]; return r && (r.startedAt || "") >= runThreshold(season) ? r : null; };

function startRun(season) {
  const y = new Date().getFullYear();
  return save("seasonRuns", { season, label: (season === "talvi" ? "Talviteloille " : "Kevään käyttöönotto ") + y, startedAt: nowIso(), startedByName: S.me.name, completed: {} });
}

function vKausi() {
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

function checkItemRow(it, d, idx, n) {
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

// ---------- Tavarat ----------
const shopList = s => s.list === "osta" ? "osta" : "vie";
function vTavarat() {
  const t = curTab("tavarat", "vie");
  return backLink() + seg("tavarat", [["vie", "🧺 Vie mukana"], ["osta", "🛒 Hankittavat"], ["inv", "📦 Inventaario"]]) + (t === "inv" ? vInventory() : vShopping(t === "osta" ? "osta" : "vie"));
}
function vShopping(kind) {
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
function shopRow(i) {
  const kind = shopList(i);
  const inv = i.invId ? findIn("inventory", i.invId) : null;
  const sub = i.done ? `✓ ${esc(i.doneByName)} · ${fmtDT(i.doneAt)}` : [esc(i.createdByName), inv ? "inventaariosta" + (inv.status && inv.status !== "ok" ? ` (${INV_STATUS[inv.status][0].toLowerCase()})` : "") : ""].filter(Boolean).join(" · ");
  return `<div class="item ${i.done ? "is-done" : ""}"><div class="item-row" data-action="toggleShop" data-id="${i.id}" role="button" aria-label="Merkitse ${kind === "osta" ? "hankituksi" : "hoidetuksi"}: ${esc(i.text)}">
    <span class="check ${i.done ? "on" : ""}"></span>
    <div class="item-main"><div class="item-title">${esc(i.text)}</div><div class="by">${sub}</div></div>
    ${kind === "osta" && !i.done ? `<button class="btn small ghost" data-action="moveShop" data-id="${i.id}" title="Siirrä Vie mukana -listalle">→ Vie</button>` : ""}
    <button class="icon-btn" data-action="delShop" data-id="${i.id}" aria-label="Poista">✕</button>
  </div></div>`;
}
function invRow(i) {
  const [lab, cls] = INV_STATUS[i.status || "ok"] || INV_STATUS.ok;
  const sub = [i.qty, i.location].filter(Boolean).map(esc).join(" · ");
  return `<div class="item"><div class="item-row"><div class="item-main" data-action="editInv" data-id="${i.id}"><div class="item-title">${esc(i.name)}</div>${sub ? `<div class="by">${sub}</div>` : ""}</div><button class="status ${cls}" data-action="invStatus" data-id="${i.id}">${lab}</button></div></div>`;
}
function vInventory() {
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

// ---------- Kulut ----------
function vKulut() {
  const cy = new Date().getFullYear();
  const yearSet = new Set([cy]);
  list("payments").forEach(p => p.date && yearSet.add(+p.date.slice(0, 4)));
  list("logs").forEach(l => l.cost && l.date && yearSet.add(+l.date.slice(0, 4)));
  const years = [...yearSet].sort((a, b) => b - a);
  const y = S.kulutYear || cy; const ys = String(y);
  const t = today();

  const pays = list("payments").filter(p => (p.date || "").startsWith(ys));
  const cats = {};
  const add = (k, v) => { if (v) cats[k] = (cats[k] || 0) + num(v); };
  pays.forEach(p => add(p.category || "Muu", p.amount));
  list("logs").filter(l => (l.date || "").startsWith(ys)).forEach(l => add(LOG_TYPES[l.type], l.cost));
  list("repairs").filter(r => r.status === "valmis" && (r.doneDate || "").startsWith(ys)).forEach(r => add("Korjaukset", r.actualCost));
  const total = Object.values(cats).reduce((a, b) => a + b, 0);
  const max = Math.max(1, ...Object.values(cats));
  const paid = pays.filter(p => p.paid).reduce((s, p) => s + num(p.amount), 0);
  const payTotal = pays.reduce((s, p) => s + num(p.amount), 0);

  let h = backLink() + `<div class="chips years">${years.map(yy => `<button class="chip-btn ${yy === y ? "on" : ""}" data-action="kulutYear" data-year="${yy}">${yy}</button>`).join("")}</div>`;
  h += `<div class="card"><div class="card-label">Mökin kulut ${y}</div><div class="huge">${eur(total)}</div>
    ${payTotal ? `<div class="muted small">Laskuista maksettu ${eur(paid)} / ${eur(payTotal)}</div>` : ""}
    ${total ? `<div class="bars">${Object.entries(cats).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<div class="bar-row"><span class="bar-l">${esc(k)}</span><span class="bar-t"><i style="width:${Math.max(2, v / max * 100)}%"></i></span><span class="bar-v">${eur(v)}</span></div>`).join("")}</div>` : '<div class="muted">Ei kuluja tälle vuodelle.</div>'}
    <div class="form-note">Mukana laskut sekä nuohousten, puiden, huoltojen ja valmiiden korjausten kustannukset.</div></div>`;

  h += `<button class="btn primary block" data-action="addPay">+ Lisää maksu</button>`;

  const unpaid = list("payments").filter(p => !p.paid).sort((a, b) => (a.date || "").localeCompare(b.date || ""));
  if (unpaid.length) h += secH("Maksamatta") + `<div class="list">${unpaid.map(payRow).join("")}</div>`;

  const paidY = pays.filter(p => p.paid).sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  h += secH(`Maksetut ${y}`) + (paidY.length ? `<div class="list">${paidY.map(payRow).join("")}</div>` : empty("Ei maksettuja laskuja."));

  // Toistuvat kulut – arvio vuodessa
  const latest = {};
  list("payments").filter(p => RECUR_MONTHS[p.recurrence]).forEach(p => {
    const k = p.name.toLowerCase();
    if (!latest[k] || (p.date || "") > (latest[k].date || "")) latest[k] = p;
  });
  const rec = Object.values(latest);
  if (rec.length && F("payRecurring")) {
    const yearly = p => num(p.amount) * 12 / RECUR_MONTHS[p.recurrence];
    h += secH("Toistuvat kulut – arvio vuodessa") + `<div class="card"><table class="tbl"><tbody>${rec.sort((a, b) => yearly(b) - yearly(a)).map(p => `<tr><td>${esc(p.name)}<div class="muted small">${RECUR.find(r => r[0] === p.recurrence)[1]}</div></td><td class="r">${eur(yearly(p))}</td></tr>`).join("")}<tr class="sum"><td>Yhteensä</td><td class="r">${eur(rec.reduce((s, p) => s + yearly(p), 0))}</td></tr></tbody></table></div>`;
  }
  return h;
}
function payRow(p) {
  const t = today();
  const r = RECUR.find(x => x[0] === p.recurrence);
  return `<div class="item ${p.paid ? "is-done" : ""}"><div class="item-row">
    <button class="check ${p.paid ? "on" : ""}" data-action="togglePaid" data-id="${p.id}" aria-label="Merkitse maksetuksi"></button>
    <div class="item-main" data-action="editPay" data-id="${p.id}">
      <div class="item-title row-between"><span>${esc(p.name)}</span><span class="amt">${eur(p.amount)}</span></div>
      <div class="chips">${chip(esc(p.category || "Muu"))}${F("payRecurring") && r && p.recurrence !== "kerta" ? chip("↻ " + r[1]) : ""}${p.date ? (F("payDue") ? chip((p.paid ? "" : "Eräpäivä ") + fmtDate(p.date), !p.paid && p.date < t ? "bad" : "") : chip(fmtDate(p.date))) : ""}${p.payer ? chip("👤 " + esc(p.payer)) : ""}${p.photos?.length ? chip("📎") : ""}</div>
      ${p.paid && p.paidByName ? `<div class="by">✓ Merkitsi maksetuksi ${esc(p.paidByName)}</div>` : ""}
    </div></div></div>`;
}

// ---------- Lisää ----------
function vLisaa() {
  const noPin = isAdmin() ? S.users.filter(u => !S.pins[u]).length : 0;
  const inNav = T().navItems;
  const items = [
    ...SECTIONS.filter(x => !inNav.includes(x[0])).map(([k, , ic, t, d]) => [k, ic, t, d]),
    ["kayttajat", "👥", isAdmin() ? "Käyttäjät ja PIN-koodit" : "Käyttäjät", noPin ? `${noPin} käyttäjältä puuttuu PIN` : S.users.join(", ")],
    ["profiili", "👤", "Oma profiili", (isAdmin() ? "👑 " : "") + S.me.name]
  ];
  if (isAdmin()) items.push(["ulkoasu", "🎨", "Ulkoasu ja ominaisuudet", "Värit, tekstit, etusivu ja valinnaiset toiminnot"]);
  return `<div class="menu">${items.map(([v, ic, t, d]) => `<a class="menu-item" href="#${v}"><span class="menu-ic">${ic}</span><span class="menu-t"><b>${t}</b><small class="${v === "kayttajat" && noPin ? "warn" : ""}">${esc(d)}</small></span><span class="chev">›</span></a>`).join("")}</div>
    <button class="btn ghost block" data-action="switchUser">Vaihda käyttäjää</button>`;
}

// ---------- Perustiedot ----------
const INFO_FIELDS = [
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
function vPerustiedot() {
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
function bookingLine(b) {
  const range = b.end && b.end !== b.start ? `${fmtShort(b.start)}–${fmtDate(b.end)}` : fmtDate(b.start);
  return `<div class="line"><span><i class="dot" style="background:${colorFor(b.who)}"></i>${esc(b.who)}</span><span class="muted">${range}</span></div>`;
}
function vVaraukset() {
  const t = today();
  const ym = S.calMonth || t.slice(0, 7);
  const [Y, M] = ym.split("-").map(Number);
  const offset = (new Date(Y, M - 1, 1).getDay() + 6) % 7;
  const daysIn = new Date(Y, M, 0).getDate();
  const bks = list("bookings");
  let cells = "";
  for (let i = 0; i < offset; i++) cells += '<div class="cal-cell blank"></div>';
  for (let d = 1; d <= daysIn; d++) {
    const ds = `${Y}-${pad(M)}-${pad(d)}`;
    const bs = bks.filter(b => b.start <= ds && (b.end || b.start) >= ds);
    cells += `<button class="cal-cell ${ds === t ? "today" : ""} ${ds < t ? "past" : ""}" data-action="calDay" data-date="${ds}" aria-label="${d}. ${MONTHS[M - 1]}"><span class="cal-d">${d}</span><span class="cal-bs">${bs.slice(0, 3).map(b => `<span class="cal-b" style="background:${colorFor(b.who)}">${esc(initials(b.who))}</span>`).join("")}</span></button>`;
  }
  let h = backLink();
  h += `<div class="card cal"><div class="cal-head"><button class="icon-btn" data-action="calNav" data-dir="-1" aria-label="Edellinen kuukausi">‹</button><b>${MONTHS[M - 1][0].toUpperCase() + MONTHS[M - 1].slice(1)} ${Y}</b><button class="icon-btn" data-action="calNav" data-dir="1" aria-label="Seuraava kuukausi">›</button></div>
    <div class="cal-grid">${["ma", "ti", "ke", "to", "pe", "la", "su"].map(w => `<div class="cal-w">${w}</div>`).join("")}${cells}</div>
    <div class="form-note">Napauta päivää lisätäksesi varauksen.</div></div>`;
  h += `<button class="btn primary block" data-action="addBooking">+ Uusi varaus</button>`;
  const up = bks.filter(b => (b.end || b.start) >= t).sort((a, b) => a.start.localeCompare(b.start));
  const past = bks.filter(b => (b.end || b.start) < t).sort((a, b) => b.start.localeCompare(a.start));
  h += secH("Tulevat") + (up.length ? `<div class="list">${up.map(bookingRow).join("")}</div>` : empty("Ei tulevia varauksia."));
  if (past.length) h += details("d-past", `Menneet (${past.length})`, `<div class="list">${past.slice(0, 30).map(bookingRow).join("")}</div>`);
  return h;
}
function bookingRow(b) {
  const range = b.end && b.end !== b.start ? `${fmtDate(b.start)} – ${fmtDate(b.end)}` : fmtDate(b.start);
  const nights = b.end ? daysBetween(b.start, b.end) : 0;
  return `<div class="item"><div class="item-row"><span class="avatar" style="background:${colorFor(b.who)}">${esc(initials(b.who))}</span><div class="item-main" data-action="editBooking" data-id="${b.id}"><div class="item-title">${esc(b.who)}</div><div class="by">${range}${nights > 0 ? ` · ${nights} yötä` : ""}${b.note ? " · " + esc(b.note) : ""}</div></div></div></div>`;
}

// ---------- Korjaussuunnitelma ----------
function vKorjaukset() {
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

// ---------- Käyttäjät ja PIN-koodit ----------
function vKayttajat() {
  const admin = isAdmin();
  let h = backLink();
  h += `<div class="card"><div class="card-label">Näin kirjautuminen toimii</div><p>Jokainen laite kirjautuu kerran yhteisellä tunnuksella. Sen jälkeen jokainen valitsee oman nimensä ja syöttää oman 4-numeroisen PIN-koodinsa.</p>${admin ? "" : '<p class="form-note">PIN-koodit asettaa pääkäyttäjä. Oman PIN-koodin voit vaihtaa kohdassa Oma profiili.</p>'}</div>`;
  h += `<div class="list">${S.users.map((u, i) => {
    const self = u === S.me.name;
    const badges = [u === ADMIN_NAME ? chip("👑 Pääkäyttäjä", "strong") : "", S.pins[u] ? chip("✓ PIN asetettu") : chip("PIN puuttuu", "warn")].join("");
    const btns = admin ? `<button class="btn small" data-action="setPin" data-name="${esc(u)}">${S.pins[u] ? "Vaihda PIN" : "Aseta PIN"}</button>${u !== ADMIN_NAME ? `<button class="btn small ghost" data-action="renameUser" data-name="${esc(u)}">Nimeä</button><button class="btn small ghost" data-action="removeUser" data-name="${esc(u)}">Poista</button>` : ""}<span class="order-btns"><button class="icon-btn" data-action="moveUser" data-name="${esc(u)}" data-dir="-1" ${i === 0 ? "disabled" : ""} aria-label="Ylös">↑</button><button class="icon-btn" data-action="moveUser" data-name="${esc(u)}" data-dir="1" ${i === S.users.length - 1 ? "disabled" : ""} aria-label="Alas">↓</button></span>` : "";
    return `<div class="item"><div class="item-row"><span class="avatar" style="background:${colorFor(u)}">${esc(initials(u))}</span><div class="item-main"><div class="item-title">${esc(u)}${self ? " (sinä)" : ""}</div><div class="chips">${badges}</div>${btns ? `<div class="row-btns">${btns}</div>` : ""}</div></div></div>`;
  }).join("")}</div>`;
  if (admin) h += `<button class="btn primary block" data-action="addUser">+ Lisää käyttäjä</button>`;
  return h;
}

// ---------- Profiili ----------
function vProfiili() {
  return backLink() + `<div class="card"><div class="card-label">Oma profiili</div>
    <div class="row-between"><div class="big">${isAdmin() ? "👑 " : ""}${esc(S.me.name)}</div><span class="avatar" style="background:${colorFor(S.me.name)}">${esc(initials(S.me.name))}</span></div>
    <div class="dl-row"><dt>Rooli</dt><dd>${isAdmin() ? "Pääkäyttäjä" : "Käyttäjä"}</dd></div>
    <div class="row-btns"><button class="btn primary" data-action="setPin" data-name="${esc(S.me.name)}">Vaihda oma PIN</button><button class="btn ghost" data-action="switchUser">Vaihda käyttäjää</button></div></div>
    <div class="card"><div class="card-label">Asenna puhelimeen</div>
    <p><b>iPhone:</b> avaa sovellus Safarissa → Jaa-painike → <i>Lisää Koti-valikkoon</i>.</p>
    <p><b>Android:</b> avaa Chromessa → ⋮-valikko → <i>Asenna sovellus</i> tai <i>Lisää aloitusnäytölle</i>.</p>
    <p class="form-note">Asennettuna sovellus aukeaa myös ilman verkkoyhteyttä, ja tehdyt kirjaukset tallentuvat, kun yhteys palaa.</p></div>
    <div class="card"><div class="card-label">Laite</div><p class="form-note">Tämä laite on kirjautunut tunnuksella ${esc(S.user.email)}. Uloskirjautumisen jälkeen tarvitaan taas yhteinen salasana.</p>
    <div class="row-btns"><button class="btn ghost" data-action="logoutDevice">Kirjaa laite ulos</button>${isAdmin() ? '<button class="btn ghost" data-action="resetPw">Vaihda yhteinen salasana</button>' : ""}</div></div>`;
}

// ---------- Ulkoasu (vain pääkäyttäjä) ----------
const tPath = (o, p) => p.split(".").reduce((a, k) => a?.[k], o);
function tSet(o, path, v) {
  const ks = path.split("."); const last = ks.pop(); let a = o;
  for (const k of ks) a = (a[k] ??= {});
  if (path.startsWith("home.") && (v === "" || v === false)) delete a[last]; else a[last] = v;
}
const tId = p => "tk-" + p.replace(/\./g, "-");
const tColor = (p, label) => { const v = tPath(S.themeDraft, p); return `<label class="t-row"><span>${esc(label)}</span><span class="t-color"><code data-tv="${p}">${esc(v)}</code><input type="color" id="${tId(p)}" data-tk="${p}" value="${esc(v)}"></span></label>`; };
const tRange = (p, label, min, max, step, unit = "") => { const v = tPath(S.themeDraft, p); return `<label class="t-row t-range"><span>${esc(label)} <b data-tv="${p}" data-unit="${unit}">${fmtNum(v)}${unit}</b></span><input type="range" id="${tId(p)}" data-tk="${p}" min="${min}" max="${max}" step="${step}" value="${v}"></label>`; };
const tSelect = (p, label, opts, isNum = false) => { const v = tPath(S.themeDraft, p); return `<label class="fld"><span>${esc(label)}</span><select id="${tId(p)}" data-tk="${p}" ${isNum ? 'data-num="1"' : ""}>${opts.map(([k, l]) => `<option value="${esc(k)}" ${String(k) === String(v) ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></label>`; };
const tCheck = (p, label, inv = false) => { const v = tPath(S.themeDraft, p); return `<label class="fld-check"><input type="checkbox" id="${tId(p)}" data-tk="${p}" ${inv ? 'data-inv="1"' : ""} ${(inv ? !v : v) ? "checked" : ""}><span>${esc(label)}</span></label>`; };
const tText = (p, label, ph = "", rows = 0) => { const v = tPath(S.themeDraft, p) ?? ""; return `<label class="fld"><span>${esc(label)}</span>${rows ? `<textarea id="${tId(p)}" data-tk="${p}" rows="${rows}" placeholder="${esc(ph)}">${esc(v)}</textarea>` : `<input id="${tId(p)}" data-tk="${p}" value="${esc(v)}" placeholder="${esc(ph)}" autocomplete="off">`}</label>`; };

function contrastHtml(p) {
  const pairs = [["ink", "bg", "Teksti / tausta", 4.5], ["ink", "card", "Teksti / kortti", 4.5], ["head", "card", "Otsikot / kortti", 3],
    ["muted", "card", "Himmeä teksti / kortti", 3], ["label", "card", "Pienet otsikot / kortti", 3], ["primary", "card", "Pääväri / kortti", 3]];
  const bad = pairs.map(([a, b, l, min]) => [l, contrast(p[a], p[b]), min]).filter(([, c, min]) => c < min);
  return bad.length ? `<div class="t-warn">⚠️ Huono luettavuus: ${bad.map(([l, c]) => `${esc(l)} (${c.toFixed(1).replace(".", ",")}:1)`).join(", ")}. Valitse kontrastisempi väri.</div>` : `<div class="form-note ok">✓ Värit ovat hyvin luettavissa.</div>`;
}
function saveBarState() {
  const d = themeDirty();
  return [d, d ? "Tallentamattomia muutoksia – vain sinä näet ne" : "Ei tallentamattomia muutoksia"];
}
function updateSaveBar() {
  const bar = $("#t-savebar"); if (!bar) return;
  const [d, txt] = saveBarState();
  bar.classList.toggle("dirty", d); bar.querySelector(".savebar-t").textContent = txt;
  bar.querySelectorAll('[data-action="themeSave"],[data-action="themeUndo"]').forEach(b => b.disabled = !d);
  const c = bar.querySelector('[data-action="homeCancel"]'); if (c) c.textContent = d ? "Peru" : "Sulje";
}

function vUlkoasu() {
  if (!isAdmin() || !S.themeDraft) return backLink() + `<div class="card muted">Ulkoasua voi muokata vain pääkäyttäjä.</div>`;
  const D = S.themeDraft, pal = S.themePal;
  let h = backLink();
  h += `<p class="form-note">Muutokset näkyvät heti esikatseluna vain sinulle. Kun painat <b>Tallenna kaikille</b>, ulkoasu päivittyy kaikkien laitteisiin.${S.themeMeta?.at ? ` Viimeksi tallentanut ${esc(S.themeMeta.by || "")} ${fmtDT(S.themeMeta.at)}.` : ""}</p>`;

  // Valmiit teemat
  h += secH("Valmiit teemat") + `<div class="presets">${Object.entries(THEME_PRESETS).map(([k, p]) => `<button class="preset" data-action="themePreset" data-preset="${k}"><span class="sw">${["bg", "card", "primary", "accent"].map(c => `<i style="background:${p[pal][c]}"></i>`).join("")}</span>${esc(p.name)}</button>`).join("")}</div>`;

  // Värit
  h += secH("Värit") + `<div class="card t-card">
    ${tSelect("mode", "Väritila", [["auto", "Automaattinen (laitteen mukaan)"], ["light", "Aina vaalea"], ["dark", "Aina tumma"]])}
    <div class="seg">${[["light", "☀️ Vaalea paletti"], ["dark", "🌙 Tumma paletti"]].map(([k, l]) => `<button data-action="themePal" data-pal="${k}" class="${k === pal ? "on" : ""}">${l}</button>`).join("")}</div>
    <p class="form-note">Muokkaat nyt ${pal === "light" ? "vaaleaa" : "tummaa"} palettia, ja esikatselu näyttää sen.</p>
    <div class="card t-preview"><div class="card-label">Esikatselu</div><div class="big">Iso otsikko</div><p>Tavallista tekstiä ja <span class="muted">himmeää tekstiä</span>.</p>
      <div class="chips">${chip("Merkki")}${chip("OK", "ok-chip")}${chip("Vähissä", "warn")}${chip("Myöhässä", "bad")}</div>
      <div class="bar-t t-bar"><i style="width:60%"></i></div>
      <div class="row-btns"><button class="btn primary" type="button">Pääpainike</button><button class="btn" type="button">Painike</button></div></div>
    <div class="t-colors">${COLOR_FIELDS.map(([k, l]) => tColor(`${pal}.${k}`, l)).join("")}</div>
    <div id="t-contrast">${contrastHtml(D[pal])}</div>
    ${tSelect("topbar", "Yläpalkin tyyli", [["plain", "Taustan värinen"], ["color", "Pääväri"]])}
  </div>`;

  // Muodot
  h += secH("Muodot ja tilat") + `<div class="card t-card">
    ${tRange("shape.radius", "Korttien pyöristys", 0, 32, 1, " px")}
    ${tRange("shape.btnRadius", "Painikkeiden pyöristys", 0, 24, 1, " px")}
    ${tRange("shape.inputRadius", "Kenttien pyöristys", 0, 24, 1, " px")}
    ${tRange("shape.border", "Reunaviivan paksuus", 0, 3, 1, " px")}
    ${tSelect("shape.shadow", "Varjot", Object.entries(SHADOWS))}
    ${tSelect("shape.density", "Väljyys", Object.entries(DENSITY).map(([k, v]) => [k, v[0]]))}
  </div>`;

  // Teksti
  h += secH("Teksti ja fontit") + `<div class="card t-card">
    ${tRange("type.scale", "Tekstin koko", 85, 130, 5, " %")}
    ${tSelect("type.font", "Leipätekstin fontti", Object.entries(FONTS).map(([k, v]) => [k, v[0]]))}
    ${tSelect("type.headFont", "Otsikoiden fontti", Object.entries(FONTS).map(([k, v]) => [k, v[0]]))}
    ${tSelect("type.headWeight", "Otsikoiden paksuus", HEAD_WEIGHTS, true)}
    ${tRange("type.titleSize", "Sivun otsikon koko", 1, 2, 0.05, " rem")}
    ${tCheck("type.labelCaps", "Korttien pienet otsikot ISOILLA KIRJAIMILLA")}
  </div>`;

  // Sisältö
  h += secH("Tekstisisältö") + `<div class="card t-card">
    ${tText("text.appName", "Sovelluksen nimi", CABIN_NAME)}
    ${tText("text.tagline", "Alaotsikko kirjautumissivulla", DEFAULT_THEME.text.tagline)}
  </div>`;

  // Alavalikko
  const inNav = D.navItems, rest = SECTIONS.filter(x => !inNav.includes(x[0]));
  const sec = k => SECTIONS.find(x => x[0] === k);
  h += secH("Alavalikko") + `<p class="form-note">Valitse mitkä osiot näkyvät alavalikossa (enintään ${NAV_MAX}). Koti ja Lisää ovat aina mukana, ja muut osiot löytyvät Lisää-valikosta. Voit myös nimetä alavalikon painikkeet.</p>
    <div class="list">
      <div class="item"><div class="item-row t-navrow"><span class="t-navic"><svg viewBox="0 0 24 24">${ICONS.koti}</svg></span><div class="item-main">${tText("text.nav.koti", "Koti (aina ensimmäisenä)", "Koti")}</div></div></div>
      ${inNav.map((k, i) => `<div class="item"><div class="item-row t-navrow"><span class="t-navic"><svg viewBox="0 0 24 24">${ICONS[k]}</svg></span>
        <div class="item-main">${tText(`text.nav.${k}`, sec(k)[3], sec(k)[1])}</div>
        <span class="order-btns"><button class="icon-btn" data-action="navMove" data-key="${k}" data-dir="-1" ${i === 0 ? "disabled" : ""} aria-label="Ylös">↑</button><button class="icon-btn" data-action="navMove" data-key="${k}" data-dir="1" ${i === inNav.length - 1 ? "disabled" : ""} aria-label="Alas">↓</button></span>
        <button class="icon-btn" data-action="navRemove" data-key="${k}" aria-label="Siirrä Lisää-valikkoon" title="Siirrä Lisää-valikkoon">✕</button></div></div>`).join("")}
      <div class="item"><div class="item-row t-navrow"><span class="t-navic"><svg viewBox="0 0 24 24">${ICONS.lisaa}</svg></span><div class="item-main">${tText("text.nav.lisaa", "Lisää (aina viimeisenä)", "Lisää")}</div></div></div>
    </div>
    ${rest.length ? `<div class="form-note">Lisää-valikossa nyt – napauta siirtääksesi alavalikkoon:</div><div class="chips">${rest.map(x => `<button class="chip-btn" data-action="navAdd" data-key="${x[0]}" ${inNav.length >= NAV_MAX ? "disabled" : ""}>+ ${esc(x[3])}</button>`).join("")}</div>${inNav.length >= NAV_MAX ? `<p class="form-note">Alavalikko on täynnä. Poista ensin jokin ✕-painikkeella.</p>` : ""}` : ""}`;

  // Ominaisuudet
  h += secH("Ominaisuudet") + `<div class="card t-card"><p class="form-note">Valinnaiset aikataulutoiminnot. Pois päältä ollessaan ne eivät näy kenellekään, mutta jo tallennetut tiedot säilyvät.</p>
    ${FEATURES.map(([k, l, d]) => `${tCheck("features." + k, l)}<p class="form-note t-feat">${esc(d)}</p>`).join("")}</div>`;

  // Etusivu
  h += secH("Etusivu") + `<div class="card"><p>Etusivun korttien järjestys, koko, otsikot, tervehdys ja tiedote muokataan suoraan etusivulla, jotta näet heti miltä se näyttää.</p>
    <div class="row-btns"><button class="btn" data-action="homeEdit">✎ Muokkaa etusivua</button></div></div>`;

  h += `<button class="btn danger ghost block" data-action="themeReset">Palauta oletusulkoasu</button>`;
  const [d, txt] = saveBarState();
  h += `<div id="t-savebar" class="savebar ${d ? "dirty" : ""}"><span class="savebar-t">${txt}</span><button class="btn ghost small" data-action="themeUndo" ${d ? "" : "disabled"}>Peru</button><button class="btn primary small" data-action="themeSave" ${d ? "" : "disabled"}>Tallenna kaikille</button></div>`;
  return h;
}

function onThemeInput(e) {
  const el = e.target;
  if (!el?.dataset?.tk || !S.themeDraft) return;
  let v = el.type === "checkbox" ? el.checked : el.value;
  if (el.dataset.inv) v = !v;
  if (el.dataset.num || el.type === "range") v = Number(v);
  const p = el.dataset.tk;
  tSet(S.themeDraft, p, v);
  document.querySelectorAll(`[data-tv="${p}"]`).forEach(x => x.textContent = (el.type === "color" ? v : fmtNum(v)) + (x.dataset.unit || ""));
  if (p === "mode" && v !== "auto" && v !== S.themePal) { S.themePal = v; previewTheme(); render(); return; }
  previewTheme();
  if (/^(light|dark)\./.test(p)) { const c = $("#t-contrast"); if (c) c.innerHTML = contrastHtml(S.themeDraft[S.themePal]); }
  if (p.startsWith("text.nav.")) renderNav();
  updateSaveBar();
}
document.addEventListener("input", onThemeInput);
document.addEventListener("change", onThemeInput);

const VIEWS = {
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
  ulkoasu: { title: () => "Ulkoasu ja ominaisuudet", render: vUlkoasu }
};

// ---------- Renderöinti ----------
let rq = false;
function scheduleRender() { if (rq) return; rq = true; requestAnimationFrame(() => { rq = false; render(); }); }
function render() {
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
  renderNav();
  if (keep) {
    const el = document.getElementById(keep.id);
    if (el) { el.value = keep.val; el.focus(); try { el.setSelectionRange(keep.s, keep.s); } catch { } }
  }
  hydratePhotos(view);
}
function renderNav() {
  const keys = navKeys();
  const active = keys.includes(S.view) ? S.view : "lisaa";
  const pending = isAdmin() ? S.users.filter(u => !S.pins[u]).length : 0;
  const labels = T().text.nav;
  const nav = $("#nav");
  nav.style.gridTemplateColumns = `repeat(${keys.length}, 1fr)`;
  nav.classList.toggle("many", keys.length > 6);
  nav.innerHTML = NAV.filter(([k]) => keys.includes(k)).sort((a, b) => keys.indexOf(a[0]) - keys.indexOf(b[0])).map(([k, l]) => `<a href="#${k}" class="${k === active ? "on" : ""}" ${k === active ? 'aria-current="page"' : ""}><svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[k]}</svg><span>${esc(labels[k] || l)}</span>${k === "lisaa" && pending ? `<b class="badge">${pending}</b>` : ""}</a>`).join("");
}
function routeFromHash() { const h = location.hash.slice(1); S.view = VIEWS[h] ? h : "koti"; }
window.addEventListener("hashchange", () => {
  const prev = S.view;
  routeFromHash();
  const editing = prev === "ulkoasu" ? !S.homeEdit : (prev === "koti" && S.homeEdit);
  if (editing && S.view !== prev && S.themeDraft) {
    if (themeDirty() && !confirm("Muutoksia ei ole tallennettu. Hylätäänkö ne?")) { location.hash = prev; return; }
    discardThemeDraft();
  }
  previewTheme();
  S.editOrder = false; window.scrollTo(0, 0); render();
});

// =============================================================
//  TOIMINNOT
// =============================================================
const findIn = (col, id) => list(col).find(x => x.id === id);

const ACTIONS = {
  tab: d => { S.tab[d.view] = d.tab; S.editOrder = false; if (location.hash.slice(1) !== d.view) location.hash = d.view; else render(); },
  copy: async d => { try { await navigator.clipboard.writeText(d.text); toast("Kopioitu"); } catch { prompt("Kopioi:", d.text); } },
  switchUser: () => switchUser(),
  logoutDevice: () => { if (confirm("Kirjataanko tämä laite ulos? Seuraavalla kerralla tarvitaan yhteinen salasana.")) { try { localStorage.removeItem(USER_KEY); } catch { } signOut(auth); } },

  // Huolto
  addLog: d => openForm({ title: LOG_ADD[d.type], fields: LOG_FIELDS[d.type], onSubmit: v => { save("logs", { ...v, type: d.type }); toast("Tallennettu"); } }),
  editLog: d => {
    const l = findIn("logs", d.id); if (!l) return;
    openForm({ title: "Muokkaa: " + (l.type === "huolto" ? l.title : LOG_TYPES[l.type]), fields: LOG_FIELDS[l.type], values: l, onSubmit: v => save("logs", v, l.id), onDelete: () => remove("logs", l.id) });
  },

  // Tehtävät
  toggleTodo: d => { const t = findIn("todos", d.id); if (!t) return; patch("todos", t.id, t.done ? { done: false, doneByName: null, doneAt: null } : { done: true, doneByName: S.me.name, doneAt: nowIso() }); },
  editTodo: d => {
    const t = findIn("todos", d.id); if (!t) return;
    openForm({
      title: "Muokkaa tehtävää", values: t,
      fields: [
        { name: "text", label: "Tehtävä", required: true },
        { name: "notes", label: "Lisätiedot", type: "textarea" },
        { name: "priority", label: "Tärkeys", type: "select", options: [["normaali", "Normaali"], ["tarkea", "Tärkeä"]] },
        ...(F("todoDue") ? [{ name: "due", label: "Määräaika", type: "date" }] : []),
        { name: "assignee", label: "Tekijä", type: "select", options: () => [["", "Ei määritelty"], ...memberNames()] }
      ],
      onSubmit: v => save("todos", v, t.id), onDelete: () => remove("todos", t.id)
    });
  },
  clearDone: d => {
    const done = list(d.col).filter(x => x.done && (!d.list || shopList(x) === d.list)); if (!done.length) return;
    if (!confirm(`Poistetaanko ${done.length} kohtaa pysyvästi?`)) return;
    const b = writeBatch(db); done.forEach(x => b.delete(doc(db, d.col, x.id))); b.commit().catch(fail);
  },

  // Kausilistat
  toggleCheck: d => {
    const it = findIn("checkItems", d.id); if (!it) return;
    let run = currentRun(it.season);
    if (!run) { const id = startRun(it.season); run = { id, completed: {} }; }
    const key = `completed.${it.id}`;
    if (run.completed?.[it.id]) patch("seasonRuns", run.id, { [key]: deleteField() });
    else patch("seasonRuns", run.id, { [key]: { title: it.title, byName: S.me.name, at: nowIso() } });
  },
  expand: d => { S.expanded.has(d.id) ? S.expanded.delete(d.id) : S.expanded.add(d.id); render(); },
  addItem: d => openForm({ title: "Uusi kohta", fields: ITEM_FIELDS, onSubmit: v => { const items = seasonItems(d.season); save("checkItems", { ...v, season: d.season, order: items.length ? (items[items.length - 1].order ?? 0) + 10 : 10 }); } }),
  editItem: d => { const it = findIn("checkItems", d.id); if (!it) return; openForm({ title: "Muokkaa kohtaa", fields: ITEM_FIELDS, values: it, onSubmit: v => save("checkItems", v, it.id), onDelete: () => remove("checkItems", it.id) }); },
  toggleOrder: () => { S.editOrder = !S.editOrder; render(); },
  moveItem: d => {
    const it = findIn("checkItems", d.id); if (!it) return;
    const items = seasonItems(it.season); const i = items.findIndex(x => x.id === it.id); const j = i + Number(d.dir);
    if (j < 0 || j >= items.length) return;
    [items[i], items[j]] = [items[j], items[i]];
    const b = writeBatch(db); items.forEach((x, k) => { if (x.order !== (k + 1) * 10) b.update(doc(db, "checkItems", x.id), { order: (k + 1) * 10 }); }); b.commit().catch(fail);
  },
  seedItems: d => {
    const b = writeBatch(db);
    DEFAULT_ITEMS[d.season].forEach(([title, instructions], k) => b.set(doc(collection(db, "checkItems")), { title, instructions, photos: [], season: d.season, order: (k + 1) * 10, ...meta() }));
    b.commit().catch(fail); toast("Oletuskohdat lisätty");
  },
  newRun: d => {
    const run = currentRun(d.season);
    const items = seasonItems(d.season);
    const done = items.filter(i => run?.completed?.[i.id]).length;
    if (!confirm(`Aloitetaanko uusi kausi? Nykyinen lista nollataan (${done}/${items.length} tehty). Vanha kausi jää historiaan.`)) return;
    startRun(d.season); toast("Uusi kausi aloitettu");
  },
  runHistory: d => {
    const runs = seasonRuns(d.season); const total = seasonItems(d.season).length;
    openSheet("Historia", runs.map(r => {
      const entries = Object.values(r.completed || {}).sort((a, b) => (a.at || "").localeCompare(b.at || ""));
      return `<div class="hist"><div class="row-between"><b>${esc(r.label)}</b><span class="muted small">${entries.length}/${total}</span></div><div class="muted small">Aloitti ${esc(r.startedByName)} ${fmtDT(r.startedAt)}</div>
        ${entries.length ? `<ul class="hist-list">${entries.map(e => `<li><span>${esc(e.title)}</span><span class="muted small">${esc(e.byName)} · ${fmtDT(e.at)}</span></li>`).join("")}</ul>` : '<p class="muted small">Ei merkintöjä.</p>'}</div>`;
    }).join(""));
  },

  // Tavarat
  toggleShop: d => {
    const s = findIn("shopping", d.id); if (!s) return;
    if (s.done) patch("shopping", s.id, { done: false, doneByName: null, doneAt: null });
    else {
      patch("shopping", s.id, { done: true, doneByName: S.me.name, doneAt: nowIso() });
      if (s.invId && findIn("inventory", s.invId)) patch("inventory", s.invId, { status: "ok" });
    }
  },
  delShop: d => remove("shopping", d.id),
  moveShop: d => { patch("shopping", d.id, { list: "vie" }); toast("Siirretty Vie mukana -listalle"); },
  addInv: () => openForm({ title: "Uusi tavara", fields: INV_FIELDS, onSubmit: v => { save("inventory", v); } }),
  editInv: d => { const i = findIn("inventory", d.id); if (!i) return; openForm({ title: "Muokkaa tavaraa", fields: INV_FIELDS, values: i, onSubmit: v => { save("inventory", v, i.id); if (v.status !== "ok") ensureShopping(i.id, v.name); else closeLinked(i.id); }, onDelete: () => remove("inventory", i.id) }); },
  invStatus: d => {
    const i = findIn("inventory", d.id); if (!i) return;
    const order = ["ok", "vahissa", "loppu"];
    const next = order[(order.indexOf(i.status || "ok") + 1) % order.length];
    patch("inventory", i.id, { status: next, updatedByName: S.me.name, updatedAt: nowIso() });
    if (next !== "ok") ensureShopping(i.id, i.name); else closeLinked(i.id);
  },

  // Kulut
  kulutYear: d => { S.kulutYear = Number(d.year); render(); },
  addPay: () => openForm({ title: "Uusi maksu", fields: payFields(), onSubmit: v => { save("payments", v); toast("Tallennettu"); } }),
  editPay: d => { const p = findIn("payments", d.id); if (!p) return; openForm({ title: "Muokkaa maksua", fields: payFields(), values: p, onSubmit: v => save("payments", v, p.id), onDelete: () => remove("payments", p.id) }); },
  togglePaid: d => {
    const p = findIn("payments", d.id); if (!p) return;
    const nowPaid = !p.paid;
    patch("payments", p.id, { paid: nowPaid, paidByName: nowPaid ? S.me.name : null, paidAt: nowPaid ? nowIso() : null });
    if (nowPaid && F("payRecurring") && RECUR_MONTHS[p.recurrence]) {
      const nextDate = addMonths(p.date || today(), RECUR_MONTHS[p.recurrence]);
      const exists = list("payments").some(x => x.id !== p.id && x.name === p.name && x.date === nextDate);
      if (!exists && confirm(`Luodaanko seuraava erä "${p.name}" eräpäivälle ${fmtDate(nextDate)}?`)) {
        save("payments", { name: p.name, category: p.category, amount: p.amount, date: nextDate, recurrence: p.recurrence, payer: p.payer || "", notes: "", paid: false, photos: [] });
      }
    }
  },

  // Perustiedot
  editInfo: () => openForm({ title: "Perustiedot", fields: INFO_FIELDS, values: getInfo(), onSubmit: v => { save("info", v, "main"); toast("Tallennettu"); } }),
  addPlace: d => openForm({ title: "Uusi paikka tai ohje", fields: PLACE_FIELDS, values: { title: d.title || "" }, onSubmit: v => { save("places", v); } }),
  editPlace: d => { const p = findIn("places", d.id); if (!p) return; openForm({ title: "Muokkaa", fields: PLACE_FIELDS, values: p, onSubmit: v => save("places", v, p.id), onDelete: () => remove("places", p.id) }); },
  addContact: () => openForm({ title: "Uusi yhteystieto", fields: CONTACT_FIELDS, onSubmit: v => { save("contacts", v); } }),
  editContact: d => { const c = findIn("contacts", d.id); if (!c) return; openForm({ title: "Muokkaa yhteystietoa", fields: CONTACT_FIELDS, values: c, onSubmit: v => save("contacts", v, c.id), onDelete: () => remove("contacts", c.id) }); },

  // Varaukset
  calNav: d => { const ym = S.calMonth || today().slice(0, 7); S.calMonth = addMonths(ym + "-01", Number(d.dir)).slice(0, 7); render(); },
  calDay: d => {
    const bs = list("bookings").filter(b => b.start <= d.date && (b.end || b.start) >= d.date);
    if (bs.length === 1 && confirm(`${bs[0].who} on varannut tämän päivän. Muokataanko varausta?\n\n(Peruuta = lisää uusi varaus)`)) return ACTIONS.editBooking({ id: bs[0].id });
    bookingForm({ start: d.date, end: d.date, who: S.me.name });
  },
  addBooking: () => bookingForm({ start: today(), end: today(), who: S.me.name }),
  editBooking: d => { const b = findIn("bookings", d.id); if (b) bookingForm(b, b.id); },

  // Korjaukset
  addRepair: () => openForm({ title: "Uusi korjauskohde", fields: REPAIR_FIELDS, onSubmit: v => { save("repairs", v); } }),
  editRepair: d => { const r = findIn("repairs", d.id); if (!r) return; openForm({ title: "Muokkaa korjausta", fields: REPAIR_FIELDS, values: r, onSubmit: v => save("repairs", v, r.id), onDelete: () => remove("repairs", r.id) }); },

  // Käyttäjät
  setPin: d => {
    const name = d.name;
    if (!isAdmin() && name !== S.me.name) return;
    openForm({
      title: (S.pins[name] ? "Vaihda PIN: " : "Aseta PIN: ") + name, submitLabel: "Tallenna PIN",
      fields: [
        { type: "note", label: "PIN-koodi on 4 numeroa. Sillä kirjaudutaan omalla nimellä sovellukseen." },
        { name: "pin", label: "Uusi PIN", type: "password", required: true, placeholder: "••••" },
        { name: "pin2", label: "Uusi PIN uudelleen", type: "password", required: true, placeholder: "••••" }
      ],
      onSubmit: v => {
        if (!/^\d{4}$/.test(v.pin)) { alert("PIN-koodin pitää olla 4 numeroa."); return false; }
        if (v.pin !== v.pin2) { alert("PIN-koodit eivät täsmää."); return false; }
        saveUsers(S.users, { ...S.pins, [name]: v.pin });
        toast(`${name}: PIN tallennettu`);
      }
    });
    setTimeout(() => document.querySelectorAll("#modal input[type=password]").forEach(i => { i.inputMode = "numeric"; i.maxLength = 4; i.autocomplete = "off"; }), 0);
  },
  addUser: () => openForm({
    title: "Uusi käyttäjä", fields: [{ name: "name", label: "Nimi", required: true, placeholder: "esim. Roosa" }],
    onSubmit: v => {
      if (S.users.some(u => u.toLowerCase() === v.name.toLowerCase())) { alert("Tämä nimi on jo käytössä."); return false; }
      saveUsers([...S.users, v.name], S.pins); toast(`${v.name} lisätty. Aseta hänelle PIN.`);
    }
  }),
  renameUser: d => openForm({
    title: "Nimeä uudelleen", values: { name: d.name }, fields: [{ name: "name", label: "Uusi nimi", required: true }, { type: "note", label: "Vanhat kirjaukset näkyvät edelleen vanhalla nimellä." }],
    onSubmit: v => {
      if (v.name === d.name) return;
      if (S.users.some(u => u.toLowerCase() === v.name.toLowerCase())) { alert("Tämä nimi on jo käytössä."); return false; }
      const pins = { ...S.pins }; if (pins[d.name]) { pins[v.name] = pins[d.name]; delete pins[d.name]; }
      saveUsers(S.users.map(u => u === d.name ? v.name : u), pins);
    }
  }),
  removeUser: d => {
    if (!confirm(`Poistetaanko ${d.name} käyttäjistä? Hänen kirjauksensa säilyvät.`)) return;
    const pins = { ...S.pins }; delete pins[d.name];
    saveUsers(S.users.filter(u => u !== d.name), pins);
  },
  moveUser: d => {
    const u = [...S.users]; const i = u.indexOf(d.name); const j = i + Number(d.dir);
    if (i < 0 || j < 0 || j >= u.length) return;
    [u[i], u[j]] = [u[j], u[i]]; saveUsers(u, S.pins);
  },
  // Ulkoasu
  themePal: d => { S.themePal = d.pal; previewTheme(); render(); },
  themePreset: d => {
    const p = THEME_PRESETS[d.preset]; if (!p || !S.themeDraft) return;
    S.themeDraft.light = { ...p.light }; S.themeDraft.dark = { ...p.dark };
    previewTheme(); render(); toast(`Teema ${p.name} valittu – muista tallentaa`);
  },
  homeEdit: () => {
    if (!isAdmin()) return;
    if (S.view === "ulkoasu" && themeDirty()) { toast("Tallenna tai peru ensin ulkoasun muutokset", true); return; }
    S.themeDraft = structuredClone(S.theme); S.homeEdit = true;
    if (S.view !== "koti") location.hash = "koti"; else { previewTheme(); render(); }
  },
  homeMove: d => {
    if (!S.themeDraft) return;
    const D = S.themeDraft.home, o = D.order;
    const vis = o.filter(k => !D.hidden[k]); const i = vis.indexOf(d.key), j = i + Number(d.dir);
    if (i < 0 || j < 0 || j >= vis.length) return;
    const a = o.indexOf(vis[i]), b = o.indexOf(vis[j]);
    [o[a], o[b]] = [o[b], o[a]]; render();
  },
  navMove: d => {
    if (!S.themeDraft) return;
    const o = S.themeDraft.navItems; const i = o.indexOf(d.key), j = i + Number(d.dir);
    if (i < 0 || j < 0 || j >= o.length) return;
    [o[i], o[j]] = [o[j], o[i]]; renderNav(); render();
  },
  navRemove: d => { if (!S.themeDraft) return; S.themeDraft.navItems = S.themeDraft.navItems.filter(k => k !== d.key); render(); },
  navAdd: d => {
    if (!S.themeDraft || S.themeDraft.navItems.includes(d.key)) return;
    if (S.themeDraft.navItems.length >= NAV_MAX) { toast(`Alavalikkoon mahtuu ${NAV_MAX} osiota`, true); return; }
    S.themeDraft.navItems.push(d.key); render();
  },
  homeSize: d => { if (!S.themeDraft) return; S.themeDraft.home.size[d.key] = d.size; render(); },
  homeHide: d => { if (!S.themeDraft) return; S.themeDraft.home.hidden[d.key] = true; render(); },
  homeShow: d => { if (!S.themeDraft) return; delete S.themeDraft.home.hidden[d.key]; render(); },
  homeDefaults: () => {
    if (!S.themeDraft || !confirm("Palautetaanko etusivun oletusasettelu (järjestys, koot, otsikot)?")) return;
    S.themeDraft.home = structuredClone(DEFAULT_THEME.home); render();
  },
  homeCancel: () => {
    if (themeDirty() && !confirm("Hylätäänkö etusivun muutokset?")) return;
    discardThemeDraft(); render();
  },
  themeReset: () => {
    if (!S.themeDraft || !confirm("Palautetaanko oletusulkoasu? Muutos tulee kaikille vasta, kun painat Tallenna kaikille.")) return;
    S.themeDraft = structuredClone(DEFAULT_THEME); previewTheme(); render();
  },
  themeUndo: () => { if (!S.themeDraft) return; S.themeDraft = structuredClone(S.theme); previewTheme(); render(); },
  themeSave: () => {
    if (!isAdmin() || !S.themeDraft) return;
    const data = mergeTheme(S.themeDraft);
    const at = nowIso();
    setDoc(THEME_DOC(), { ...data, updatedByName: S.me.name, updatedAt: at }).catch(fail);
    S.theme = data; S.themeMeta = { by: S.me.name, at };
    if (S.homeEdit) { S.homeEdit = false; S.themeDraft = null; } else S.themeDraft = structuredClone(data);
    cacheTheme(); previewTheme(); render();
    toast("Ulkoasu tallennettu – näkyy kaikille");
  },

  resetPw: async () => {
    try { await sendPasswordResetEmail(auth, LOGIN_EMAIL); toast("Salasanan vaihtolinkki lähetetty: " + LOGIN_EMAIL); }
    catch (e) { toast(authError(e), true); }
  }
};

// Loppunut tai vähissä oleva tavara → Hankittavat-lista (ei Vie mukana).
function ensureShopping(invId, name) {
  if (list("shopping").some(s => !s.done && s.invId === invId)) return;
  save("shopping", { text: name, invId, done: false, list: "osta" });
  toast(`"${name}" lisätty Hankittavat-listaan`);
}
// Tavara taas OK → siihen liittyvät avoimet rivit merkitään hoidetuiksi.
function closeLinked(invId) {
  list("shopping").filter(s => !s.done && s.invId === invId).forEach(s => patch("shopping", s.id, { done: true, doneByName: S.me.name, doneAt: nowIso() }));
}

function bookingForm(values, id) {
  openForm({
    title: id ? "Muokkaa varausta" : "Uusi varaus", values,
    fields: [
      { name: "who", label: "Kuka", type: "select", options: () => { const n = memberNames(); return values.who && !n.includes(values.who) ? [values.who, ...n] : n; } },
      { name: "start", label: "Saapuminen", type: "date", required: true },
      { name: "end", label: "Lähtö", type: "date", required: true },
      { name: "note", label: "Lisätieto", placeholder: "esim. koko perhe, saunailta, talkoot" }
    ],
    onSubmit: v => {
      if (v.end < v.start) { alert("Lähtöpäivä ei voi olla ennen saapumista."); return false; }
      const clash = list("bookings").filter(b => b.id !== id && b.start <= v.end && (b.end || b.start) >= v.start);
      if (clash.length && !confirm(`Päällekkäinen varaus: ${clash.map(b => b.who + " " + fmtShort(b.start) + "–" + fmtShort(b.end || b.start)).join(", ")}.\n\nTallennetaanko silti?`)) return false;
      save("bookings", v, id); toast("Varaus tallennettu");
    },
    onDelete: id ? () => remove("bookings", id) : null
  });
}

const ITEM_FIELDS = [
  { name: "title", label: "Tehtävä", required: true },
  { name: "instructions", label: "Ohje", type: "textarea", placeholder: "esim. mitkä sulakkeet jätetään päälle" },
  { name: "photos", label: "Kuvat (esim. sähkökaappi)", type: "photos" }
];
const INV_FIELDS = [
  { name: "name", label: "Tavara", required: true, placeholder: "esim. Kaasupullo" },
  { name: "category", label: "Kategoria", type: "select", options: INV_CATS },
  { name: "qty", label: "Määrä", placeholder: "esim. 2 kpl, puoli pussia" },
  { name: "location", label: "Säilytyspaikka", placeholder: "esim. Saunan eteinen" },
  { name: "status", label: "Tilanne", type: "select", options: [["ok", "OK"], ["vahissa", "Vähissä"], ["loppu", "Loppu"]] },
  { name: "notes", label: "Lisätiedot", type: "textarea", rows: 2 }
];
const PAY_FIELDS = [
  { name: "name", label: "Maksu", required: true, placeholder: "esim. Kotivakuutus", list: ["Mökkivakuutus", "Sähkö", "Sähkön siirto", "Jätehuolto", "Kiinteistövero", "Tiemaksu", "Sakokaivon tyhjennys"] },
  { name: "category", label: "Kategoria", type: "select", options: PAY_CATS },
  { name: "amount", label: "Summa (€)", type: "number", required: true, placeholder: "0,00" },
  { name: "date", label: "Eräpäivä", type: "date", required: true, def: today },
  { name: "recurrence", label: "Toistuvuus", type: "select", options: RECUR },
  { name: "paid", label: "Maksettu", type: "checkbox" },
  { name: "payer", label: "Maksaja", type: "select", options: () => [["", "–"], ...memberNames()] },
  { name: "notes", label: "Lisätiedot", type: "textarea", rows: 2, placeholder: "esim. viitenumero, sopimusnumero" },
  { name: "photos", label: "Lasku / kuitti", type: "photos" }
];
const payFields = () => PAY_FIELDS
  .filter(f => f.name !== "recurrence" || F("payRecurring"))
  .map(f => f.name === "date" && !F("payDue") ? { ...f, label: "Päivämäärä" } : f);
const PLACE_FIELDS = [
  { name: "title", label: "Nimi", required: true, placeholder: "esim. Sähkökaappi" },
  { name: "description", label: "Kuvaus ja ohje", type: "textarea", rows: 4, placeholder: "Missä se on ja miten toimitaan" },
  { name: "photos", label: "Kuvat", type: "photos" }
];
const CONTACT_FIELDS = [
  { name: "name", label: "Nimi", required: true },
  { name: "role", label: "Rooli", list: ["Nuohooja", "Puunmyyjä", "Naapuri", "Sähköasentaja", "Putkimies", "Tienhoitokunta", "Huoltoyhtiö", "Vakuutusyhtiö", "Sähköyhtiö", "Jätehuolto"] },
  { name: "phone", label: "Puhelin", type: "tel" },
  { name: "email", label: "Sähköposti", type: "email" },
  { name: "notes", label: "Lisätiedot", type: "textarea", rows: 2 }
];
const REPAIR_FIELDS = [
  { name: "title", label: "Kohde", required: true, placeholder: "esim. Katon uusiminen" },
  { name: "description", label: "Kuvaus", type: "textarea" },
  { name: "targetYear", label: "Tavoitevuosi", type: "number", placeholder: String(new Date().getFullYear() + 1) },
  { name: "estimate", label: "Kustannusarvio (€)", type: "number" },
  { name: "status", label: "Tila", type: "select", options: REP_STATUS },
  { name: "actualCost", label: "Toteutunut hinta (€)", type: "number" },
  { name: "doneDate", label: "Valmistumispäivä", type: "date" },
  { name: "photos", label: "Kuvat", type: "photos" }
];

const FORMS = {
  addTodo: f => { const v = f.elements.text.value.trim(); if (!v) return; save("todos", { text: v, notes: "", priority: "normaali", due: "", assignee: "", done: false }); f.elements.text.value = ""; },
  addShop: f => {
    const v = f.elements.text.value.trim(); if (!v) return;
    const kind = f.elements.list?.value === "osta" ? "osta" : "vie";
    v.split(",").map(s => s.trim()).filter(Boolean).forEach(text => save("shopping", { text, done: false, list: kind }));
    f.elements.text.value = "";
  }
};

// ---------- Tapahtumat ----------
document.addEventListener("click", e => {
  if (e.target.closest("#modal") || e.target.closest("#lightbox")) return;
  const img = e.target.closest("img.thumb");
  if (img && img.src) { e.preventDefault(); e.stopPropagation(); openLightbox(img.src); return; }
  const el = e.target.closest("[data-action]");
  if (!el || el.disabled) return;
  const fn = ACTIONS[el.dataset.action];
  if (fn) { e.preventDefault(); fn(el.dataset, el); }
});
document.addEventListener("submit", e => {
  const f = e.target.closest("form[data-form]"); if (!f) return;
  e.preventDefault();
  FORMS[f.dataset.form]?.(f);
});
document.addEventListener("toggle", e => {
  if (e.target.tagName === "DETAILS" && e.target.id) e.target.open ? S.openDetails.add(e.target.id) : S.openDetails.delete(e.target.id);
}, true);
function updateNet() { const n = $("#netstatus"); if (n) n.hidden = navigator.onLine; }
window.addEventListener("online", updateNet);
window.addEventListener("offline", updateNet);

// =============================================================
//  KIRJAUTUMINEN: yhteinen Firebase-tunnus + oma nimi ja PIN
// =============================================================
function authError(e) {
  const c = e?.code || "";
  if (c.includes("invalid-credential") || c.includes("wrong-password") || c.includes("user-not-found")) return "Väärä salasana.";
  if (c.includes("network-request-failed")) return "Ei verkkoyhteyttä.";
  if (c.includes("too-many-requests")) return "Liian monta yritystä. Odota hetki.";
  if (c.includes("api-key") || c.includes("configuration")) return "Firebase-asetukset puuttuvat (firebase-config.js).";
  return "Virhe: " + (e?.message || c);
}

const CABIN_SVG = `<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="16" fill="#2f5d46"/><path d="M12 33 32 15l20 18" fill="none" stroke="#f3efe4" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M17 30v18h30V30" fill="#f3efe4"/><rect x="28" y="36" width="8" height="12" rx="1" fill="#2f5d46"/><rect x="40" y="18" width="5" height="9" fill="#f3efe4"/></svg>`;

function showOnly(id) {
  ["boot", "auth", "app"].forEach(x => { const el = document.getElementById(x); if (el) el.hidden = x !== id; });
}
function showMessage(msg, isErr = false) {
  showOnly("auth");
  $("#auth").innerHTML = `<div class="auth-card">${CABIN_SVG}<p class="${isErr ? "bad" : "muted"}">${esc(msg)}</p></div>`;
}

// 1) Laitteen kirjautuminen yhteisellä tunnuksella
function showDeviceLogin() {
  showOnly("auth");
  $("#auth").innerHTML = `<div class="auth-card">${CABIN_SVG}<h1>${esc(appName())}</h1>${T().text.tagline ? `<p class="muted">${esc(T().text.tagline)}</p>` : ""}
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
function showPicker() {
  S.authView = "picker";
  showOnly("auth");
  $("#auth").innerHTML = `<div class="auth-card">${CABIN_SVG}<h1>Kuka olet?</h1>
    <div class="picker">${S.users.map(u => `<button class="pick-btn ${u === ADMIN_NAME ? "admin" : ""}" data-name="${esc(u)}"><span class="avatar" style="background:${colorFor(u)}">${esc(initials(u))}</span><span>${u === ADMIN_NAME ? "👑 " : ""}${esc(u)}</span></button>`).join("")}</div>
  </div>`;
  $("#auth").querySelectorAll(".pick-btn").forEach(b => b.onclick = () => showPinPad(b.dataset.name));
}

// 3) PIN-koodi
function showPinPad(name) {
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

function loginAs(name) {
  document.onkeydown = null; S.authView = null;
  S.me = { name };
  try { localStorage.setItem(USER_KEY, name); } catch { }
  startApp();
}
function switchUser() {
  try { localStorage.removeItem(USER_KEY); } catch { }
  stopData(); S.me = null; S.d = {}; S.tab = {}; S.editOrder = false;
  discardThemeDraft();
  location.hash = "";
  showPicker();
}

function saveUsers(users, pins) {
  S.users = users; S.pins = pins;
  setDoc(USERS_DOC(), { users, pins, updatedAt: nowIso() }).catch(fail);
  scheduleRender();
}

function startData() {
  stopData();
  S.started = true;
  COLS.forEach(c => {
    S.unsubs.push(onSnapshot(collection(db, c), snap => {
      S.d[c] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      scheduleRender();
    }, err => console.error(c, err)));
  });
  // Kuvat ladataan välimuistiin, jotta ne näkyvät mökillä myös ilman verkkoa
  S.unsubs.push(onSnapshot(collection(db, "photos"), snap => {
    snap.docs.forEach(d => photoCache.set(d.id, d.data().data));
    hydratePhotos($("#view"));
  }, err => console.error("photos", err)));
}
function stopData() { S.unsubs.forEach(u => u()); S.unsubs = []; S.started = false; }

function startApp() {
  if (!S.started) { startData(); routeFromHash(); }
  showOnly("app");
  updateNet();
  render();
}

// Kun käyttäjälista on ladattu, jatketaan oikeaan näkymään
function afterUsersLoaded() {
  if (S.me) {
    if (!S.users.includes(S.me.name)) { switchUser(); return; }
    scheduleRender(); return;
  }
  if (S.authView === "pin") return;
  let saved = null; try { saved = localStorage.getItem(USER_KEY); } catch { }
  if (saved && S.users.includes(saved)) loginAs(saved);
  else showPicker();
}

function onThemeSnap(snap) {
  if (!snap.exists() && snap.metadata.fromCache) return; // ei tietoa vielä → pidetään laitteen muistama teema
  const data = snap.exists() ? snap.data() : {};
  S.theme = mergeTheme(data);
  S.themeMeta = data.updatedAt ? { by: data.updatedByName, at: data.updatedAt } : null;
  cacheTheme();
  if (!S.themeDraft) applyTheme(S.theme);
  if (S.me && S.started) scheduleRender();
}

let usersUnsub = null, themeUnsub = null;
onAuthStateChanged(auth, user => {
  S.user = user;
  if (usersUnsub) { usersUnsub(); usersUnsub = null; }
  if (themeUnsub) { themeUnsub(); themeUnsub = null; }
  stopData(); S.me = null; S.d = {}; S.usersLoaded = false;
  discardThemeDraft();
  if (!user) { showDeviceLogin(); return; }
  themeUnsub = onSnapshot(THEME_DOC(), onThemeSnap, err => console.warn("theme", err));
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
if ("serviceWorker" in navigator && location.protocol === "https:") {
  navigator.serviceWorker.register("sw.js").catch(e => console.warn("SW", e));
}
