export const has = (v, q = '') => String(v ?? '').toLowerCase().includes(String(q).trim().toLowerCase())
// groups diperlukan hanya bila ikut mencari berdasarkan container
export const filterRows = (rows, { so = '', soItem = '', productCode = '', container = '', po = '', productName = '' }, groups = []) => {
  const cmap = new Map(groups.map((g) => [g.id, g.container]))
  return rows.filter((r) =>
    has(r.so, so) && has(r.soItem, soItem) && has(r.productCode, productCode) && has(r.po, po) && has(r.productName, productName) && has(cmap.get(r.groupId), container))
}
export const filterGroups = (groups, { container = '', buyer = '' }) =>
  groups.filter((g) => has(g.container, container) && has(g.buyer, buyer))
