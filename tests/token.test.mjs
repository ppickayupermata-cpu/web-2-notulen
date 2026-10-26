import test from 'node:test'
import assert from 'node:assert/strict'
process.env.AUTH_SECRET = 'rahasia-uji-yang-cukup-panjang-1234567890'
const { signToken, verifyToken } = await import('../api/_lib.js')
const req = (t) => ({ headers: { authorization: 'Bearer ' + t } })

test('token valid diterima, tanpa peran (aplikasi hanya untuk PPIC)', () => {
  const p = verifyToken(req(signToken({ username: 'ppic' })))
  assert.equal(p.username, 'ppic'); assert.equal('role' in p, false)
})
test("token diubah / kosong / kedaluwarsa ditolak", async () => {
  const t = signToken({ username: 'ppic' }), [b, s] = t.split('.')
  assert.equal(verifyToken(req(b + '.x' + s)), null); assert.equal(verifyToken(req('')), null)
  const lama = Buffer.from(JSON.stringify({ username: 'x', exp: Date.now() - 1000 })).toString('base64url')
  const { createHmac } = await import('node:crypto')
  assert.equal(verifyToken(req(lama + '.' + createHmac('sha256', process.env.AUTH_SECRET).update(lama).digest('base64url'))), null)
})
