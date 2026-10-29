import { getSql, ensureDb, send, fail, clip } from './_lib.js'

// Tampilan LIVE read-only (PUBLIK, tanpa login): siapa pun yang memegang link (token) bisa MELIHAT isi satu container.
// Tidak ada aksi tulis di sini. Admin bisa mematikan / mengganti link dari aplikasi (tabel live_links).
const KEYS = ['productCode', 'productName', 'po', 'so', 'soItem', 'material', 'type', 'size', 'qty', 'uom', 'group', 'area', 'target', 'ket', 'kirim']

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') return send(res, 405, { error: 'Method tidak diizinkan.' })
    await ensureDb()
    const db = getSql(), t = clip(new URL(req.url, 'http://x').searchParams.get('t'), 40)
    if (!/^[a-z0-9]{8,40}$/i.test(t)) return send(res, 404, { error: 'Link live tidak valid.' })
    const [g] = await db`select g.id, g.container, g.buyer, g.packing_list_no, g.ship_date, g.status, l.enabled from live_links l join groups g on g.id = l.group_id where l.token = ${t}`
    if (!g) return send(res, 404, { error: 'Link live tidak ditemukan atau sudah diganti.' })
    if (!g.enabled) return send(res, 403, { error: 'Link live dinonaktifkan oleh admin.' })
    const rows = await db`select id, data from rows where group_id = ${g.id} order by seq`
    send(res, 200, {
      group: { container: g.container, buyer: g.buyer, packingListNo: g.packing_list_no, shipDate: g.ship_date, status: g.status },
      rows: rows.map((r) => { const o = { id: r.id, packed: !!r.data.packed }; KEYS.forEach((k) => { o[k] = r.data[k] ?? '' }); return o }),
      now: new Date().toISOString(),
    })
  } catch (e) { fail(res, e) }
}
