import test from 'node:test'
import assert from 'node:assert/strict'
import { dariTabel, tglID } from '../src/utils/notulen.js'

test('format tanggal Indonesia', () => { assert.equal(tglID('2026-10-24'), '24 oktober 2026') })
test('satu PO dengan AREA dan TARGET sama dicatat satu kali', () => {
  const r = dariTabel([{ so: '1', po: 'P1', area: 'FIN', target: '2026-10-24' }, { so: '1', po: 'P1', area: 'FIN', target: '2026-10-24' }])
  assert.equal(r.items.length, 1); assert.match(r.items[0].t, /^1, P1 ada di FIN target selesai 24 oktober 2026/)
})
test('SO dan PO sama tetapi AREA berbeda: satu item dengan beberapa catatan terpisah', () => {
  const r = dariTabel([{ so: '1', po: 'P1', area: 'FIN', target: '2026-10-24' }, { so: '1', po: 'P1', area: 'PACK', target: '2026-10-25' }])
  assert.equal(r.items.length, 1); assert.equal(r.items[0].segs.length, 2); assert.ok(r.items[0].segs[0].includes('FIN') && r.items[0].segs[1].includes('PACK'))
})
test('keterangan ditulis dalam tanda kurung; beberapa keterangan digabung dengan titik koma', () => {
  const r = dariTabel([{ so: '1', po: 'P1', area: 'FIN', target: '2026-10-24', ket: 'kaca menyusul' }, { so: '1', po: 'P1', area: 'FIN', target: '2026-10-24', ket: 'cat ulang' }])
  assert.equal(r.items[0].segs[0], 'P1 ada di FIN target selesai 24 oktober 2026, ( kaca menyusul; cat ulang )')
})
test('baris yang belum diisi tidak masuk; yang dipacking ditaruh paling bawah', () => {
  const r = dariTabel([{ so: '1', po: 'A', packed: '1', area: 'PACK' }, { so: '2', po: 'B', area: 'FIN' }, { so: '3', po: 'C' }])
  assert.equal(r.kosong, 1); assert.deepEqual(r.items.map((x) => !!x.selesai), [false, true])
})
