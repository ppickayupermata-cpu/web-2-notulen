import { ROLES, randomUUID, getSql, ensureDb, verifyToken, readBody, send, fail, clip, todayTZ, logQ } from './_lib.js'

const STAGES = ['area', 'target', 'ket', 'kirim']
const INFO = ['productCode', 'productName', 'po', 'so', 'soItem', 'material', 'type', 'size', 'qty', 'uom', 'group']
const ids = (a) => JSON.stringify((Array.isArray(a) ? a : []).slice(0, 5000).map(String))

// Semua perubahan data lewat sini; hak akses dicek di server berdasarkan token login.
export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method tidak diizinkan.' })
  const user = verifyToken(req)
  if (!user) return send(res, 401, { error: 'Sesi habis. Silakan login lagi.' })
  const role = ROLES[user.role]
  const b = await readBody(req)
  const forbid = () => send(res, 403, { error: 'Akun ini tidak punya akses untuk aksi tersebut.' })

  try {
    await ensureDb()
    const db = getSql()

    switch (b.action) {
      case 'applyChanges': { // isi RM..WH: hanya kolom milik role-nya yang diterima
        if (!role.edit.length) return forbid()
        const items = []
        for (const [id, ch] of Object.entries(b.changes || {})) {
          const patch = {}
          for (const [k, v] of Object.entries(ch || {})) {
            if (role.edit.includes(k) || (role.upload && /^x\d{1,2}$/.test(k))) patch[k] = clip(v, 80)
            else if (k === 'packed' && role.packing) patch.packed = v ? new Date().toISOString() : '' // tag packing: waktu dicatat server
          }
          if (Object.keys(patch).length) items.push({ id, patch })
        }
        if (items.length) {
          await db`update rows r set data = r.data || x.patch
                   from jsonb_to_recordset(${JSON.stringify(items)}::jsonb) as x(id text, patch jsonb) where r.id = x.id`
        }
        return send(res, 200, { ok: true, updated: items.length })
      }

      case 'updateGroup': { // edit header parent group (hanya PPIC)
        if (!role.upload) return forbid()
        const c = clip(b.container).trim()
        if (!c) return send(res, 400, { error: 'Container tidak boleh kosong.' })
        const dup = await db`select 1 from groups where container = ${c} and id <> ${String(b.id)}`
        if (dup.length) return send(res, 400, { error: 'Nomor container sudah dipakai packing list lain.' })
        await db`update groups set container = ${c}, buyer = ${clip(b.buyer)}, packing_list_no = ${clip(b.packingListNo)}, ship_date = ${clip(b.shipDate)}, status = ${clip(b.status)} where id = ${String(b.id)}`
        return send(res, 200, { ok: true })
      }
      case 'addRows': { // tambah baris kosong di container (hanya PPIC)
        if (!role.upload) return forbid()
        const n = Math.max(1, Math.min(50, parseInt(b.count) || 1))
        const [g] = await db`select id from groups where id = ${String(b.groupId)}`
        if (!g) return send(res, 400, { error: 'Container tidak ditemukan.' })
        const data = {}; INFO.forEach((k) => { data[k] = '' }); STAGES.forEach((k) => { data[k] = '' })
        const list = Array.from({ length: n }, () => ({ id: randomUUID(), data }))
        await db`insert into rows(id, group_id, data) select x.id, ${g.id}::text, x.data from jsonb_to_recordset(${JSON.stringify(list)}::jsonb) as x(id text, data jsonb)`
        return send(res, 200, { ok: true })
      }
      case 'addGroup': {
        if (!role.upload) return forbid()
        const g = b.group || {}, input = Array.isArray(b.rows) ? b.rows : []
        const container = clip(g.container, 60).trim()
        if (!container || !input.length) return send(res, 400, { error: 'Container atau isi packing list kosong.' })
        const gid = randomUUID()
        const rows = input.map((r) => {
          const data = {}
          INFO.forEach((k) => { data[k] = clip(r[k]) })
          STAGES.forEach((k) => { data[k] = '' }) // kolom input selalu mulai kosong
          return { id: randomUUID(), data }
        })
        const stmts = []
        const old = await db`select id from groups where container = ${container}`
        for (const o of old) {
          stmts.push(db`delete from schedules where group_id = ${o.id}`, db`delete from groups where id = ${o.id}`,
            logQ(db, 'hapus', user.username, `Diganti upload baru: Container ${container}`))
        }
        stmts.push(
          db`insert into groups(id, container, buyer, packing_list_no, ship_date, status, revision, added_at)
             values (${gid}, ${container}, ${clip(g.buyer)}, ${clip(g.packingListNo)}, ${clip(g.shipDate)}, ${clip(g.status)}, ${clip(g.revision)}, ${todayTZ()})`,
          db`insert into rows(id, group_id, data)
             select x.id, ${gid}::text, x.data from jsonb_to_recordset(${JSON.stringify(rows)}::jsonb) as x(id text, data jsonb)`,
          logQ(db, 'upload', user.username, `${clip(b.fileName, 120) || 'file'} — Container ${container} · Buyer ${clip(g.buyer) || '-'} · ${rows.length} baris`),
        )
        await db.transaction(stmts)
        return send(res, 200, { ok: true })
      }

      case 'removeGroup': {
        if (!role.remove) return forbid()
        const [g] = await db`select id, container, buyer, (select count(*) from rows where group_id = groups.id)::int as n from groups where id = ${String(b.id)}`
        if (g) await db.transaction([
          db`delete from schedules where group_id = ${g.id}`, db`delete from groups where id = ${g.id}`,
          logQ(db, 'hapus', user.username, `${clip(b.reason, 60) || 'Hapus manual'}: Container ${g.container} · Buyer ${g.buyer || '-'} · ${g.n} baris`),
        ])
        return send(res, 200, { ok: true })
      }

      case 'removeRows': {
        if (!role.remove) return forbid()
        const list = ids(b.ids)
        const gone = await db`select distinct data->>'so' as so from rows where id in (select jsonb_array_elements_text(${list}::jsonb))`
        const [c] = await db`select count(*)::int as n from rows where id in (select jsonb_array_elements_text(${list}::jsonb))`
        if (c.n) await db.transaction([
          db`delete from rows where id in (select jsonb_array_elements_text(${list}::jsonb))`,
          db`delete from groups g where not exists (select 1 from rows r where r.group_id = g.id)`,
          logQ(db, 'hapus', user.username, `${clip(b.reason, 60) || 'Hapus manual'}: ${c.n} baris (SO ${gone.map((x) => x.so).join(', ')})`),
        ])
        return send(res, 200, { ok: true })
      }

      case 'addSchedules': {
        if (!role.remove) return forbid()
        const t = todayTZ(), stmts = []
        for (const s of (Array.isArray(b.list) ? b.list : []).slice(0, 200)) {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(s.date || '') || s.date <= t) return send(res, 400, { error: 'Tanggal hapus harus setelah hari ini.' })
          const isSo = s.kind === 'so'
          if (!isSo) stmts.push(db`delete from schedules where kind = 'container' and group_id = ${clip(s.groupId)}`) // jadwal baru menggantikan yang lama
          stmts.push(
            db`insert into schedules(id, kind, group_id, row_ids, label, run_on, created_by, created_at)
               values (${randomUUID()}, ${isSo ? 'so' : 'container'}, ${isSo ? null : clip(s.groupId)}, ${isSo ? ids(s.rowIds) : null}::jsonb,
                       ${clip(s.label)}, ${s.date}, ${user.username}, ${t})`,
            logQ(db, 'jadwal', user.username, `Dijadwalkan hapus ${s.date}: ${clip(s.label)}`),
          )
        }
        if (stmts.length) await db.transaction(stmts)
        return send(res, 200, { ok: true })
      }

      case 'removeSchedule': {
        if (!role.remove) return forbid()
        const [s] = await db`select id, label, run_on from schedules where id = ${String(b.id)}`
        if (s) await db.transaction([db`delete from schedules where id = ${s.id}`, logQ(db, 'jadwal', user.username, `Jadwal dibatalkan: ${s.label} (${s.run_on})`)])
        return send(res, 200, { ok: true })
      }

      case 'setSettings': {
        if (!role.remove) return forbid()
        const p = b.patch || {}, v = {}
        if (typeof p.autoDelete === 'boolean') v.autoDelete = p.autoDelete
        if (Number.isInteger(p.months)) v.months = Math.max(1, Math.min(12, p.months))
        if (Array.isArray(p.cols)) v.cols = p.cols.slice(0, 10).filter((c) => /^x\d{1,2}$/.test(c?.key)).map((c) => ({ key: c.key, label: clip(c.label, 30) || c.key }))
        await db`insert into settings(key, value) values ('main', ${JSON.stringify(v)}::jsonb)
                 on conflict (key) do update set value = settings.value || excluded.value`
        return send(res, 200, { ok: true })
      }

      case 'removeLogs': {
        if (!role.remove) return forbid()
        await db`delete from logs where id in (select jsonb_array_elements_text(${ids(b.ids)}::jsonb))`
        return send(res, 200, { ok: true })
      }

      default: return send(res, 400, { error: 'Aksi tidak dikenal.' })
    }
  } catch (e) { fail(res, e) }
}
