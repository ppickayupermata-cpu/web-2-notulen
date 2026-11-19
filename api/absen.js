import { pastikanLive, pastikanLiveGlobal, randomUUID, getSql, ensureDb, verifyToken, readBody, send, fail, clip, logQ } from './_lib.js'
import { awalPekanRabu, resetBerikutnya } from './_pekan.js'

// Absensi lewat QR. Yang PUBLIK (tanpa login): melihat room (GET ?room=) dan mengirim absen (POST action=submit).
// Yang butuh login PPIC: membuat room, menutup/membuka, menghapus entri. Waktu absen = jam server saat Submit diklik.
const bersih = (v, n) => clip(String(v ?? '').replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim(), n)
const MAKS = 400 // batas entri per room (mencegah penyalahgunaan link publik)

// Pengaturan reset mingguan (bawaan AKTIF) + kapan reset berikutnya (Rabu 00.00 WIB)
async function infoReset(db) {
  const [s] = await db`select value from settings where key = 'main'`
  return { aktif: s?.value?.absenReset !== false, hari: 'Rabu', berikutnya: resetBerikutnya(new Date()).toISOString() }
}
// Reset absensi: meeting yang berjalan / sudah selesai disembunyikan dari tampilan (data tetap tersimpan di database), absensinya ditutup
// sehingga QR lama tidak bisa dipakai lagi, dan meeting berikutnya mulai dengan daftar kosong.
// Otomatis: meeting yang dimulai SEBELUM Rabu 00.00 WIB terakhir dianggap pekan lalu (hanya bila reset mingguan aktif). Paksa = reset manual.
async function resetAbsenJikaPerlu(db, { paksa = false, by = 'Sistem' } = {}) {
  if (!paksa && !(await infoReset(db)).aktif) return 0
  const batas = awalPekanRabu(new Date()).toISOString()
  const lama = paksa ? await db`select id, room_id from meetings where reset_at is null`
    : await db`select id, room_id from meetings where reset_at is null and started_at < ${batas}`
  if (!lama.length) return 0
  const ids = JSON.stringify(lama.map((x) => x.id)), rooms = JSON.stringify(lama.map((x) => x.room_id).filter(Boolean))
  await db.transaction([
    db`update meetings set reset_at = now(), ended_at = coalesce(ended_at, now()), status = 'selesai' where id in (select jsonb_array_elements_text(${ids}::jsonb))`,
    db`update absen_rooms set closed = true where id in (select jsonb_array_elements_text(${rooms}::jsonb))`,
    logQ(db, 'absen', by, paksa ? 'Reset absensi manual' : 'Reset absensi otomatis mingguan (Rabu 00.00 WIB)'),
  ])
  return lama.length
}

async function paket(db, roomId, entryId = '') {
  const [room] = await db`select id, title, closed, group_id from absen_rooms where id = ${roomId}`
  if (!room) return null
  const [log, [t]] = await Promise.all([db`select id, nama, bagian, at, confirmed, confirmed_at from absen_log where room_id = ${roomId} order by seq`, db`select now() as now`])
  const mine = entryId && log.find((x) => x.id === entryId)
  const [mt] = await db`select id, nama, status, started_at, ended_at, auto_confirm from meetings where room_id = ${roomId}`
  let live = null, liveKind = 'container' // tombol "Lihat live" di HP peserta hanya muncul setelah absennya dikonfirmasi admin
  if (mine?.confirmed) {
    if (room.group_id) { const [l] = await db`select token, enabled from live_links where group_id = ${room.group_id}`; if (l?.enabled) live = l.token }
    else { const [l] = await db`select token, enabled from live_global where id = 'main'`; if (l?.enabled) { live = l.token; liveKind = 'meeting' } } // absen meeting: live yang ikut container host
  }
  // log[].at = waktu ABSEN; log[].confirmedAt = waktu TERKONFIRMASI masuk ruangan (null selama masih menunggu konfirmasi)
  return { room: { id: room.id, title: room.title, closed: !!room.closed }, log: log.map((x) => ({ id: x.id, nama: x.nama, bagian: x.bagian, at: new Date(x.at).toISOString(), confirmed: !!x.confirmed, confirmedAt: x.confirmed && x.confirmed_at ? new Date(x.confirmed_at).toISOString() : null })), now: new Date(t.now).toISOString(), ...(mine ? { mine: { id: mine.id, confirmed: !!mine.confirmed, confirmedAt: mine.confirmed && mine.confirmed_at ? new Date(mine.confirmed_at).toISOString() : null } } : {}), ...(live ? { live, liveKind } : {}), meeting: mt ? { id: mt.id, nama: mt.nama, status: mt.status, startedAt: new Date(mt.started_at).toISOString(), endedAt: mt.ended_at ? new Date(mt.ended_at).toISOString() : null, autoConfirm: !!mt.auto_confirm } : null }
}

export default async function handler(req, res) {
  try {
    await ensureDb()
    const db = getSql(), q = new URL(req.url, 'http://x').searchParams
    if (req.method === 'GET') {
      const id = q.get('room')
      if (!id && q.get('current')) { // PPIC: meeting terbaru (satu absensi untuk semua container)
        if (!verifyToken(req)) return send(res, 401, { error: 'Sesi habis. Silakan login lagi.' })
        await resetAbsenJikaPerlu(db)
        const [m] = await db`select room_id from meetings where room_id is not null and reset_at is null order by started_at desc limit 1`
        const reset = await infoReset(db)
        return send(res, 200, { ...(m ? await paket(db, m.room_id) : { room: null, meeting: null, log: [], now: new Date().toISOString() }), reset })
      }
      if (!id) { // PPIC: cari room terakhir milik container ini (absensi lama per container)
        if (!verifyToken(req)) return send(res, 401, { error: 'Sesi habis. Silakan login lagi.' })
        const [r] = await db`select id from absen_rooms where group_id = ${String(q.get('groupId') || '')} order by created_at desc limit 1`
        return send(res, 200, r ? await paket(db, r.id) : { room: null, log: [] })
      }
      await resetAbsenJikaPerlu(db)   // QR pekan lalu ditutup begitu pekan baru dimulai
      const p = await paket(db, clip(id, 40), clip(q.get('entry'), 60))
      return p ? send(res, 200, p) : send(res, 404, { error: 'Room absensi tidak ditemukan.' })
    }
    if (req.method !== 'POST') return send(res, 405, { error: 'Method tidak diizinkan.' })
    const b = await readBody(req)

    if (b.action === 'submit') { // ---------- PUBLIK ----------
      const id = clip(b.room, 40), nama = bersih(b.nama, 60), bagian = bersih(b.bagian, 40).toUpperCase()
      if (nama.length < 2) return send(res, 400, { error: 'Nama minimal 2 huruf.' })
      if (!bagian) return send(res, 400, { error: 'Bagian wajib diisi.' })
      await resetAbsenJikaPerlu(db)
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
      if (!dup) { const [m] = await db`select auto_confirm from meetings where room_id = ${id}`; if (m?.auto_confirm) { await db`update absen_log set confirmed = true, confirmed_at = now() where id = ${e.id}`; await pastikanLiveGlobal(db) } }
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
      case 'startMeeting': {
        await resetAbsenJikaPerlu(db) // Meeting dimulai: satu room absensi untuk SEMUA container; idempotent bila sudah ada yang berjalan
        const [run] = await db`select room_id from meetings where status = 'berjalan' and reset_at is null and room_id is not null order by started_at desc limit 1`
        if (run) return send(res, 200, await paket(db, run.room_id))
        const room = randomUUID().replace(/-/g, '').slice(0, 14), nama = bersih(b.nama, 120) || 'Meeting'
        await db.transaction([
          db`insert into absen_rooms(id, group_id, title, created_by) values (${room}, null, ${nama}, ${user.username})`,
          db`insert into meetings(id, nama, room_id, started_by, auto_confirm) values (${randomUUID()}, ${nama}, ${room}, ${user.username}, ${!!b.autoConfirm})`,
          logQ(db, 'absen', user.username, `Meeting dimulai: ${nama}`),
        ])
        await pastikanLiveGlobal(db)
        return send(res, 200, await paket(db, room))
      }
      case 'endMeeting': { // Meeting ditutup: absensi ditutup, jam selesai dicatat dari jam server
        const [run] = await db`select id, room_id from meetings where status = 'berjalan' and reset_at is null order by started_at desc limit 1`
        if (!run) return send(res, 409, { error: 'Tidak ada meeting yang sedang berjalan.' })
        await db.transaction([
          db`update meetings set status = 'selesai', ended_at = now() where id = ${run.id}`,
          db`update absen_rooms set closed = true where id = ${run.room_id}`,
          logQ(db, 'absen', user.username, 'Meeting ditutup'),
        ])
        return send(res, 200, await paket(db, run.room_id))
      }
      case 'resetAbsensi': { // reset manual: kosongkan absensi minggu ini (data tetap tersimpan, tidak tampil lagi) dan tutup QR lama
        await resetAbsenJikaPerlu(db, { paksa: true, by: user.username })
        return send(res, 200, { room: null, meeting: null, log: [], now: new Date().toISOString(), reset: await infoReset(db) })
      }
      case 'setAbsenReset': { // aktif / nonaktifkan reset otomatis tiap Rabu
        await db`insert into settings(key, value) values ('main', ${JSON.stringify({ absenReset: !!b.aktif })}::jsonb) on conflict (key) do update set value = settings.value || excluded.value`
        await db`insert into logs(id, type, actor, detail, container) values (${randomUUID()}, 'absen', ${user.username}, ${'Reset absensi otomatis mingguan ' + (b.aktif ? 'diaktifkan' : 'dinonaktifkan')}, '')`
        const [m] = await db`select room_id from meetings where room_id is not null and reset_at is null order by started_at desc limit 1`
        return send(res, 200, { ...(m ? await paket(db, m.room_id) : { room: null, meeting: null, log: [], now: new Date().toISOString() }), reset: await infoReset(db) })
      }
      case 'setClosed': {
        await db`update absen_rooms set closed = ${!!b.closed} where id = ${clip(b.room, 40)}`
        const p = await paket(db, clip(b.room, 40)); return p ? send(res, 200, p) : send(res, 404, { error: 'Room tidak ditemukan.' })
      }
      case 'confirm': { // konfirmasi (atau batalkan konfirmasi) satu absen; ikut membuat link live container bila belum ada
        const room = clip(b.room, 40), [r] = await db`select group_id from absen_rooms where id = ${room}`
        if (!r) return send(res, 404, { error: 'Room tidak ditemukan.' })
        await db`update absen_log set confirmed = ${!!b.confirmed}, confirmed_at = case when ${!!b.confirmed} then now() else null end where id = ${clip(b.id, 60)} and room_id = ${room}`
        if (b.confirmed) { if (r.group_id) await pastikanLive(db, r.group_id); else await pastikanLiveGlobal(db) }
        return send(res, 200, await paket(db, room))
      }
      case 'confirmAll': {
        const room = clip(b.room, 40), [r] = await db`select group_id from absen_rooms where id = ${room}`
        if (!r) return send(res, 404, { error: 'Room tidak ditemukan.' })
        await db`update absen_log set confirmed = true, confirmed_at = now() where room_id = ${room} and not confirmed`
        if (r.group_id) await pastikanLive(db, r.group_id); else await pastikanLiveGlobal(db)
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
