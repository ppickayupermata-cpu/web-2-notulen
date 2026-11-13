export const has = (v, q = '') => String(v ?? '').toLowerCase().includes(String(q).trim().toLowerCase())
// groups diperlukan hanya bila ikut mencari berdasarkan container
// q = pencarian satu kotak: beberapa kata, semuanya harus cocok di salah satu kolom (SO, PO, produk, AREA, keterangan, container, ...)
const KOLOM_TEKS = ['so', 'soItem', 'po', 'productCode', 'productName', 'material', 'type', 'size', 'area', 'target', 'ket', 'kirim', 'no', 'group']
export const cocokTeks = (hay, q = '') => { const t = String(q).toLowerCase().split(/\s+/).filter(Boolean); if (!t.length) return true; const h = String(hay).toLowerCase(); return t.every((w) => h.includes(w)) }
export const filterRows = (rows, { so = '', soItem = '', productCode = '', container = '', po = '', productName = '', q = '' }, groups = []) => {
  const cmap = new Map(groups.map((g) => [g.id, g.container]))
  return rows.filter((r) =>
    (!String(q).trim() || cocokTeks(KOLOM_TEKS.map((k) => r[k]).join(' ') + ' ' + (cmap.get(r.groupId) || ''), q)) &&
    has(r.so, so) && has(r.soItem, soItem) && has(r.productCode, productCode) && has(r.po, po) && has(r.productName, productName) && has(cmap.get(r.groupId), container))
}
export const filterGroups = (groups, { container = '', buyer = '', q = '' }) =>
  groups.filter((g) => has(g.container, container) && has(g.buyer, buyer) && cocokTeks([g.container, g.buyer, g.packingListNo, g.shipDate, g.status].join(' '), q))
