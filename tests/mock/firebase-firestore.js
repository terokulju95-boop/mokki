const KEY = "__mockdb";
const load = () => JSON.parse(localStorage.getItem(KEY) || "{}");
let store = load();
const persist = () => localStorage.setItem(KEY, JSON.stringify(store));
const subs = [];
let n = 0;
const DEL = { __del: true };
export const deleteField = () => DEL;
export const initializeFirestore = () => ({});
export const getFirestore = () => ({});
export const persistentLocalCache = () => ({});
export const persistentMultipleTabManager = () => ({});
export const collection = (db, name) => ({ kind: "col", col: name });
export const doc = (a, col, id) => a.kind === "col" ? { kind: "doc", col: a.col, id: "auto" + Date.now() + (n++) } : { kind: "doc", col, id };
// Offline-simulaatio: window.__mockOffline = true → muutokset jäävät "odottamaan"
const pending = new Set();
const mark = (col, id) => { if (window.__mockOffline) pending.add(col + "/" + id); };
window.__mockOnline = () => { window.__mockOffline = false; pending.clear(); notify(); };
function notify() { persist(); subs.forEach(s => fire(s)); }
function fire(s) {
  const c = store[s.ref.col] || {};
  if (s.ref.kind === "col") s.cb({ docs: Object.entries(c).map(([id, d]) => ({ id, data: () => structuredClone(d), metadata: { hasPendingWrites: pending.has(s.ref.col + "/" + id) } })), metadata: { fromCache: false } });
  else { const d = c[s.ref.id]; s.cb({ exists: () => !!d, data: () => structuredClone(d), metadata: { fromCache: false } }); }
}
function setPath(o, path, v) { const ks = path.split("."); const l = ks.pop(); let a = o; for (const k of ks) a = (a[k] ??= {}); if (v === DEL) delete a[l]; else a[l] = v; }
export async function setDoc(ref, data, opt) { mark(ref.col, ref.id); (store[ref.col] ??= {}); store[ref.col][ref.id] = opt?.merge ? { ...(store[ref.col][ref.id] || {}), ...data } : data; notify(); }
export async function updateDoc(ref, data) { mark(ref.col, ref.id); const d = store[ref.col]?.[ref.id] || {}; for (const [k, v] of Object.entries(data)) setPath(d, k, v); (store[ref.col] ??= {})[ref.id] = d; notify(); }
export async function deleteDoc(ref) { delete store[ref.col]?.[ref.id]; notify(); }
export async function getDoc(ref) { const d = store[ref.col]?.[ref.id]; return { exists: () => !!d, data: () => d }; }
export function onSnapshot(ref, a, b) { const cb = typeof a === "function" ? a : b; const s = { ref, cb }; subs.push(s); setTimeout(() => fire(s), 5); return () => subs.splice(subs.indexOf(s), 1); }
export function writeBatch() { const ops = []; return { set: (r, d) => ops.push(() => setDoc(r, d)), update: (r, d) => ops.push(() => updateDoc(r, d)), delete: r => ops.push(() => deleteDoc(r)), commit: async () => ops.forEach(f => f()) }; }
