import { $, LOG_TYPES, RECUR, RECUR_MONTHS, S, chip, empty, esc, eur, fmtDate, list, num, secH, today } from "../core.js";
import { F, backLink } from "../theme.js";

// ---------- Kulut ----------
export function vKulut() {
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
export function payRow(p) {
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
