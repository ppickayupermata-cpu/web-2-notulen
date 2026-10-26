import { randomUUID, snapshot, getSql, ensureDb, verifyToken, readBody, send, fail, clip, todayTZ, logQ } from './_lib.js'

const STAGES = ['area', 'target', 'ket', 'kirim']
const INFO = ['productCode', 'productName', 'po', 'so', 'soItem', 'material', 'type', 'size', 'qty', 'uom', 'group']
const EDIT = new Set([...INFO, ...STAGES])
const ids = (a) => JSON.stringify((Array.isArray(a) ? a : []).slice(0, 5000).map(String))

// Semua perubahan data lewat sini; hanya akun PPIC yang login (token valid) yang diterima.
export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Method tidak diizinkan.' })
  const user = verifyToken(req)
  if (!user) return send(res, 401, { error: 'Sesi habis. Silakan login lagi.' })
  const b = await readBody(req)

  try {
    await ensureDb()
    const db = getSql()

    switch (b.action) {
      case 'applyChanges': { // isi sel di tabel + tag packing; tiap perubahan nilai dicatat ke riwayat sel
        const items = []
        for (const [id, ch] of Object.entries(b.changes || {})) {
          const patch = {}
          for (const [k, v] of Object.entries(ch || {})) {
            if (EDIT.has(k) || /^x\d{1,2}$/.test(k)) patch[k] = clip(v, k === 'ket' ? 300 : 80)   // KETERANGAN boleh panjang (dipakai di notulen)
            else if (k === 'packed') patch.packed = v ? new Date().toISOString() : '' // tag packing: waktu dicatat server
          }
          if (Object.keys(patch).length) items.push({ id, patch })
        }
        if (items.length) {
          const old = await db`select id, data from rows where id in (select jsonb_array_elements_text(${ids(items.map((i) => i.id))}::jsonb))`
          const before = new Map(old.map((r) => [r.id, r.data])), hist = []
          for (const it of items) {
            const d = before.get(it.id); if (!d) continue
            for (const [k, v] of Object.entries(it.patch)) { const o = String(d[k] ?? ''), n = String(v ?? ''); if (o !== n) hist.push({ row_id: it.id, col: k, old_v: o.slice(0, 300), new_v: n.slice(0, 300) }) }
          }
          const stmts = [db`update rows r set data = r.data || x.patch
                   from jsonb_to_recordset(${JSON.stringify(items)}::jsonb) as x(id text, patch jsonb) where r.id = x.id`]
          if (hist.length) stmts.push(db`insert into cell_history(row_id, col, old_v, new_v, by) select x.row_id, x.col, x.old_v, x.new_v, ${user.username}::text from jsonb_to_recordset(${JSON.stringify(hist.slice(0, 3000))}::jsonb) as x(row_id text, col text, old_v text, new_v text)`)
          await db.transaction(stmts)
        }
        return send(res, 200, { ok: true, updated: items.length })
      }
      case 'cellHistory': { // riwayat satu sel: siapa mengubah apa dan kapan (untuk tombol Kembalikan)
        const h = await db`select old_v, new_v, by, at from cell_history where row_id = ${String(b.rowId)} and col = ${String(b.key)} order by at desc, id desc limit 30`
        return send(res, 200, { history: h.map((x) => ({ old: x.old_v ?? '', new: x.new_v ?? '', by: x.by, at: x.at })) })
      }
      case 'snapshotNow': { await snapshot(db, 'manual', user.username); return send(res, 200, { ok: true }) }
      case 'dropSnapshot': { await db`delete from snapshots where id = ${String(b.id)}`; return send(res, 200, { ok: true }) }
      case 'restoreSnapshot': { // kembalikan SELURUH data ke cadangan; keadaan sekarang disimpan dulu sebagai cadangan "sebelum-pulih"
        const [sn] = await db`select id, at, payload from snapshots where id = ${String(b.id)}`
        if (!sn) return send(res, 404, { error: 'Cadangan tidak ditemukan (mungkin sudah dibuang).' })
        await snapshot(db, 'sebelum-pulih', user.username)
        const { groups = [], rows = [], schedules = [] } = sn.payload || {}
        const gids = JSON.stringify(groups.map((g) => g.id))
        await db.transaction([
          db`delete from groups where id not in (select jsonb_array_elements_text(${gids}::jsonb))`,
          db`delete from rows where group_id in (select jsonb_array_elements_text(${gids}::jsonb))`,
          db`delete from schedules`,
          db`insert into groups(id, container, buyer, packing_list_no, ship_date, status, revision, added_at)
             select x.id, x.container, x.buyer, x.packing_list_no, x.ship_date, x.status, x.revision, x.added_at
             from jsonb_to_recordset(${JSON.stringify(groups)}::jsonb) as x(id text, container text, buyer text, packing_list_no text, ship_date text, status text, revision text, added_at text)
             on conflict (id) do update set container = excluded.container, buyer = excluded.buyer, packing_list_no = excluded.packing_list_no, ship_date = excluded.ship_date, status = excluded.status, revision = excluded.revision, added_at = excluded.added_at`,
          db`insert into rows(id, group_id, data) select x.id, x.group_id, x.data from jsonb_to_recordset(${JSON.stringify(rows)}::jsonb) as x(id text, group_id text, data jsonb)`,
          db`insert into schedules(id, kind, group_id, row_ids, label, run_on, created_by, created_at)
             select x.id, x.kind, x.group_id, x.row_ids, x.label, x.run_on, x.created_by, x.created_at
             from jsonb_to_recordset(${JSON.stringify(schedules)}::jsonb) as x(id text, kind text, group_id text, row_ids jsonb, label text, run_on text, created_by text, created_at text)`,
          logQ(db, 'upload', user.username, `Pemulihan cadangan ${new Date(sn.at).toISOString().slice(0, 16).replace('T', ' ')} UTC: ${groups.length} container, ${rows.length} baris`),
        ])
        return send(res, 200, { ok: true })
      }
      case 'clientError': { // kesalahan di browser pengguna (dilaporkan otomatis) -> tampil di Riwayat
        await logQ(db, 'error', user.username, `${clip(b.message, 220)} @ ${clip(b.where, 100)} ${clip(b.stack, 150)}`.trim())
        return send(res, 200, { ok: true })
      }

      case 'updateGroup': { // edit header parent group (hanya PPIC)
        const c = clip(b.container).trim()
        if (!c) return send(res, 400, { error: 'Container tidak boleh kosong.' })
        const dup = await db`select 1 from groups where container = ${c} and id <> ${String(b.id)}`
        if (dup.length) return send(res, 400, { error: 'Nomor container sudah dipakai packing list lain.' })
        await db`update groups set container = ${c}, buyer = ${clip(b.buyer)}, packing_list_no = ${clip(b.packingListNo)}, ship_date = ${clip(b.shipDate)}, status = ${clip(b.status)} where id = ${String(b.id)}`
        return send(res, 200, { ok: true })
      }
      case 'addRows': { // tambah baris kosong di container (hanya PPIC)
        const n = Math.max(1, Math.min(50, parseInt(b.count) || 1))
        const [g] = await db`select id from groups where id = ${String(b.groupId)}`
        if (!g) return send(res, 400, { error: 'Container tidak ditemukan.' })
        const data = {}; INFO.forEach((k) => { data[k] = '' }); STAGES.forEach((k) => { data[k] = '' })
        const list = Array.from({ length: n }, () => ({ id: randomUUID(), data }))
        await db`insert into rows(id, group_id, data) select x.id, ${g.id}::text, x.data from jsonb_to_recordset(${JSON.stringify(list)}::jsonb) as x(id text, data jsonb)`
        return send(res, 200, { ok: true })
      }
      case 'mergeRows': { // upload ulang container yang sama: tambah baris baru dan/atau perbarui kolom identitas baris terpilih (isian AREA..KIRIM + tag packing dipertahankan)
        const [g] = await db`select id, container from groups where id = ${String(b.groupId)}`
        if (!g) return send(res, 400, { error: 'Container tidak ditemukan.' })
        const pick = (r) => { const d = {}; INFO.forEach((k) => { d[k] = clip(r?.[k]) }); return d }
        const ins = (Array.isArray(b.insert) ? b.insert : []).slice(0, 2000).map((r) => { const data = pick(r); STAGES.forEach((k) => { data[k] = '' }); return { id: randomUUID(), data } })
        const upd = (Array.isArray(b.update) ? b.update : []).slice(0, 2000).filter((r) => r?.id).map((r) => ({ id: String(r.id), patch: pick(r) }))
        const del = ids(b.remove)   // baris lama yang tidak ada di file baru dan dipilih untuk dihapus (hanya di container ini)
        const nDel = (Array.isArray(b.remove) ? b.remove : []).length
        if (!ins.length && !upd.length && !nDel) return send(res, 200, { ok: true, inserted: 0, updated: 0, removed: 0 })
        const stmts = []
        if (nDel) stmts.push(db`delete from rows where group_id = ${g.id} and id in (select jsonb_array_elements_text(${del}::jsonb))`)
        if (ins.length) stmts.push(db`insert into rows(id, group_id, data) select x.id, ${g.id}::text, x.data from jsonb_to_recordset(${JSON.stringify(ins)}::jsonb) as x(id text, data jsonb)`)
        if (upd.length) stmts.push(db`update rows r set data = r.data || x.patch from jsonb_to_recordset(${JSON.stringify(upd)}::jsonb) as x(id text, patch jsonb) where r.id = x.id and r.group_id = ${g.id}`)
        stmts.push(logQ(db, 'upload', user.username, `${clip(b.fileName, 120) || 'file'} — Container ${g.container}: +${ins.length} baris baru, ${upd.length} diperbarui, ${nDel} dihapus`))
        await db.transaction(stmts)
        return send(res, 200, { ok: true, inserted: ins.length, updated: upd.length, removed: nDel })
      }
      case 'restoreBackup': { // batalkan "Ganti semua": kembalikan container beserta semua isian dan tag packing dari cadangan di server
        const [bk] = await db`select id, container, payload from backups where id = ${String(b.id)}`
        if (!bk) return send(res, 404, { error: 'Cadangan tidak ditemukan (mungkin sudah dibuang).' })
        const { group: g, rows: input } = bk.payload
        const gid = randomUUID(), rows = input.map((r) => ({ id: randomUUID(), data: r.data }))
        const stmts = []
        for (const o of await db`select id from groups where container = ${bk.container}`) stmts.push(db`delete from schedules where group_id = ${o.id}`, db`delete from groups where id = ${o.id}`)
        stmts.push(
          db`insert into groups(id, container, buyer, packing_list_no, ship_date, status, revision, added_at) values (${gid}, ${bk.container}, ${clip(g.buyer)}, ${clip(g.packingListNo)}, ${clip(g.shipDate)}, ${clip(g.status)}, ${clip(g.revision)}, ${g.addedAt || todayTZ()})`,
          db`insert into rows(id, group_id, data) select x.id, ${gid}::text, x.data from jsonb_to_recordset(${JSON.stringify(rows)}::jsonb) as x(id text, data jsonb)`,
          db`delete from backups where id = ${bk.id}`,
          logQ(db, 'upload', user.username, `Pemulihan data lama: Container ${bk.container} · ${rows.length} baris`),
        )
        await db.transaction(stmts)
        return send(res, 200, { ok: true })
      }
      case 'dropBackup': {await db`delete from backups where id = ${String(b.id)}`; return send(res, 200, { ok: true }) }
      case 'addGroup': {
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
          // cadangan penuh (header + semua baris beserta isian & tag packing) sebelum diganti; disimpan 5 terakhir per container
          const [og] = await db`select container, buyer, packing_list_no, ship_date, status, revision, added_at from groups where id = ${o.id}`
          const orows = await db`select data from rows where group_id = ${o.id} order by seq`
          stmts.push(db`insert into backups(id, container, by, n, payload) values (${randomUUID()}, ${container}, ${user.username}, ${orows.length}, ${JSON.stringify({ group: { buyer: og.buyer, packingListNo: og.packing_list_no, shipDate: og.ship_date, status: og.status, revision: og.revision, addedAt: og.added_at }, rows: orows.map((x) => ({ data: x.data })) })}::jsonb)`,
            db`delete from backups where container = ${container} and id not in (select id from backups where container = ${container} order by at desc limit 5)`)
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
        const [g] = await db`select id, container, buyer, (select count(*) from rows where group_id = groups.id)::int as n from groups where id = ${String(b.id)}`
        if (g) await db.transaction([
          db`delete from schedules where group_id = ${g.id}`, db`delete from groups where id = ${g.id}`,
          logQ(db, 'hapus', user.username, `${clip(b.reason, 60) || 'Hapus manual'}: Container ${g.container} · Buyer ${g.buyer || '-'} · ${g.n} baris`),
        ])
        return send(res, 200, { ok: true })
      }

      case 'removeRows': {
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
        const [s] = await db`select id, label, run_on from schedules where id = ${String(b.id)}`
        if (s) await db.transaction([db`delete from schedules where id = ${s.id}`, logQ(db, 'jadwal', user.username, `Jadwal dibatalkan: ${s.label} (${s.run_on})`)])
        return send(res, 200, { ok: true })
      }

      case 'setSettings': {
        const p = b.patch || {}, v = {}
        if (typeof p.autoDelete === 'boolean') v.autoDelete = p.autoDelete
        if (Number.isInteger(p.months)) v.months = Math.max(1, Math.min(12, p.months))
        if (Array.isArray(p.cols)) v.cols = p.cols.slice(0, 10).filter((c) => /^x\d{1,2}$/.test(c?.key)).map((c) => ({ key: c.key, label: clip(c.label, 30) || c.key }))
        await db`insert into settings(key, value) values ('main', ${JSON.stringify(v)}::jsonb)
                 on conflict (key) do update set value = settings.value || excluded.value`
        return send(res, 200, { ok: true })
      }

      case 'removeLogs': {
        await db`delete from logs where id in (select jsonb_array_elements_text(${ids(b.ids)}::jsonb))`
        return send(res, 200, { ok: true })
      }

      default: return send(res, 400, { error: 'Aksi tidak dikenal.' })
    }
  } catch (e) { fail(res, e) }
}
