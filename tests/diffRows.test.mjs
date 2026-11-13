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

import { infoPindahSo, kunciSo } from '../src/utils/barangJadi.js'
test('Barang Jadi: ringkasan per SO (semua baris SO, termasuk yang belum dipacking)', () => {
  const rows = [{ id: 'a', groupId: 'G', so: '10', packed: 'x' }, { id: 'b', groupId: 'G', so: ' 10 ' }, { id: 'c', groupId: 'G', so: '20' }, { id: 'd', groupId: 'H', so: '10' }, { id: 'e', groupId: 'G', so: '' }]
  const i = infoPindahSo(rows, 'G', '10')
  assert.deepEqual(i.ids, ['a', 'b']); assert.equal(i.packed, 1); assert.equal(i.belum, 1); assert.equal(i.containerKosong, false)
  assert.equal(infoPindahSo(rows, 'H', '10').containerKosong, true)       // satu-satunya SO di container H -> container akan kosong
  assert.equal(kunciSo({ so: '' }), '(tanpa SO)'); assert.deepEqual(infoPindahSo(rows, 'G', '(tanpa SO)').ids, ['e'])
})

import { dariTabel } from '../src/utils/notulen.js'
import { susun, susunDokumen } from '../src/utils/isiNotulen.js'
import { jamWIB, tglWIB } from '../src/utils/waktu.js'
test('notulen: yang dicentang urut menurut waktu dicentang, pertama paling atas', () => {
  const rows = [
    { id: 'a', so: 'SO-A', po: 'P1', area: 'PC', target: '2026-11-20', packed: '2026-11-12T03:30:00.000Z' },   // dicentang ke-2
    { id: 'b', so: 'SO-B', po: 'P2', area: 'WC', target: '2026-11-21', packed: '2026-11-12T03:10:00.000Z' },   // dicentang ke-1
    { id: 'c', so: 'SO-C', po: 'P3', area: 'PC', target: '2026-11-22', packed: '2026-11-12T04:00:00.000Z' },   // dicentang ke-3
    { id: 'd', so: 'SO-D', po: 'P4', area: 'PC', target: '2026-11-23' },                                          // belum
  ]
  const t = dariTabel(rows)
  assert.deepEqual(t.items.filter((i) => i.selesai).map((i) => i.so), ['SO-B', 'SO-A', 'SO-C'])
  const atas = susun(t.items, '', true).split('\n').filter((l) => /^•/.test(l)).map((l) => l.match(/SO-\w/)[0])
  assert.deepEqual(atas, ['SO-B', 'SO-A', 'SO-C', 'SO-D'])       // dicentang pertama paling atas, belum dicentang di bawah
  const bawah = susun(t.items, '').split('\n').filter((l) => /^•/.test(l)).map((l) => l.match(/SO-\w/)[0])
  assert.deepEqual(bawah, ['SO-D', 'SO-B', 'SO-A', 'SO-C'])      // bawaan lama: belum dulu, yang selesai di bawah
  assert.ok(susunDokumen({ judul: 'N', hari: 'h', tempat: 't', jam: 'j', hadir: [], items: t.items, note: '', selesaiDiAtas: true }).indexOf('SO-B') < susunDokumen({ judul: 'N', hari: 'h', tempat: 't', jam: 'j', hadir: [], items: t.items, note: '', selesaiDiAtas: true }).indexOf('SO-D'))
})
test('waktu WIB dari ISO server', () => {
  assert.equal(jamWIB('2026-11-12T06:05:00.000Z'), '13:05'); assert.equal(tglWIB('2026-11-12T20:00:00.000Z'), '2026-11-13'); assert.equal(jamWIB(''), '')
})

import { containerDari } from '../api/_teks.js'
import { cocokTeks, filterRows, filterGroups } from '../src/utils/filter.js'
test('Riwayat: nama container diambil dari keterangan', () => {
  assert.equal(containerDari('Diganti upload baru: Container DRAFT PL AF 28 - R0'), 'DRAFT PL AF 28 - R0')
  assert.equal(containerDari('Pindah ke Barang Jadi: Container 1030008148-2 · 12 baris'), '1030008148-2')
  assert.equal(containerDari('Data lama Container A → Container B: +3 baris'), 'A')
  assert.equal(containerDari('Hapus terjadwal: Container X (SO 10)'), 'X'); assert.equal(containerDari('tanpa nama'), '')
})
test('pencarian satu kotak: semua kata harus cocok, lintas kolom dan container', () => {
  assert.ok(cocokTeks('SO 1030 Alexandria PC', '1030 alex')); assert.ok(!cocokTeks('SO 1030 Alexandria', '1030 zzz')); assert.ok(cocokTeks('apa saja', '  '))
  const groups = [{ id: 'G1', container: 'AF-28' }, { id: 'G2', container: 'BX-01' }]
  const rows = [{ id: 'a', groupId: 'G1', so: '10', productName: 'Alexandria', area: 'PC' }, { id: 'b', groupId: 'G2', so: '10', productName: 'Pinehurst', area: 'WC' }]
  assert.deepEqual(filterRows(rows, { q: '10 alex' }, groups).map((r) => r.id), ['a'])
  assert.deepEqual(filterRows(rows, { q: 'bx-01' }, groups).map((r) => r.id), ['b'])        // cari berdasarkan nama container
  assert.deepEqual(filterRows(rows, { q: '10' }, groups).map((r) => r.id), ['a', 'b'])
  assert.deepEqual(filterGroups([{ container: 'AF-28', buyer: 'AAW' }, { container: 'BX', buyer: 'ZZZ' }], { q: 'aaw' }).map((g) => g.container), ['AF-28'])
})
