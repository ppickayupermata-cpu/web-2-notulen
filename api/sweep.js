import { send, fail, ensureDb, sweep } from './_lib.js'

// Dipanggil Vercel Cron tiap hari (lihat vercel.json). Butuh ENV CRON_SECRET.
export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) return send(res, 401, { error: 'Tidak diizinkan.' })
  try { await ensureDb(); await sweep(); send(res, 200, { ok: true }) } catch (e) { fail(res, e) }
}
