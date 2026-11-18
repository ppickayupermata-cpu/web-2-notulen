// Ringkasan isi satu cadangan container (untuk kartu info)
const kosong = (v) => String(v ?? '').trim() === ''
const angka = (v) => { const n = Number(String(v ?? '').replace(/,/g, '')); return Number.isFinite(n) ? n : 0 }
export function ringkas(rows) {
  const so = new Map(), po = new Set(), area = new Map()
  const r = { total: rows.length, qty: 0, packed: 0, area: 0, target: 0, ket: 0, kirim: 0, old: 0, new: 0, so: [], po: 0, perArea: [], tglTarget: '' }
  for (const x of rows) {
    r.qty += angka(x.qty)
    if (x.packed) r.packed++
    ;['area', 'target', 'ket', 'kirim'].forEach((k) => { if (!kosong(x[k])) r[k]++ })
    if (x.label === 'old') r.old++; else if (x.label === 'new') r.new++
    const s = String(x.so ?? '').trim() || '(tanpa SO)'; so.set(s, (so.get(s) || 0) + 1)
    if (!kosong(x.po)) po.add(String(x.po).trim())
    if (!kosong(x.area)) { const a = String(x.area).trim().toUpperCase(); area.set(a, (area.get(a) || 0) + 1) }
  }
  r.so = [...so].map(([nama, n]) => ({ nama, n })); r.po = po.size
  r.perArea = [...area].map(([nama, n]) => ({ nama, n })).sort((a, b) => b.n - a.n)
  return r
}
