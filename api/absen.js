import { pastikanLive, randomUUID, getSql, ensureDb, verifyToken, readBody, send, fail, clip } from './_lib.js'

// Absensi lewat QR. Yang PUBLIK (tanpa login): melihat room (GET ?room=) dan mengirim absen (POST action=submit).
// Yang butuh login PPIC: membuat room, menutup/membuka, menghapus entri. Waktu absen = jam server saat Submit diklik.
const bersih = (v, n) => clip(String(v ?? '').replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim(), n)
const MAKS = 400 // batas entri per room (mencegah penyalahgunaan link publik)

async function paket(db, roomId, entryId = '') {
  const [room] = await db`select id, title, closed, group_id from absen_rooms where id = ${roomId}`
  if (!room) return null
  const [log, [t]] = await Promise.all([db`select id, nama, bagian, at, confirmed from absen_log where room_id = ${roomId} order by seq`, db`select now() as now`])
  const mine = entryId && log.find((x) => x.id === entryId)
  let live = null // tombol "Lihat live" di HP peserta hanya muncul setelah absennya dikonfirmasi admin
  if (mine?.confirmed && room.group_id) { const [l] = await db`select token, enabled from live_links where group_id = ${room.group_id}`; if (l?.enabled) live = l.token }
  return { room: { id: room.id, title: room.title, closed: !!room.closed }, log: log.map((x) => ({ id: x.id, nama: x.nama, bagian: x.bagian, at: new Date(x.at).toISOString(), confirmed: !!x.confirmed })), now: new Date(t.now).toISOString(), ...(mine ? { mine: { id: mine.id, confirmed: !!mine.confirmed } } : {}), ...(live ? { live } : {}) }
}

export default async function handler(req, res) {
  try {
    await ensureDb()
    const db = getSql(), q = new URL(req.url, 'http://x').searchParams
    if (req.method === 'GET') {
      const id = q.get('room')
      if (!id) { // PPIC: cari room terakhir milik container ini
        if (!verifyToken(req)) return send(res, 401, { error: 'Sesi habis. Silakan login lagi.' })
        const [r] = await db`select id from absen_rooms where group_id = ${String(q.get('groupId') || '')} order by created_at desc limit 1`
        return send(res, 200, r ? await paket(db, r.id) : { room: null, log: [] })
      }
      const p = await paket(db, clip(id, 40), clip(q.get('entry'), 60))
      return p ? send(res, 200, p) : send(res, 404, { error: 'Room absensi tidak ditemukan.' })
    }
    if (req.method !== 'POST') return send(res, 405, { error: 'Method tidak diizinkan.' })
    const b = await readBody(req)

    if (b.action === 'submit') { // ---------- PUBLIK ----------
      const id = clip(b.room, 40), nama = bersih(b.nama, 60), bagian = bersih(b.bagian, 40).toUpperCase()
      if (nama.length < 2) return send(res, 400, { error: 'Nama minimal 2 huruf.' })
      if (!bagian) return send(res, 400, { error: 'Bagian wajib diisi.' })
      const [room] = await db`select id, closed from absen_rooms where id = ${id}`
      if (!room) return send(res, 404, { error: 'Room absensi tidak ditemukan.' })
      if (room.closed) return send(res, 409, { error: 'Absensi sudah ditutup.' })
      const [{ n }] = await db`select count(*)::int as n from absen_log where room_id = ${id}`
      if (n >= MAKS) return send(res, 429, { error: 'Jumlah absen pada room ini sudah penuh.' })
      const k = `${nama}|${bagian}`.toLowerCase()
      const ada = () => db`select id, nama, bagian, at from absen_log where room_id = ${id} and k = ${k}`
      let [e] = await ada(); const dup = !!e   // sudah absen (nama + bagian sama) -> pakai catatan pertama, waktu tidak diubah
      if (!e) {
        await db`insert into absen_log(id, room_id, nama, bagian, k) values (${randomUUID()}, ${id}, ${nama}, ${bagian}, ${k}) on conflict (room_id, k) do nothing`
        ;[e] = await ada()
      }
      const p = await paket(db, id, e.id)
      return send(res, 200, { ok: true, dup, entry: { id: e.id, nama: e.nama, bagian: e.bagian, at: new Date(e.at).toISOString() }, ...p })
    }

    // ---------- khusus PPIC (login) ----------
    const user = verifyToken(req)
    if (!user) return send(res, 401, { error: 'Sesi habis. Silakan login lagi.' })
    switch (b.action) {
      case 'create': {
        const gid = String(b.groupId || '')
        const [g] = await db`select id from groups where id = ${gid}`
        if (!g) return send(res, 404, { error: 'Container tidak ditemukan.' })
        if (!b.fresh) { const [r] = await db`select id from absen_rooms where group_id = ${gid} order by created_at desc limit 1`; if (r) return send(res, 200, await paket(db, r.id)) }
        const id = randomUUID().replace(/-/g, '').slice(0, 14)
        await db`insert into absen_rooms(id, group_id, title, created_by) values (${id}, ${gid}, ${bersih(b.title, 120)}, ${user.username})`
        return send(res, 200, await paket(db, id))
      }
      case 'setClosed': {
        await db`update absen_rooms set closed = ${!!b.closed} where id = ${clip(b.room, 40)}`
        const p = await paket(db, clip(b.room, 40)); return p ? send(res, 200, p) : send(res, 404, { error: 'Room tidak ditemukan.' })
      }
      case 'confirm': { // konfirmasi (atau batalkan konfirmasi) satu absen; ikut membuat link live container bila belum ada
        const room = clip(b.room, 40), [r] = await db`select group_id from absen_rooms where id = ${room}`
        if (!r) return send(res, 404, { error: 'Room tidak ditemukan.' })
        await db`update absen_log set confirmed = ${!!b.confirmed}, confirmed_at = ${b.confirmed ? new Date().toISOString() : null} where id = ${clip(b.id, 60)} and room_id = ${room}`
        if (b.confirmed && r.group_id) await pastikanLive(db, r.group_id)
        return send(res, 200, await paket(db, room))
      }
      case 'confirmAll': {
        const room = clip(b.room, 40), [r] = await db`select group_id from absen_rooms where id = ${room}`
        if (!r) return send(res, 404, { error: 'Room tidak ditemukan.' })
        await db`update absen_log set confirmed = true, confirmed_at = now() where room_id = ${room} and not confirmed`
        if (r.group_id) await pastikanLive(db, r.group_id)
        return send(res, 200, await paket(db, room))
      }
      case 'remove': {
        await db`delete from absen_log where id = ${clip(b.id, 60)} and room_id = ${clip(b.room, 40)}`
        const p = await paket(db, clip(b.room, 40)); return p ? send(res, 200, p) : send(res, 404, { error: 'Room tidak ditemukan.' })
      }
      default: return send(res, 400, { error: 'Aksi tidak dikenal.' })
    }
  } catch (e) { fail(res, e) }
}
