import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { TOPIK, PINTASAN } from '../src/data/panduan.js'

const ids = new Set(TOPIK.map((t) => t.id))
const sumber = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? sumber(p) : /\.jsx?$/.test(p) ? [p] : [] })

test('panduan: tiap topik punya id unik, judul, dan ringkasan', () => {
  assert.equal(ids.size, TOPIK.length)
  for (const t of TOPIK) { assert.ok(t.judul && t.ringkas, t.id); assert.ok(t.pintasan || t.kerja || t.cara, t.id + ' tanpa isi') }
})
test('panduan: setiap tombol "?" (Bantuan topik=...) menunjuk ke topik yang ada', () => {
  const pakai = new Set()
  for (const f of sumber(new URL('../src', import.meta.url).pathname)) for (const m of readFileSync(f, 'utf8').matchAll(/<Bantuan topik="(\w+)"/g)) pakai.add(m[1])
  assert.ok(pakai.size >= 8, 'tombol bantuan terlalu sedikit: ' + [...pakai])
  for (const x of pakai) assert.ok(ids.has(x), `topik "${x}" dipakai tapi tidak ada di panduan`)
})
test('panduan: pintasan F1 dan Ctrl + K terdaftar; tidak ada teks pandu yang tertinggal di halaman', () => {
  const kunci = PINTASAN.flatMap(([, r]) => r.map(([k]) => k)); assert.ok(kunci.includes('F1') && kunci.includes('Ctrl + K'))
  const tertinggal = ['Klik 2x pada Container, Buyer', 'SO yang sudah selesai disimpan di sini', 'Cadangan SEMUA container sekaligus', 'Baris dicocokkan lewat SO + SO Item', 'Bagian atas file dibaca sebagai parent group', 'Tiap kolom Excel dipetakan ke kolom aplikasi']
  for (const f of sumber(new URL('../src', import.meta.url).pathname).filter((p) => !p.endsWith('panduan.js'))) { const s = readFileSync(f, 'utf8'); for (const t of tertinggal) assert.ok(!s.includes(t), `${f} masih memuat teks pandu: ${t}`) }
})
