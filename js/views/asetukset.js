import { SETTINGS_PAGES, orderFields } from "../theme.js";
const SETTINGS_INFO = { v: null };
import { DARK_STYLES } from "../theme.js";
import { LOG_FIELDS } from "./huolto.js";
import { INV_FIELDS, PAY_FIELDS, REPAIR_FIELDS, CONTACT_FIELDS, BOOKING_FIELDS } from "../actions.js";
import { DEVICE_FIELDS } from "./laitteet.js";
import { photoMode } from "../core.js";
// Lomakkeet, joiden kenttiä admin voi piilottaa: [avain, nimi, kentät]
const FORM_DEFS = () => [
  ["nuohous", "Nuohous", LOG_FIELDS.nuohous], ["puut", "Puutilaus", LOG_FIELDS.puut], ["huolto", "Huoltotyö", LOG_FIELDS.huolto],
  ["tavara", "Tavara", INV_FIELDS], ["maksu", "Maksu", PAY_FIELDS], ["varaus", "Varaus", BOOKING_FIELDS],
  ["laite", "Laite", DEVICE_FIELDS], ["korjaus", "Korjaus", REPAIR_FIELDS], ["yhteystieto", "Yhteystieto", CONTACT_FIELDS]
];
import { versionsSection, iconSection, loadThemeVersions } from "./teemat.js";
import { MONTHS } from "../core.js";
import { $, ADMIN_NAME, CABIN_NAME, ICONS, NAV_MAX, S, SECTIONS, chip, colorFor, esc, fmtDT, fmtNum, initials, isAdmin, list, num, secH, seg } from "../core.js";
import { render, renderNav, switchUser } from "../main.js";
import { COLOR_FIELDS, DEFAULT_THEME, DENSITY, FEATURES, FONTS, HEAD_WEIGHTS, SHADOWS, T, THEME_PRESETS, backLink, contrast, previewTheme, themeDirty } from "../theme.js";

// ---------- Lisää ----------
export function vLisaa() {
  const noPin = isAdmin() ? S.users.filter(u => !S.pins[u]).length : 0;
  const th = T(), inNav = th.navItems;
  const info = {
    ...Object.fromEntries(SECTIONS.map(([k, , ic, t, d]) => [k, [ic, t, d]])),
    kayttajat: ["👥", isAdmin() ? "Käyttäjät ja PIN-koodit" : "Käyttäjät", noPin ? `${noPin} käyttäjältä puuttuu PIN` : S.users.join(", ")],
    profiili: ["👤", "Oma profiili", (isAdmin() ? "👑 " : "") + S.me.name],
    ulkoasu: ["🎨", "Ulkoasu ja ominaisuudet", "Värit, tekstit, valikot ja valinnaiset toiminnot"],
    yllapito: ["🗄️", "Ylläpito", S.meta?.lastBackupAt ? "Varmuuskopio, tietokannan koko, arkisto" : "Varmuuskopiota ei ole vielä otettu"]
  };
  // Profiili, käyttäjät, ulkoasu ja ylläpito ovat Asetukset-keskuksessa (idea 17)
  const warn = (noPin || (isAdmin() && !S.meta?.lastBackupAt));
  SETTINGS_INFO.v = info; info.asetukset = ["⚙️", "Asetukset", warn ? (noPin ? `${noPin} käyttäjältä puuttuu PIN` : "Varmuuskopiota ei ole vielä otettu") : isAdmin() ? "Profiili, käyttäjät, ulkoasu ja ylläpito" : "Oma profiili ja käyttäjät"];
  const adminOnly = [];
  const keys = th.menu.order.filter(k => info[k] && !inNav.includes(k) && (isAdmin() || !adminOnly.includes(k)));
  // Peräkkäiset saman ryhmän kohdat samaan laatikkoon
  const groups = [];
  keys.forEach(k => { const g = th.menu.groups[k] || ""; if (!groups.length || groups.at(-1).g !== g) groups.push({ g, keys: [] }); groups.at(-1).keys.push(k); });
  const item = k => { const [ic, t, d] = info[k]; return `<a class="menu-item" href="#${k}"><span class="menu-ic">${ic}</span><span class="menu-t"><b>${esc(t)}</b><small class="${(k === "asetukset" && warn) ? "warn" : ""}">${esc(d)}</small></span><span class="chev">›</span></a>`; };
  return groups.map(({ g, keys }) => `${g ? `<div class="menu-group">${esc(g)}</div>` : ""}<div class="menu">${keys.map(item).join("")}</div>`).join("")
    + `<button class="btn ghost block" data-action="switchUser">Vaihda käyttäjää</button>`;
}

// ---------- Käyttäjät ja PIN-koodit ----------
export function vKayttajat() {
  const admin = isAdmin();
  let h = backLink();
  h += `<div class="card"><div class="card-label">Näin kirjautuminen toimii</div><p>Jokainen laite kirjautuu kerran yhteisellä tunnuksella. Sen jälkeen jokainen valitsee oman nimensä ja syöttää oman 4-numeroisen PIN-koodinsa.</p>${admin ? "" : '<p class="form-note">PIN-koodit asettaa pääkäyttäjä. Oman PIN-koodin voit vaihtaa kohdassa Oma profiili.</p>'}</div>`;
  h += `<div class="list">${S.users.map((u, i) => {
    const self = u === S.me.name;
    const badges = [u === ADMIN_NAME ? chip("👑 Pääkäyttäjä", "strong") : "", S.pins[u] ? chip("✓ PIN asetettu") : chip("PIN puuttuu", "warn")].join("");
    const btns = admin ? `${!self ? `<button class="btn small ghost" data-action="previewAs" data-name="${esc(u)}" title="Katso sovellusta tämän käyttäjän silmin">👁 Katso</button>` : ""}<button class="btn small" data-action="setPin" data-name="${esc(u)}">${S.pins[u] ? "Vaihda PIN" : "Aseta PIN"}</button>${u !== ADMIN_NAME ? `<button class="btn small ghost" data-action="renameUser" data-name="${esc(u)}">Nimeä</button><button class="btn small ghost" data-action="removeUser" data-name="${esc(u)}">Poista</button>` : ""}<span class="order-btns"><button class="icon-btn" data-action="moveUser" data-name="${esc(u)}" data-dir="-1" ${i === 0 ? "disabled" : ""} aria-label="Ylös">↑</button><button class="icon-btn" data-action="moveUser" data-name="${esc(u)}" data-dir="1" ${i === S.users.length - 1 ? "disabled" : ""} aria-label="Alas">↓</button></span>` : "";
    return `<div class="item"><div class="item-row"><span class="avatar" style="background:${colorFor(u)}">${esc(initials(u))}</span><div class="item-main"><div class="item-title">${esc(u)}${self ? " (sinä)" : ""}</div><div class="chips">${badges}</div>${btns ? `<div class="row-btns">${btns}</div>` : ""}</div></div></div>`;
  }).join("")}</div>`;
  if (admin) h += `<button class="btn primary block" data-action="addUser">+ Lisää käyttäjä</button>`;
  return h;
}

// ---------- Profiili ----------
export function vProfiili() {
  const pm = photoMode();
  const photoCard = `<div class="card"><div class="card-label">Kuvat tällä laitteella</div>
    <div class="seg">${[["lazy", "Kun niitä katsotaan"], ["all", "Kaikki etukäteen"]].map(([k, l]) => `<button data-action="setPhotoMode" data-v="${k}" class="${k === pm ? "on" : ""}">${l}</button>`).join("")}</div>
    <p class="form-note">${pm === "all" ? "Kaikki kuvat ladataan laitteelle, joten ne näkyvät mökillä ilman verkkoa. Käyttää enemmän dataa ja hidastaa käynnistystä." : "Kuva ladataan vasta, kun se tulee näkyviin. Nopeampi ja säästää dataa. Ilman verkkoa näkyvät vain kerran katsotut kuvat – valitse \"Kaikki etukäteen\" ennen mökille lähtöä, jos verkko siellä on huono."}</p></div>`;
  return backLink() + photoCard + `<div class="card"><div class="card-label">Oma profiili</div>
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
export const tPath = (o, p) => p.split(".").reduce((a, k) => a?.[k], o);
export function tSet(o, path, v) {
  const ks = path.split("."); const last = ks.pop(); let a = o; const chain = [];
  for (const k of ks) { chain.push([a, k]); a = (a[k] ??= {}); }
  if ((path.startsWith("home.") || path.startsWith("fields.")) && (v === "" || v === false)) {
    delete a[last];
    // Poistetaan tyhjäksi jäänyt lomakekohtainen olio, jotta "ei muutoksia" tunnistuu oikein
    if (path.startsWith("fields.") && chain.length >= 2 && !Object.keys(a).length) delete chain[chain.length - 1][0][chain[chain.length - 1][1]];
  } else a[last] = v;
}
export const tId = p => "tk-" + p.replace(/\./g, "-");
export const tColor = (p, label) => { const v = tPath(S.themeDraft, p); return `<label class="t-row"><span>${esc(label)}</span><span class="t-color"><code data-tv="${p}">${esc(v)}</code><input type="color" id="${tId(p)}" data-tk="${p}" value="${esc(v)}"></span></label>`; };
export const tRange = (p, label, min, max, step, unit = "") => { const v = tPath(S.themeDraft, p); return `<label class="t-row t-range"><span>${esc(label)} <b data-tv="${p}" data-unit="${unit}">${fmtNum(v)}${unit}</b></span><input type="range" id="${tId(p)}" data-tk="${p}" min="${min}" max="${max}" step="${step}" value="${v}"></label>`; };
export const tSelect = (p, label, opts, isNum = false) => { const v = tPath(S.themeDraft, p); return `<label class="fld"><span>${esc(label)}</span><select id="${tId(p)}" data-tk="${p}" ${isNum ? 'data-num="1"' : ""}>${opts.map(([k, l]) => `<option value="${esc(k)}" ${String(k) === String(v) ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></label>`; };
export const tCheck = (p, label, inv = false) => { const v = tPath(S.themeDraft, p); return `<label class="fld-check"><input type="checkbox" id="${tId(p)}" data-tk="${p}" ${inv ? 'data-inv="1"' : ""} ${(inv ? !v : v) ? "checked" : ""}><span>${esc(label)}</span></label>`; };
export const tText = (p, label, ph = "", rows = 0) => { const v = tPath(S.themeDraft, p) ?? ""; return `<label class="fld"><span>${esc(label)}</span>${rows ? `<textarea id="${tId(p)}" data-tk="${p}" rows="${rows}" placeholder="${esc(ph)}">${esc(v)}</textarea>` : `<input id="${tId(p)}" data-tk="${p}" value="${esc(v)}" placeholder="${esc(ph)}" autocomplete="off">`}</label>`; };

export function contrastHtml(p) {
  const pairs = [["ink", "bg", "Teksti / tausta", 4.5], ["ink", "card", "Teksti / kortti", 4.5], ["head", "card", "Otsikot / kortti", 3],
    ["muted", "card", "Himmeä teksti / kortti", 3], ["label", "card", "Pienet otsikot / kortti", 3], ["primary", "card", "Pääväri / kortti", 3]];
  const bad = pairs.map(([a, b, l, min]) => [l, contrast(p[a], p[b]), min]).filter(([, c, min]) => c < min);
  return bad.length ? `<div class="t-warn">⚠️ Huono luettavuus: ${bad.map(([l, c]) => `${esc(l)} (${c.toFixed(1).replace(".", ",")}:1)`).join(", ")}. Valitse kontrastisempi väri.</div>` : `<div class="form-note ok">✓ Värit ovat hyvin luettavissa.</div>`;
}
export function saveBarState() {
  const d = themeDirty();
  return [d, d ? "Tallentamattomia muutoksia – vain sinä näet ne" : "Ei tallentamattomia muutoksia"];
}
export function updateSaveBar() {
  const bar = $("#t-savebar"); if (!bar) return;
  const [d, txt] = saveBarState();
  bar.classList.toggle("dirty", d); bar.querySelector(".savebar-t").textContent = txt;
  bar.querySelectorAll('[data-action="themeSave"],[data-action="themeUndo"]').forEach(b => b.disabled = !d);
  const c = bar.querySelector('[data-action="homeCancel"]'); if (c) c.textContent = d ? "Peru" : "Sulje";
}

export function vUlkoasu() {
  if (!isAdmin() || !S.themeDraft) return backLink() + `<div class="card muted">Ulkoasua voi muokata vain pääkäyttäjä.</div>`;
  const D = S.themeDraft, pal = S.themePal;
  let h = backLink();
  h += `<p class="form-note">Muutokset näkyvät heti esikatseluna vain sinulle. Kun painat <b>Tallenna kaikille</b>, ulkoasu päivittyy kaikkien laitteisiin.${S.themeMeta?.at ? ` Viimeksi tallentanut ${esc(S.themeMeta.by || "")} ${fmtDT(S.themeMeta.at)}.` : ""}</p>`;

  if (!S.themeVersions && !S.tvLoading) { S.tvLoading = true; loadThemeVersions(); }
  // Valmiit teemat
  h += secH("Valmiit teemat") + `<div class="presets">${Object.entries(THEME_PRESETS).map(([k, p]) => `<button class="preset" data-action="themePreset" data-preset="${k}"><span class="sw">${["bg", "card", "primary", "accent"].map(c => `<i style="background:${p[pal][c]}"></i>`).join("")}</span>${esc(p.name)}</button>`).join("")}</div>`;

  h += versionsSection();

  // Värit
  h += secH("Värit") + `<div class="card t-card">
    ${tSelect("mode", "Väritila", [["auto", "Automaattinen (laitteen mukaan)"], ["light", "Aina vaalea"], ["dark", "Aina tumma"]])}
    <div class="seg">${[["light", "☀️ Vaalea paletti"], ["dark", "🌙 Tumma paletti"]].map(([k, l]) => `<button data-action="themePal" data-pal="${k}" class="${k === pal ? "on" : ""}">${l}</button>`).join("")}</div>
    <div class="dark-styles"><span class="form-note">Tumman tilan tausta:</span>${Object.entries(DARK_STYLES).map(([k, st]) => `<button class="preset dark-preset" data-action="themeDarkStyle" data-v="${k}"><span class="sw"><i style="background:${st.bg}"></i><i style="background:${st.card}"></i><i style="background:${st.line}"></i></span>${esc(st.name)}</button>`).join("")}</div>
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

  h += iconSection();

  // Lomakkeiden kentät (idea 169)
  const forms = FORM_DEFS();
  const fk = forms.some(f => f[0] === S.fieldsForm) ? S.fieldsForm : forms[0][0];
  const [, fLabel, fFields] = forms.find(f => f[0] === fk);
  const hid = D.fields?.[fk] || {};
  h += secH("Lomakkeiden kentät") + `<p class="form-note">Valitse, mitkä kentät näkyvät lomakkeissa kaikille. Pakollisia kenttiä ei voi piilottaa. Piilotetun kentän aiemmin tallennetut tiedot säilyvät.</p>
    <div class="chips">${forms.map(([k, l]) => `<button class="chip-btn ${k === fk ? "on" : ""}" data-action="fieldsForm" data-f="${k}">${esc(l)}${Object.keys(D.fields?.[k] || {}).length ? ` (${Object.keys(D.fields[k]).length} piilossa)` : ""}</button>`).join("")}</div>
    <div class="card t-card"><div class="card-label">${esc(fLabel)}</div>
    <p class="form-note">Ruksi = kenttä näkyy. Nuolilla vaihdat kenttien järjestystä lomakkeessa.</p>
    ${(() => { const list = orderFields(fk, fFields).filter(f => f.name && f.type !== "heading" && f.type !== "note"); return list.map((f, i) => `<div class="t-field">
      ${f.required ? `<label class="fld-check t-dim"><input type="checkbox" checked disabled><span>${esc(f.label)} <small>(pakollinen)</small></span></label>` : tCheck(`fields.${fk}.${f.name}`, f.label, true)}
      <span class="order-btns"><button class="icon-btn" data-action="fieldMove" data-f="${fk}" data-name="${f.name}" data-dir="-1" ${i === 0 ? "disabled" : ""} aria-label="Ylös">↑</button><button class="icon-btn" data-action="fieldMove" data-f="${fk}" data-name="${f.name}" data-dir="1" ${i === list.length - 1 ? "disabled" : ""} aria-label="Alas">↓</button></span></div>`).join(""); })()}
    ${D.fieldOrder?.[fk]?.length ? `<button class="btn ghost small" data-action="fieldOrderReset" data-f="${fk}">Palauta oletusjärjestys</button>` : ""}</div>`;

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

  // Lisää-valikko (idea 43)
  const mk = k => { const sct = SECTIONS.find(x => x[0] === k); return sct ? sct[3] : { kayttajat: "Käyttäjät", profiili: "Oma profiili", ulkoasu: "Ulkoasu ja ominaisuudet", yllapito: "Ylläpito" }[k]; };
  const mOrder = D.menu.order;
  const groupNames = [...new Set(Object.values(D.menu.groups).filter(Boolean))];
  h += secH("Lisää-valikko") + `<p class="form-note">Järjestä Lisää-valikon kohdat ja jaa ne ryhmiin kirjoittamalla ryhmän nimi. Peräkkäiset saman ryhmän kohdat näkyvät yhdessä laatikossa otsikon alla. Himmeät kohdat ovat nyt alavalikossa.</p>
    <datalist id="menu-groups">${groupNames.map(g => `<option value="${esc(g)}">`).join("")}</datalist>
    <div class="list">${mOrder.map((k, i) => `<div class="item ${D.navItems.includes(k) ? "t-dim" : ""}"><div class="item-row">
      <div class="item-main"><div class="item-title">${esc(mk(k))}</div><input class="t-title t-group" id="${tId("menu.groups." + k)}" data-tk="menu.groups.${k}" value="${esc(D.menu.groups[k] || "")}" placeholder="Ryhmä (tyhjä = ei otsikkoa)" list="menu-groups" autocomplete="off"></div>
      <span class="order-btns"><button class="icon-btn" data-action="menuMove" data-key="${k}" data-dir="-1" ${i === 0 ? "disabled" : ""} aria-label="Ylös">↑</button><button class="icon-btn" data-action="menuMove" data-key="${k}" data-dir="1" ${i === mOrder.length - 1 ? "disabled" : ""} aria-label="Alas">↓</button></span>
    </div></div>`).join("")}</div>`;

  // Ominaisuudet
  const MONTH_OPTS = MONTHS.map((m, i) => [i + 1, m[0].toUpperCase() + m.slice(1)]);
  h += secH("Kausilistat") + `<div class="card t-card"><p class="form-note">Etusivulla näkyy automaattisesti kauden lista. Valitse, mistä kuukaudesta kumpikin kausi alkaa – se jatkuu, kunnes toinen alkaa.</p>
    ${tSelect("seasons.kevat", "🌱 Kevään käyttöönotto alkaa", MONTH_OPTS, true)}
    ${tSelect("seasons.talvi", "❄️ Talviteloille alkaa", MONTH_OPTS, true)}</div>`;
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

export function onThemeInput(e) {
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

// ---------- Asetukset-keskus (idea 17) ----------
export function vAsetukset() {
  vLisaa(); // täyttää SETTINGS_INFO-tiedot (otsikot ja tilat)
  const info = SETTINGS_INFO.v;
  const pages = SETTINGS_PAGES.filter(k => isAdmin() || !["ulkoasu", "yllapito"].includes(k));
  const warnOf = k => (k === "kayttajat" && isAdmin() && S.users.some(u => !S.pins[u])) || (k === "yllapito" && !S.meta?.lastBackupAt);
  return `<a class="back" href="#lisaa">‹ Lisää</a><div class="menu">${pages.map(k => { const [ic, t, d] = info[k]; return `<a class="menu-item" href="#${k}"><span class="menu-ic">${ic}</span><span class="menu-t"><b>${esc(t)}</b><small class="${warnOf(k) ? "warn" : ""}">${esc(d)}</small></span><span class="chev">›</span></a>`; }).join("")}</div>`;
}
export const FORM_FIELD_NAMES = key => { const f = FORM_DEFS().find(x => x[0] === key); return f ? f[2].filter(x => x.name && x.type !== "heading" && x.type !== "note").map(x => x.name) : null; };
