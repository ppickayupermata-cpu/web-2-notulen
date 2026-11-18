import { getSql, ensureDb, send, fail, clip } from './_lib.js'

// Tampilan LIVE read-only (PUBLIK, tanpa login): siapa pun yang memegang link (token) bisa MELIHAT isi satu container.
// Dua jenis link: ?t=TOKEN = satu container tetap; ?m=TOKEN = LIVE MEETING, otomatis berpindah ke container yang sedang dibuka host (PPIC).
// Tidak ada aksi tulis di sini. Admin bisa mematikan / mengganti link dari aplikasi (tabel live_links / live_global).
const KEYS = ['productCode', 'productName', 'po', 'so', 'soItem', 'material', 'type', 'size', 'qty', 'uom', 'group', 'no', 'area', 'target', 'ket', 'kirim']

async function muat(db, g, pr, extra = {}) {
  const rows = await db`select id, data from rows where group_id = ${g.id} order by seq`
  return {
    group: { container: g.container, buyer: g.buyer, packingListNo: g.packing_list_no, shipDate: g.ship_date, status: g.status, kind: g.kind || '' },
    rows: rows.map((r) => { const o = { id: r.id, packed: !!r.data.packed }; KEYS.forEach((k) => { o[k] = r.data[k] ?? '' }); return o }),
    presence: pr ? { editor: pr.editor, rowId: pr.row_id, key: pr.col, editing: pr.editing, draft: pr.draft || {} } : null, // admin sedang mengedit: kursor + isian belum disimpan
    now: new Date().toISOString(), ...extra,
  }
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') return send(res, 405, { error: 'Method tidak diizinkan.' })
    await ensureDb()
    const db = getSql(), qs = new URL(req.url, 'http://x').searchParams, m = clip(qs.get('m'), 40)
    if (m) { // ---------- LIVE MEETING: ikut container yang sedang dibuka host ----------
      if (!/^[a-z0-9]{8,40}$/i.test(m)) return send(res, 404, { error: 'Link live meeting tidak valid.' })
      const [lg] = await db`select enabled, last_group_id, last_at from live_global where token = ${m}`
      if (!lg) return send(res, 404, { error: 'Link live meeting tidak ditemukan atau sudah diganti.' })
      if (!lg.enabled) return send(res, 403, { error: 'Link live meeting dinonaktifkan oleh admin.' })
      const [p] = await db`select group_id, editor, row_id, col, editing, draft, at, (at > now() - interval '20 seconds') as fresh from live_presence order by at desc limit 1`
      // container terbaru: denyut host terakhir, atau container yang baru ditinggalkan host (mana yang lebih baru)
      const gid = p && (!lg.last_at || new Date(p.at) > new Date(lg.last_at)) ? p.group_id : (lg.last_group_id || p?.group_id)
      const [g] = gid ? await db`select id, container, buyer, packing_list_no, ship_date, status, kind from groups where id = ${gid}` : []
      if (!g) return send(res, 200, { meeting: true, waiting: true, group: null, rows: [], presence: null, now: new Date().toISOString() })
      return send(res, 200, await muat(db, g, p && p.fresh && p.group_id === g.id ? p : null, { meeting: true }))
    }
    const t = clip(qs.get('t'), 40)
    if (!/^[a-z0-9]{8,40}$/i.test(t)) return send(res, 404, { error: 'Link live tidak valid.' })
    const [g] = await db`select g.id, g.container, g.buyer, g.packing_list_no, g.ship_date, g.status, g.kind, l.enabled from live_links l join groups g on g.id = l.group_id where l.token = ${t}`
    if (!g) return send(res, 404, { error: 'Link live tidak ditemukan atau sudah diganti.' })
    if (!g.enabled) return send(res, 403, { error: 'Link live dinonaktifkan oleh admin.' })
    const [pr] = await db`select editor, row_id, col, editing, draft from live_presence where group_id = ${g.id} and at > now() - interval '20 seconds'`
    send(res, 200, await muat(db, g, pr))
  } catch (e) { fail(res, e) }
}
