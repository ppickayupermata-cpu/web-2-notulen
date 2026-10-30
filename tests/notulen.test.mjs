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

test('isi kolom GROUP ditulis setelah PO dalam [ ]; tanpa GROUP tidak ada tanda kurung siku', () => {
  const a = dariTabel([{ so: '1030008156', po: '24911AF', group: 'AF 27', area: 'list', target: '2026-10-29' }])
  assert.equal(a.items[0].t, '1030008156, 24911AF [ AF 27 ] ada di LIST target selesai 29 oktober 2026')
  const b = dariTabel([{ so: '1030008156', po: '24911AF', area: 'list', target: '2026-10-29' }])
  assert.equal(b.items[0].t, '1030008156, 24911AF ada di LIST target selesai 29 oktober 2026')
})
test('GROUP berbeda dalam satu PO dicatat terpisah; GROUP sama (huruf besar/kecil) digabung', () => {
  const r = dariTabel([{ so: '1', po: 'P1', group: 'af 27', area: 'FIN', target: '2026-10-24' }, { so: '1', po: 'P1', group: 'AF 27', area: 'FIN', target: '2026-10-24' }, { so: '1', po: 'P1', group: 'B 9', area: 'FIN', target: '2026-10-24' }])
  assert.deepEqual(r.items[0].segs, ['P1 [ af 27 ] ada di FIN target selesai 24 oktober 2026', 'P1 [ B 9 ] ada di FIN target selesai 24 oktober 2026'])
})
