import test from 'node:test'
import assert from 'node:assert/strict'
import { bandingkan, cariGrup, rowKey } from '../src/utils/diffRows.js'

const lama = [{ id: 'a', so: '1', soItem: '10', qty: '2', productName: 'X' }, { id: 'b', so: '1', soItem: '20', qty: '1', productName: 'Y' }]
test('baru / berubah / sama / hilang', () => {
  const d = bandingkan([{ so: '1', soItem: '10', qty: '2', productName: 'X' }, { so: '1', soItem: '20', qty: '5', productName: 'Y' }, { so: '1', soItem: '30', qty: '1', productName: 'Z' }], lama)
  assert.deepEqual(d.map((x) => x.kind), ['sama', 'berubah', 'baru']); assert.deepEqual(d[1].beda, ['qty'])
  assert.equal(bandingkan([{ so: '1', soItem: '10', qty: '2', productName: 'X' }], lama).hilang.map((r) => r.id).join(), 'b')
})
test('kunci baris tidak peka spasi/huruf besar', () => { assert.equal(rowKey({ so: ' 1 ', soItem: '10' }), rowKey({ so: '1', soItem: '10 ' })) })
test('baris kembar tetap dipasangkan satu-satu', () => {
  const d = bandingkan([{ so: '1', soItem: '10' }, { so: '1', soItem: '10' }], [{ id: 'a', so: '1', soItem: '10' }])
  assert.deepEqual(d.map((x) => x.kind), ['sama', 'baru'])
})
test('cari container tujuan', () => {
  const g = [{ id: 'g1', container: 'C1', packingListNo: 'P1' }]
  assert.equal(cariGrup({ container: 'C1' }, [], g, [])?.id, 'g1')
  assert.equal(cariGrup({ container: 'C9' }, [{ so: '1' }], g, [{ so: '1', groupId: 'g1' }])?.id, 'g1')
  assert.equal(cariGrup({ container: 'Q' }, [{ so: '9' }], g, []), null)
})

import { rencanaPindah } from '../src/utils/diffRows.js'
test('gabung a,b,c + a,b,d: tidak ada baris lama yang hilang, d ditambahkan', () => {
  const lama = ['a', 'b', 'c'].map((x, i) => ({ id: 'L' + x, so: '1', soItem: String((i + 1) * 10), productName: x }))
  const baru = ['a', 'b', 'd'].map((x, i) => ({ so: '1', soItem: x === 'd' ? '99' : String((i + 1) * 10), productName: x }))
  const d = bandingkan(baru, lama)
  assert.deepEqual(d.map((x) => x.kind), ['sama', 'sama', 'baru'])
  assert.deepEqual(d.hilang.map((r) => r.id), ['Lc'])   // c tetap tercatat sebagai baris lama yang tidak ada di file; server tidak menghapusnya kecuali dicentang
})
test('rencanaPindah: baris cocok diisi, baris belum ada ditambahkan', () => {
  const dipilih = [{ id: 'o1', groupId: 'G1', label: 'old', so: '1', soItem: '10', area: 'PC', target: '2026-11-10', ket: 'x', kirim: '', packed: '2026-11-01' }, { id: 'o2', so: '1', soItem: '20', area: 'WC' }]
  const tujuan = [{ id: 't1', so: '1', soItem: '10', area: '', target: '2026-12-01', ket: '', kirim: '' }]
  const r = rencanaPindah(dipilih, tujuan)
  assert.deepEqual(r.fill, [{ id: 't1', patch: { area: 'PC', ket: 'x', packed: '2026-11-01' } }])  // target tujuan sudah terisi: tidak ditimpa
  assert.equal(r.insert.length, 1); assert.equal(r.insert[0].soItem, '20'); assert.ok(!('id' in r.insert[0]) && !('groupId' in r.insert[0]))
  assert.equal(rencanaPindah(dipilih, tujuan, { timpa: true }).fill[0].patch.target, '2026-11-10')
})

import { ringkas } from '../src/utils/ringkasBackup.js'
test('ringkasan cadangan', () => {
  const r = ringkas([{ so: '1', po: 'P1', qty: '2', area: 'pc', packed: 'x', label: 'old' }, { so: '1', po: 'P1', qty: '3', area: 'PC', ket: 'k', label: 'new' }, { so: '2', qty: '', area: '' }])
  assert.equal(r.total, 3); assert.equal(r.qty, 5); assert.equal(r.packed, 1); assert.equal(r.area, 2); assert.equal(r.po, 1)
  assert.deepEqual(r.so, [{ nama: '1', n: 2 }, { nama: '2', n: 1 }]); assert.deepEqual(r.perArea, [{ nama: 'PC', n: 2 }])
  assert.equal(r.old, 1); assert.equal(r.new, 1)
})
