import test from 'node:test'
import assert from 'node:assert/strict'
import { susun, susunDokumen, gantiPeserta, parseIsi, teksBaris } from '../src/utils/isiNotulen.js'

const items = [
  { so: '100', segs: ['1 ada di PACK, ( ket A )'], selesai: false }, { so: '200', segs: ['2 ada di FIN'], selesai: false },
  { so: '100', segs: ['3 ada di WC', '3 ada di FIN'], selesai: false }, { so: '200', segs: ['9 ada di PACK'], selesai: true },
]
test('satu SO = satu daftar: baris pertama bersama SO (tingkat 1), sisanya bullet tingkat 2; antar SO ada baris kosong; yang dipacking di bawah', () => {
  const t = susun(items, 'AF RENCANA KIRIM 1 JANUARI 2026').split('\n')
  assert.equal(t[0], '*AF RENCANA KIRIM 1 JANUARI 2026')
  assert.deepEqual(t.slice(2), ['• 100, 1 ada di PACK, ( ket A )', '  • 3 ada di WC', '  • 3 ada di FIN', '', '• 200, 2 ada di FIN', '', '• 200, 9 ada di PACK'])
})
test('teksBaris = teks baris yang diberi warna hijau bila sudah dipacking', () => { assert.deepEqual(teksBaris(items.filter((i) => i.selesai)), ['200, 9 ada di PACK']) })
const dok = susunDokumen({ judul: 'NOTULEN RAPAT', hari: 'Sabtu', tempat: 'Ruang A', jam: '13.00', hadir: ['Ani ( PPIC )'], items, heading: 'H', note: 'N' })
test('dokumen penuh bisa dibaca kembali menjadi blok', () => {
  const b = parseIsi(dok, new Set(teksBaris(items.filter((i) => i.selesai))))
  assert.equal(b[0].type, 'title'); assert.deepEqual(b.filter((x) => x.type === 'info').map((x) => x.label), ['Hari,Tanggal', 'Tempat', 'Jam', 'Peserta'])
  assert.equal(b.find((x) => x.type === 'peserta').t, 'Ani ( PPIC )'); assert.equal(b.at(-1).type, 'note')
  assert.equal(b.find((x) => x.t === '200, 9 ada di PACK').color, '00B050')
})
test('gantiPeserta hanya mengubah daftar peserta', () => {
  const t = gantiPeserta(dok, ['Ani ( PPIC )', 'Budi ( QC )'])
  assert.ok(t.includes('• Budi ( QC )')); assert.equal(t.split('\n').filter((l) => l.startsWith('• 100')).length, 1)
})
test('bullet bertingkat, judul, teks bebas', () => {
  const b = parseIsi('*Judul\n• a\n  - b\nteks bebas')
  assert.deepEqual(b.map((x) => x.type + (x.lvl ?? '')), ['head', 'bullet0', 'bullet1', 'text'])
})
