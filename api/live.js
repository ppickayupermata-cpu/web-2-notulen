import { getSql, ensureDb, send, fail, clip } from './_lib.js'

// Tampilan LIVE read-only (PUBLIK, tanpa login): siapa pun yang memegang link (token) bisa MELIHAT isi satu container.
// Tidak ada aksi tulis di sini. Admin bisa mematikan / mengganti link dari aplikasi (tabel live_links).
const KEYS = ['productCode', 'productName', 'po', 'so', 'soItem', 'material', 'type', 'size', 'qty', 'uom', 'group', 'no', 'area', 'target', 'ket', 'kirim']

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') return send(res, 405, { error: 'Method tidak diizinkan.' })
    await ensureDb()
    const db = getSql(), t = clip(new URL(req.url, 'http://x').searchParams.get('t'), 40)
    if (!/^[a-z0-9]{8,40}$/i.test(t)) return send(res, 404, { error: 'Link live tidak valid.' })
    const [g] = await db`select g.id, g.container, g.buyer, g.packing_list_no, g.ship_date, g.status, g.kind, l.enabled from live_links l join groups g on g.id = l.group_id where l.token = ${t}`
    if (!g) return send(res, 404, { error: 'Link live tidak ditemukan atau sudah diganti.' })
    if (!g.enabled) return send(res, 403, { error: 'Link live dinonaktifkan oleh admin.' })
    const [rows, [pr]] = await Promise.all([db`select id, data from rows where group_id = ${g.id} order by seq`, db`select editor, row_id, col, editing, draft from live_presence where group_id = ${g.id} and at > now() - interval '20 seconds'`])
    send(res, 200, {
      group: { container: g.container, buyer: g.buyer, packingListNo: g.packing_list_no, shipDate: g.ship_date, status: g.status, kind: g.kind || '' },
      rows: rows.map((r) => { const o = { id: r.id, packed: !!r.data.packed }; KEYS.forEach((k) => { o[k] = r.data[k] ?? '' }); return o }),
      presence: pr ? { editor: pr.editor, rowId: pr.row_id, key: pr.col, editing: pr.editing, draft: pr.draft || {} } : null, // admin sedang mengedit: kursor + isian belum disimpan
      now: new Date().toISOString(),
    })
  } catch (e) { fail(res, e) }
}
