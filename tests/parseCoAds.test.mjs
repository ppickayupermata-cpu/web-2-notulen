import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { bacaSheetCoAds, namaDasar } from '../src/utils/parseCoAds.js'

const fx = JSON.parse(readFileSync(new URL('./fixtures/draft_pl_af_28.json', import.meta.url)))
test('nama container dasar dari nama file', () => assert.equal(namaDasar('DRAFT_PL_AF_28.xlsx'), 'DRAFT PL AF 28'))
test('R0: hanya tabel, kop / Total / daftar PO dibuang, total cocok', () => {
  const r = bacaSheetCoAds(fx.R0, 'R0')
  assert.equal(r.buyer, 'THE DOOR STORE OF AMERICA INC')
  assert.equal(r.rows.length, 90)
  assert.equal(r.totalFile, 164); assert.equal(r.totalHitung, 164)
  assert.ok(!r.rows.some((x) => /^247(61|63|85)$/.test(x.productName)))        // daftar PO di bawah Total tidak ikut
  assert.deepEqual(r.rows[0], { no: '1', po: '24764', so: '1030008086', productName: 'Alexandria 8LT SDL Pair Clear IG Low E No Muntin', type: 'Door', size: '1-3/4 x (2x24) x 80', material: 'Meranti A', qty: '2', uom: 'PC', _baris: 14 })
  assert.equal(r.rows[1].so, '1030008086'); assert.equal(r.rows[1].no, '1'); assert.equal(r.rows[1].po, '24764') // baris lanjutan diisi dari atas
})
test('R1: sel gabungan diisi ke baris lanjutan, total cocok', () => {
  const r = bacaSheetCoAds(fx.R1, 'R1')
  assert.equal(r.totalFile, 117); assert.equal(r.totalHitung, 117)
  const s = r.rows.filter((x) => x.po === 'SAMPLE CORNER CUT'); assert.equal(s.length, 3); assert.ok(s.every((x) => x.so === '1080000918'))
})
test('R2: UoM yang salah ketik diberi peringatan', () => {
  const r = bacaSheetCoAds(fx.R2, 'R2')
  assert.equal(r.totalFile, 115)
  assert.ok(r.warnings.some((w) => /UoM "PAA"/.test(w)))
})
test('Sheet1 tanpa header: dibaca kolom A-I, catatan tersimpan', () => {
  const r = bacaSheetCoAds(fx.Sheet1, 'Sheet1')
  assert.equal(r.tanpaHeader, true); assert.equal(r.rows.length, 10); assert.equal(r.rows[0].so, '1030008116')
  assert.ok(r.catatan.some((c) => /hand carry/.test(c)))
})

import { bandingkan } from '../src/utils/diffRows.js'
test('upload ulang file CO ADS yang sama: tidak ada baris "baru", tidak ada yang hilang', () => {
  const a = bacaSheetCoAds(fx.R0, 'R0').rows.map(({ _baris, ...r }) => r)
  const lama = a.map((r, i) => ({ ...r, id: 'x' + i }))
  const d = bandingkan(a, lama)
  assert.ok(d.every((x) => x.kind === 'sama')); assert.equal(d.hilang.length, 0)
})
test('Sheet1 ditambah baris baru: hanya baris baru yang terdeteksi', () => {
  const a = bacaSheetCoAds(fx.Sheet1, 'Sheet1').rows.map(({ _baris, ...r }) => r)
  const lama = a.slice(0, 7).map((r, i) => ({ ...r, id: 'x' + i }))
  const d = bandingkan(a, lama)
  assert.equal(d.filter((x) => x.kind === 'baru').length, 3)
})
