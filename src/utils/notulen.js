// Tabel packing list -> catatan notulen.
// Format satu catatan: (PO) ada di (AREA) target selesai (TARGET SELESAI), ( KETERANGAN )   <- keterangan dalam tanda kurung
// - Dalam satu PO, kesamaan AREA + TARGET SELESAI dicatat SATU kali saja (mewakili); KETERANGAN yang berbeda digabung dengan ";".
// - Satu SO = satu daftar: baris pertama diawali "(SO), " sebagai bullet tingkat 1; catatan berikutnya di SO yang sama (AREA lain
//   atau PO lain) menjadi bullet tingkat 2 tanpa mengulang SO (lihat susun() di isiNotulen.js).
// - Baris yang sudah ditag packing ditaruh PALING BAWAH (format sama, diberi warna selesai).
const BLN = ['januari', 'februari', 'maret', 'april', 'mei', 'juni', 'juli', 'agustus', 'september', 'oktober', 'november', 'desember']
export const tglID = (s) => { const m = String(s || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? `${m[3]} ${BLN[+m[2] - 1]} ${m[1]}` : String(s || '').trim().toLowerCase() }
export const WARNA_SELESAI = '00B050'
const f = (r) => ({ area: String(r.area || '').trim().replace(/\s+/g, ' ').toUpperCase(), tg: tglID(r.target), ket: String(r.ket || '').trim().replace(/\s+/g, ' '), so: String(r.so || '').trim(), po: String(r.po || r.productCode || '').trim().toUpperCase() || '(TANPA PO)' })
function baris(rows) {
  const peta = new Map()
  for (const r of rows) {
    const { area, tg, ket, so, po } = f(r), e = peta.get(so + '|' + po) || peta.set(so + '|' + po, { so, po, seg: new Map() }).get(so + '|' + po)
    const s = e.seg.get(area + '|' + tg) || e.seg.set(area + '|' + tg, { area, tg, kets: [] }).get(area + '|' + tg)
    if (ket && !s.kets.includes(ket)) s.kets.push(ket)
  }
  const adaIsi = (s) => s.area || s.tg || s.kets.length
  return [...peta.values()].map((e) => {
    const l = [...e.seg.values()], segs = (l.some(adaIsi) ? l.filter(adaIsi) : l.slice(0, 1))
      .map((s) => e.po + (s.area ? ` ada di ${s.area}` : '') + (s.tg ? ` target selesai ${s.tg}` : '') + (s.kets.length ? `, ( ${s.kets.join('; ')} )` : ''))
    return { so: e.so, po: e.po, segs, t: (e.so ? e.so + ', ' : '') + segs.join(', '), order: '' }
  })
}
// Rincian per AREA (untuk ringkasan di bawah notulen): satu entri per kombinasi AREA + SO + PO + TARGET, KETERANGAN yang berbeda digabung.
// AREA dinormalkan (PC / pc / Pc = sama). Hanya baris yang belum dipacking.
export function rincianArea(rows) {
  const m = new Map()
  for (const r of rows) {
    const { area, tg, ket, so, po } = f(r), k = [area, so, po, tg].join('|')
    const e = m.get(k) || m.set(k, { area, so, po, tg, kets: [] }).get(k)
    if (ket && !e.kets.includes(ket)) e.kets.push(ket)
  }
  return [...m.values()]
}
export function dariTabel(rows) {
  const belum = [], sudah = []; let kosong = 0
  for (const r of rows) {
    if (r.packed) sudah.push(r)
    else if (String(r.area || '').trim() || String(r.target || '').trim() || String(r.ket || '').trim()) belum.push(r)   // baris yang belum diisi di meeting tidak masuk notulen
    else kosong++
  }
  const a = baris(belum), b = baris(sudah).map((x) => ({ ...x, selesai: true, color: WARNA_SELESAI }))
  return { items: [...a, ...b], rincian: rincianArea(belum), utama: a.length, selesai: b.length, kosong, baris: belum.length + sudah.length, po: new Set([...belum, ...sudah].map((r) => f(r).so + '|' + f(r).po)).size }
}
