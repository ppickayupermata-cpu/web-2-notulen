import { verifyToken, send, fail, ensureDb, loadAll, sweepIfDue } from './_lib.js'

// Semua user yang login (ppic, warehouse, readonly) membaca data yang sama dari database.
export default async function handler(req, res) {
  if (req.method !== 'GET') return send(res, 405, { error: 'Method tidak diizinkan.' })
  if (!verifyToken(req)) return send(res, 401, { error: 'Sesi habis. Silakan login lagi.' })
  try {
    await ensureDb()
    await sweepIfDue()
    send(res, 200, await loadAll())
  } catch (e) { fail(res, e) }
}
