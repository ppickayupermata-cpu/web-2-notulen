import test from 'node:test'
import assert from 'node:assert/strict'
import { tanggalPulih } from '../api/_pulih.js'

const cfg = { autoDelete: true, months: 1 }
test('data lama yang dipulihkan tidak langsung terkena hapus otomatis', () => {
  assert.equal(tanggalPulih('2026-09-01', cfg, '2026-11-04'), '2026-11-04')   // sudah lewat 1 bulan: mulai lagi dari hari ini
  assert.equal(tanggalPulih('2026-10-20', cfg, '2026-11-04'), '2026-10-20')   // masih dalam batas: tanggal asli dipakai
  assert.equal(tanggalPulih('2026-10-04', cfg, '2026-11-04'), '2026-11-04')   // tepat jatuh tempo hari ini = akan dihapus pembersihan, jadi direset
  assert.equal(tanggalPulih('2026-09-01', { autoDelete: false, months: 1 }, '2026-11-04'), '2026-09-01')
  assert.equal(tanggalPulih('', cfg, '2026-11-04'), '2026-11-04')
})
