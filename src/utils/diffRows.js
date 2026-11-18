// Bandingkan baris hasil upload dengan baris yang sudah tersimpan di satu container.
// Kunci baris: SO + SO Item (unik di packing list). Bila SO Item kosong: SO + PO + Product Code + Product Name + Size.
import { INFO_COLS } from '../config.js'
const n = (v) => String(v ?? '').trim().replace(/\s+/g, ' ').toLowerCase()
export const rowKey = (r) => (n(r.soItem) ? `${n(r.so)}|${n(r.soItem)}` : [r.so, r.po, r.productCode, r.productName, r.size].map(n).join('|'))
const CMP = INFO_COLS.map((c) => c.key).filter((k) => k !== 'group')

// hasil: [{ kind: 'baru' | 'sama' | 'berubah', exId, beda: [kolom...] }] sejajar dengan `up`
export function bandingkan(up, existing) {
  const pool = new Map()
  existing.forEach((r) => { const k = rowKey(r); pool.set(k, [...(pool.get(k) || []), r]) })
  const out = up.map((r) => {
    const ex = pool.get(rowKey(r))?.shift()            // satu baris lama hanya dipasangkan sekali (baris kembar tetap terhitung)
    if (!ex) return { kind: 'baru' }
    const beda = CMP.filter((k) => n(r[k]) !== n(ex[k]))
    return { kind: beda.length ? 'berubah' : 'sama', exId: ex.id, beda }
  })
  out.hilang = [...pool.values()].flat()                // baris lama yang tidak ada di file baru
  return out
}

// container tujuan: nomor container sama -> Packing List No sama -> container yang paling banyak memuat SO yang sama
export function cariGrup(header, rows, groups, allRows) {
  const byC = groups.find((g) => g.container === header.container); if (byC) return byC
  const byP = header.packingListNo && groups.find((g) => g.packingListNo === header.packingListNo); if (byP) return byP
  const so = new Set(rows.map((r) => n(r.so))), hit = new Map()
  allRows.forEach((r) => { if (so.has(n(r.so))) hit.set(r.groupId, (hit.get(r.groupId) || 0) + 1) })
  const best = [...hit].sort((a, b) => b[1] - a[1])[0]
  return best && best[1] >= Math.max(1, Math.ceil(rows.length / 2)) ? groups.find((g) => g.id === best[0]) : null
}
