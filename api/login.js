// Vercel Serverless Function. Akun dibaca dari ENV "APP_USERS" (tidak ikut ke browser).
import { timingSafeEqual } from 'node:crypto'
import { send, readBody, signToken, fail } from './_lib.js'

const same = (a, b) => {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b))
  return x.length === y.length && timingSafeEqual(x, y)
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method tidak diizinkan.' })
  try {
    let users = []
    try { users = JSON.parse(process.env.APP_USERS || '[]') } catch { /* ENV salah format */ }
    const { username = '', password = '' } = await readBody(req)
    // aplikasi hanya untuk PPIC: akun lama berperan warehouse/readonly di ENV tidak lagi boleh masuk (supaya tidak otomatis jadi PPIC)
    users = users.filter((x) => !x.role || x.role === 'ppic')
    const u = users.find((x) => same(x.username, username) && same(x.password, password))
    if (!u) return send(res, 401, { error: 'Username atau password salah.' })
    send(res, 200, { username: u.username, token: signToken(u) })
  } catch (e) { fail(res, e) }
}
