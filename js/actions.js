import { orderFields } from "./theme.js";
import { FORM_FIELD_NAMES } from "./views/asetukset.js";
import { colorFor } from "./core.js";
import { DARK_STYLES } from "./theme.js";
import { setPhotoMode } from "./core.js";
import { startData } from "./main.js";
import { THEMEVER_ACTIONS, pushThemeHistory } from "./views/teemat.js";
import { DEVICE_ACTIONS, deviceName } from "./views/laitteet.js";
import { parseYmd, ymd } from "./core.js";
const mondayOfDate = ds => { const d = parseYmd(ds); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return ymd(d); };
import { MAINT_CATS } from "./core.js";
import { $, DEFAULT_ITEMS, INV_CATS, LOGIN_EMAIL, LOG_TYPES, NAV_MAX, PAY_CATS, RECUR, RECUR_MONTHS, REP_STATUS, S, USER_KEY, addMonths, auth, collection, db, deleteField, doc, esc, fail, fmtDT, fmtDate, fmtShort, getInfo, isAdmin, list, memberNames, meta, nowIso, openForm, openLightbox, openSheet, patch, remove, save, sendPasswordResetEmail, setDoc, signOut, toast, today, writeBatch } from "./core.js";
import { authError, render, renderNav, saveUsers, switchUser } from "./main.js";
import { DEFAULT_THEME, F, THEME_DOC, THEME_PRESETS, cacheTheme, discardThemeDraft, mergeTheme, previewTheme, themeDirty } from "./theme.js";
import { LOG_ADD, LOG_FIELDS } from "./views/huolto.js";
import { currentRun, seasonItems, seasonRuns, startRun } from "./views/kausi.js";
import { shopList } from "./views/tavarat.js";
import { INFO_FIELDS } from "./views/tiedot.js";

// =============================================================
//  TOIMINNOT
// =============================================================
export const findIn = (col, id) => list(col).find(x => x.id === id);

export const ACTIONS = {
  tab: d => { S.tab[d.view] = d.tab; S.editOrder = false; if (location.hash.slice(1) !== d.view) location.hash = d.view; else render(); },
  copy: async d => { try { await navigator.clipboard.writeText(d.text); toast("Kopioitu"); } catch { prompt("Kopioi:", d.text); } },
  switchUser: () => switchUser(),
  logoutDevice: () => { if (confirm("Kirjataanko tämä laite ulos? Seuraavalla kerralla tarvitaan yhteinen salasana.")) { try { localStorage.removeItem(USER_KEY); } catch { } signOut(auth); } },

  // Huolto
  addLog: d => openForm({ formKey: d.type, title: LOG_ADD[d.type], fields: LOG_FIELDS[d.type], onSubmit: v => { save("logs", { ...v, type: d.type }); toast("Tallennettu"); } }),
  editLog: d => {
    const l = findIn("logs", d.id); if (!l) return;
    openForm({ formKey: l.type, title: "Muokkaa: " + (l.type === "huolto" ? l.title : LOG_TYPES[l.type]), fields: LOG_FIELDS[l.type], values: l, onSubmit: v => save("logs", v, l.id), onDelete: () => remove("logs", l.id) });
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
        { name: "category", label: "Luokka", type: "select", options: [["", "Ei luokkaa"], ...MAINT_CATS] },
        ...(F("todoDue") ? [{ name: "due", label: "Määräaika", type: "date" }] : []),
        { name: "assignee", label: "Tekijä", type: "select", options: () => [["", "Ei määritelty"], ...memberNames()] }
      ],
      onSubmit: v => save("todos", v, t.id), onDelete: () => remove("todos", t.id)
    });
  },
  todoCat: d => { S.todoCat = d.cat; render(); },
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
  addInv: () => openForm({ formKey: "tavara", title: "Uusi tavara", fields: INV_FIELDS, onSubmit: v => { save("inventory", v); } }),
  editInv: d => { const i = findIn("inventory", d.id); if (!i) return; openForm({ formKey: "tavara", title: "Muokkaa tavaraa", fields: INV_FIELDS, values: i, onSubmit: v => { save("inventory", v, i.id); if (v.status !== "ok") ensureShopping(i.id, v.name); else closeLinked(i.id); }, onDelete: () => remove("inventory", i.id) }); },
  invStatus: d => {
    const i = findIn("inventory", d.id); if (!i) return;
    const order = ["ok", "vahissa", "loppu"];
    const next = order[(order.indexOf(i.status || "ok") + 1) % order.length];
    patch("inventory", i.id, { status: next, updatedByName: S.me.name, updatedAt: nowIso() });
    if (next !== "ok") ensureShopping(i.id, i.name); else closeLinked(i.id);
  },

  // Kulut
  kulutYear: d => { S.kulutYear = Number(d.year); render(); },
  addPay: () => openForm({ formKey: "maksu", title: "Uusi maksu", fields: payFields(), onSubmit: v => { save("payments", v); toast("Tallennettu"); } }),
  editPay: d => { const p = findIn("payments", d.id); if (!p) return; openForm({ formKey: "maksu", title: "Muokkaa maksua", fields: payFields(), values: p, onSubmit: v => save("payments", v, p.id), onDelete: () => remove("payments", p.id) }); },
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
  addContact: () => openForm({ formKey: "yhteystieto", title: "Uusi yhteystieto", fields: CONTACT_FIELDS, onSubmit: v => { save("contacts", v); } }),
  editContact: d => { const c = findIn("contacts", d.id); if (!c) return; openForm({ formKey: "yhteystieto", title: "Muokkaa yhteystietoa", fields: CONTACT_FIELDS, values: c, onSubmit: v => save("contacts", v, c.id), onDelete: () => remove("contacts", c.id) }); },

  // Varaukset
  calNav: d => {
    const dir = Number(d.dir), v = S.calView || "kk";
    if (v === "vk") { const t = S.calWeek || mondayOfDate(today()); const x = parseYmd(t); x.setDate(x.getDate() + 7 * dir); S.calWeek = ymd(x); }
    else if (v === "v") S.calYear = (S.calYear || Number(today().slice(0, 4))) + dir;
    else { const ym = S.calMonth || today().slice(0, 7); S.calMonth = addMonths(ym + "-01", dir).slice(0, 7); }
    render();
  },
  calView: d => { S.calView = d.v; render(); },
  calMonthOpen: d => { S.calMonth = d.ym; S.calView = "kk"; render(); },
  calDay: d => {
    const bs = list("bookings").filter(b => b.start <= d.date && (b.end || b.start) >= d.date);
    if (bs.length === 1 && confirm(`${bs[0].who} on varannut tämän päivän. Muokataanko varausta?\n\n(Peruuta = lisää uusi varaus)`)) return ACTIONS.editBooking({ id: bs[0].id });
    bookingForm({ start: d.date, end: d.date, who: S.me.name });
  },
  addBooking: () => bookingForm({ start: today(), end: today(), who: S.me.name }),
  editBooking: d => { const b = findIn("bookings", d.id); if (b) bookingForm(b, b.id); },

  // Korjaukset
  addRepair: () => openForm({ formKey: "korjaus", title: "Uusi korjauskohde", fields: REPAIR_FIELDS, onSubmit: v => { save("repairs", v); } }),
  editRepair: d => { const r = findIn("repairs", d.id); if (!r) return; openForm({ formKey: "korjaus", title: "Muokkaa korjausta", fields: REPAIR_FIELDS, values: r, onSubmit: v => save("repairs", v, r.id), onDelete: () => remove("repairs", r.id) }); },

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
  menuMove: d => {
    if (!S.themeDraft) return;
    const o = S.themeDraft.menu.order; const i = o.indexOf(d.key), j = i + Number(d.dir);
    if (i < 0 || j < 0 || j >= o.length) return;
    [o[i], o[j]] = [o[j], o[i]]; render();
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
    if (JSON.stringify(S.theme) !== JSON.stringify(data)) pushThemeHistory(S.theme, S.themeMeta);
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
export function ensureShopping(invId, name) {
  if (list("shopping").some(s => !s.done && s.invId === invId)) return;
  save("shopping", { text: name, invId, done: false, list: "osta" });
  toast(`"${name}" lisätty Hankittavat-listaan`);
}
// Tavara taas OK → siihen liittyvät avoimet rivit merkitään hoidetuiksi.
export function closeLinked(invId) {
  list("shopping").filter(s => !s.done && s.invId === invId).forEach(s => patch("shopping", s.id, { done: true, doneByName: S.me.name, doneAt: nowIso() }));
}

export const BOOKING_FIELDS = [
  { name: "who", label: "Kuka", type: "select", required: true, options: () => memberNames() },
  { name: "range", label: "Saapuminen ja lähtö", type: "daterange", required: true },
  { name: "status", label: "Tila", type: "select", options: [["varma", "Varma"], ["alustava", "Alustava – ei vielä lukossa"]], def: "varma" },
  { name: "people", label: "Henkilömäärä", type: "number", placeholder: "esim. 4" },
  { name: "guests", label: "Muut mukana / vieraat", placeholder: "esim. Liisa ja lapset, naapurin Matti" },
  { name: "note", label: "Lisätieto", placeholder: "esim. saunailta, talkoot" }
];
export function bookingForm(values, id) {
  openForm({
    formKey: "varaus", title: id ? "Muokkaa varausta" : "Uusi varaus", values,
    fields: [
      { ...BOOKING_FIELDS[0], options: () => { const n = memberNames(); return values.who && !n.includes(values.who) ? [values.who, ...n] : n; } },
      { ...BOOKING_FIELDS[1], booked: () => list("bookings").filter(b => b.id !== id).map(b => ({ start: b.start, end: b.end, who: b.who, color: colorFor(b.who) })) },
      ...BOOKING_FIELDS.slice(2)
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

export const ITEM_FIELDS = [
  { name: "title", label: "Tehtävä", required: true },
  { name: "instructions", label: "Ohje", type: "textarea", placeholder: "esim. mitkä sulakkeet jätetään päälle" },
  { name: "photos", label: "Kuvat (esim. sähkökaappi)", type: "photos" }
];
export const INV_FIELDS = [
  { name: "name", label: "Tavara", required: true, placeholder: "esim. Kaasupullo" },
  { name: "category", label: "Kategoria", type: "select", options: INV_CATS },
  { name: "qty", label: "Määrä", placeholder: "esim. 2 kpl, puoli pussia" },
  { name: "location", label: "Säilytyspaikka", placeholder: "esim. Saunan eteinen" },
  { name: "status", label: "Tilanne", type: "select", options: [["ok", "OK"], ["vahissa", "Vähissä"], ["loppu", "Loppu"]] },
  { name: "notes", label: "Lisätiedot", type: "textarea", rows: 2 }
];
export const PAY_FIELDS = [
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
export const payFields = () => PAY_FIELDS
  .filter(f => f.name !== "recurrence" || F("payRecurring"))
  .map(f => f.name === "date" && !F("payDue") ? { ...f, label: "Päivämäärä" } : f);
export const PLACE_FIELDS = [
  { name: "title", label: "Nimi", required: true, placeholder: "esim. Sähkökaappi" },
  { name: "description", label: "Kuvaus ja ohje", type: "textarea", rows: 4, placeholder: "Missä se on ja miten toimitaan" },
  { name: "photos", label: "Kuvat", type: "photos" }
];
export const CONTACT_FIELDS = [
  { name: "name", label: "Nimi", required: true },
  { name: "role", label: "Rooli", list: ["Nuohooja", "Puunmyyjä", "Naapuri", "Sähköasentaja", "Putkimies", "Tienhoitokunta", "Huoltoyhtiö", "Vakuutusyhtiö", "Sähköyhtiö", "Jätehuolto"] },
  { name: "phone", label: "Puhelin", type: "tel" },
  { name: "email", label: "Sähköposti", type: "email" },
  { name: "notes", label: "Lisätiedot", type: "textarea", rows: 2 }
];
export const REPAIR_FIELDS = [
  { name: "title", label: "Kohde", required: true, placeholder: "esim. Katon uusiminen" },
  { name: "description", label: "Kuvaus", type: "textarea" },
  { name: "targetYear", label: "Tavoitevuosi", type: "number", placeholder: String(new Date().getFullYear() + 1) },
  { name: "estimate", label: "Kustannusarvio (€)", type: "number" },
  { name: "status", label: "Tila", type: "select", options: REP_STATUS },
  { name: "actualCost", label: "Toteutunut hinta (€)", type: "number" },
  { name: "doneDate", label: "Valmistumispäivä", type: "date" },
  { name: "photos", label: "Kuvat", type: "photos" }
];

export const FORMS = {
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
  if (fn && S.readOnly && !READONLY_OK.has(el.dataset.action)) { e.preventDefault(); toast("Esikatselutila – muutokset eivät ole käytössä", true); return; }
  if (fn) { e.preventDefault(); fn(el.dataset, el); }
});
// Toiminnot, jotka ovat sallittuja esikatseltaessa toisena käyttäjänä (eivät muuta tietoja)
const READONLY_OK = new Set(["tab", "calNav", "calView", "calMonthOpen", "expand", "todoCat", "openDevice", "closeDevice", "kulutYear", "copy", "runHistory", "previewStop"]);
document.addEventListener("submit", e => {
  const f = e.target.closest("form[data-form]"); if (!f) return;
  e.preventDefault();
  if (S.readOnly) { toast("Esikatselutila – muutokset eivät ole käytössä", true); return; }
  FORMS[f.dataset.form]?.(f);
});
document.addEventListener("toggle", e => {
  if (e.target.tagName === "DETAILS" && e.target.id) e.target.open ? S.openDetails.add(e.target.id) : S.openDetails.delete(e.target.id);
}, true);
// Verkkotila ja lähetystä odottavat muutokset (idea 191)
let lastPending = 0;
export function updateNet() {
  const n = $("#netstatus"); if (!n) return;
  const pending = Object.values(S.pending || {}).reduce((a, b) => a + b, 0);
  const off = !navigator.onLine;
  const many = pending === 1 ? "1 muutos" : `${pending} muutosta`;
  n.hidden = !off && !pending;
  n.classList.toggle("sending", !off && pending > 0);
  n.textContent = off
    ? (pending ? `Ei yhteyttä – ${many} odottaa ja lähtee, kun yhteys palaa` : "Ei yhteyttä – voit jatkaa, muutokset tallentuvat laitteelle")
    : `Lähetetään ${many}…`;
  if (lastPending > 0 && pending === 0 && !off) toast("✓ Kaikki muutokset tallennettu");
  lastPending = pending;
}
window.addEventListener("online", updateNet);
window.addEventListener("offline", updateNet);

// Laitteiden, puuvaraston ja tarkastusten toiminnot (views/laitteet.js)
Object.assign(ACTIONS, DEVICE_ACTIONS, THEMEVER_ACTIONS, {
  addDeviceLog: d => openForm({ formKey: "huolto", title: "Huolto: " + deviceName(d.id), fields: LOG_FIELDS.huolto, values: { deviceId: d.id }, onSubmit: v => { save("logs", { ...v, type: "huolto" }); toast("Tallennettu"); } })
});

// ---------- Tumma tyyli (58), kuvien lataustapa (182), esikatselu toisena käyttäjänä (166) ----------
Object.assign(ACTIONS, {
  fieldsForm: d => { S.fieldsForm = d.f; render(); },
  fieldMove: d => {
    if (!S.themeDraft) return;
    const def = FORM_FIELD_NAMES(d.f); if (!def) return;
    const cur = orderFields(d.f, def.map(n => ({ name: n }))).map(f => f.name);
    const i = cur.indexOf(d.name), j = i + Number(d.dir);
    if (i < 0 || j < 0 || j >= cur.length) return;
    [cur[i], cur[j]] = [cur[j], cur[i]];
    (S.themeDraft.fieldOrder ??= {})[d.f] = cur; render();
  },
  fieldOrderReset: d => { if (S.themeDraft?.fieldOrder) { delete S.themeDraft.fieldOrder[d.f]; render(); } },
  themeDarkStyle: d => {
    const st = DARK_STYLES[d.v]; if (!st || !S.themeDraft) return;
    Object.assign(S.themeDraft.dark, { bg: st.bg, card: st.card, line: st.line });
    S.themePal = "dark"; previewTheme(); render();
    toast(`${st.name} valittu – muista tallentaa`);
  },
  setPhotoMode: d => {
    setPhotoMode(d.v === "all" ? "all" : "lazy");
    startData(); render();
    toast(d.v === "all" ? "Kaikki kuvat ladataan tälle laitteelle" : "Kuvat ladataan vasta, kun niitä katsotaan");
  },
  previewAs: d => {
    if (!isAdmin() || d.name === S.me.name) return;
    discardThemeDraft();
    S.realMe = S.me; S.me = { name: d.name }; S.readOnly = true;
    showPreviewBanner(); location.hash = "koti"; render();
  },
  previewStop: () => {
    if (!S.realMe) return;
    S.me = S.realMe; S.realMe = null; S.readOnly = false;
    document.getElementById("preview-banner")?.remove();
    location.hash = "kayttajat"; render();
  }
});
function showPreviewBanner() {
  document.getElementById("preview-banner")?.remove();
  const b = document.createElement("div");
  b.id = "preview-banner"; b.className = "preview-banner";
  b.innerHTML = `<span>👁 Esikatselet: <b>${esc(S.me.name)}</b> · vain katselu</span><button class="btn small" type="button" data-action="previewStop">Lopeta</button>`;
  document.body.appendChild(b);
}
