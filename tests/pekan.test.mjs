import test from 'node:test'
import assert from 'node:assert/strict'
import { awalPekanRabu, resetBerikutnya } from '../api/_pekan.js'

test('awal pekan = Rabu 00.00 WIB terakhir', () => {
  assert.equal(awalPekanRabu(new Date('2026-11-17T16:59:00Z')).toISOString(), '2026-11-10T17:00:00.000Z')   // Selasa 23.59 WIB -> Rabu 11 Nov
  assert.equal(awalPekanRabu(new Date('2026-11-17T17:00:00Z')).toISOString(), '2026-11-17T17:00:00.000Z')   // Rabu 00.00 WIB tepat -> pekan baru
  for (const t of ['2026-11-18T03:00:00Z', '2026-11-19T05:00:00Z', '2026-11-22T12:00:00Z']) assert.equal(awalPekanRabu(new Date(t)).toISOString(), '2026-11-17T17:00:00.000Z')
})
test('reset berikutnya = tujuh hari setelah awal pekan', () => {
  assert.equal(resetBerikutnya(new Date('2026-11-17T05:00:00Z')).toISOString(), '2026-11-17T17:00:00.000Z')
  assert.equal(resetBerikutnya(new Date('2026-11-18T03:00:00Z')).toISOString(), '2026-11-24T17:00:00.000Z')
})
test('meeting hari Rabu tidak tereset di hari Kamis, tapi tereset Rabu berikutnya', () => {
  const mulai = new Date('2026-11-18T03:00:00Z'), basi = (sekarang) => mulai < awalPekanRabu(sekarang)
  assert.equal(basi(new Date('2026-11-19T02:00:00Z')), false); assert.equal(basi(new Date('2026-11-24T16:59:00Z')), false); assert.equal(basi(new Date('2026-11-24T17:00:00Z')), true)
})
