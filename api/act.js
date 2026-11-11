import { pastikanLive, randomUUID, snapshot, backupStmts, tanggalPulih, getSql, ensureDb, verifyToken, readBody, send, fail, clip, todayTZ, logQ } from './_lib.js'

const STAGES = ['area', 'target', 'ket', 'kirim']
const INFO = ['productCode', 'productName', 'po', 'so', 'soItem', 'material', 'type', 'size', 'qty', 'uom', 'group', 'no']
const kindOf = (v) => (v === 'coads' ? 'coads' : '') // jenis container: '' = biasa, 'coads' = packing list CO ADS
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
      case 'liveLink': { // ambil / buat link live container; rotate = ganti token (link lama langsung mati); enabled = nyalakan / matikan
        const gid = String(b.groupId || ''), [g] = await db`select id from groups where id = ${gid}`
        if (!g) return send(res, 404, { error: 'Container tidak ditemukan.' })
        let l = await pastikanLive(db, gid)
        if (b.rotate) { await db`update live_links set token = ${randomUUID().replace(/-/g, '').slice(0, 20)}, enabled = true where group_id = ${gid}`; l = (await db`select token, enabled from live_links where group_id = ${gid}`)[0] }
        else if (typeof b.enabled === 'boolean') { await db`update live_links set enabled = ${b.enabled} where group_id = ${gid}`; l = (await db`select token, enabled from live_links where group_id = ${gid}`)[0] }
        return send(res, 200, { token: l.token, enabled: l.enabled })
      }
      case 'livePresence': { // admin yang sedang di halaman Input: kursor + isian yang BELUM di-Submit; tampilan live menunjukkannya langsung (kedaluwarsa 20 detik tanpa denyut)
        const gid = String(b.groupId || '')
        if (b.clear) { await db`delete from live_presence where group_id = ${gid}`; return send(res, 200, { ok: true }) }
        const [g] = await db`select id from groups where id = ${gid}`
        if (!g) return send(res, 404, { error: 'Container tidak ditemukan.' })
        const draft = {}; let n = 0
        for (const [rid, ch] of Object.entries(b.draft || {})) {
          const p = {}
          for (const [k, v] of Object.entries(ch || {})) if (n < 3000 && (EDIT.has(k) || /^x\d{1,2}$/.test(k))) { p[k] = clip(v, k === 'ket' ? 300 : 80); n++ }
          if (Object.keys(p).length) draft[String(rid).slice(0, 60)] = p
        }
        await db`insert into live_presence(group_id, editor, row_id, col, editing, draft, at) values (${gid}, ${user.username}, ${b.rowId ? String(b.rowId).slice(0, 60) : null}, ${b.key ? String(b.key).slice(0, 30) : null}, ${!!b.editing}, ${JSON.stringify(draft)}::jsonb, now())
                  on conflict (group_id) do update set editor = excluded.editor, row_id = excluded.row_id, col = excluded.col, editing = excluded.editing, draft = excluded.draft, at = excluded.at`
        return send(res, 200, { ok: true })
      }
      case 'snapshotNow': { await snapshot(db, 'manual', user.username); return send(res, 200, { ok: true }) }
      case 'dropSnapshot': { await db`delete from snapshots where id = ${String(b.id)}`; return send(res, 200, { ok: true }) }
      case 'restoreSnapshot': { // kembalikan SELURUH data ke cadangan; keadaan sekarang disimpan dulu sebagai cadangan "sebelum-pulih"
        const [sn] = await db`select id, at, payload from snapshots where id = ${String(b.id)}`
        if (!sn) return send(res, 404, { error: 'Cadangan tidak ditemukan (mungkin sudah dibuang).' })
        await snapshot(db, 'sebelum-pulih', user.username)
        const payload = sn.payload || {}, t = todayTZ()
        const [st] = await db`select value from settings where key = 'main'`, cfg = { autoDelete: true, months: 1, ...(st?.value || {}) }
        // tanggal upload yang sudah lewat batas hapus otomatis dimulai lagi dari hari ini, dan jadwal hapus yang sudah jatuh tempo tidak ikut dipulihkan;
        // keduanya akan langsung menghapus data yang baru dipulihkan pada pembersihan berikutnya
        const groups = (payload.groups || []).map((g) => ({ ...g, added_at: tanggalPulih(g.added_at, cfg, t) }))
        const rows = payload.rows || [], schedules = (payload.schedules || []).filter((x) => String(x.run_on || '') > t)
        const gids = JSON.stringify(groups.map((g) => g.id))
        await db.transaction([
          db`delete from groups where id not in (select jsonb_array_elements_text(${gids}::jsonb))`,
          db`delete from rows where group_id in (select jsonb_array_elements_text(${gids}::jsonb))`,
          db`delete from schedules`,
          db`insert into groups(id, container, buyer, packing_list_no, ship_date, status, revision, added_at, kind)
             select x.id, x.container, x.buyer, x.packing_list_no, x.ship_date, x.status, x.revision, x.added_at, coalesce(x.kind, '')
             from jsonb_to_recordset(${JSON.stringify(groups)}::jsonb) as x(id text, container text, buyer text, packing_list_no text, ship_date text, status text, revision text, added_at text, kind text)
             on conflict (id) do update set container = excluded.container, buyer = excluded.buyer, packing_list_no = excluded.packing_list_no, ship_date = excluded.ship_date, status = excluded.status, revision = excluded.revision, added_at = excluded.added_at, kind = excluded.kind`,
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
        const ins = (Array.isArray(b.insert) ? b.insert : []).slice(0, 2000).map((r) => { const data = pick(r); STAGES.forEach((k) => { data[k] = '' }); data.label = 'new'; return { id: randomUUID(), data } })
        const upd = (Array.isArray(b.update) ? b.update : []).slice(0, 2000).filter((r) => r?.id).map((r) => ({ id: String(r.id), patch: pick(r) }))
        const del = ids(b.remove)   // baris lama yang tidak ada di file baru dan dipilih untuk dihapus (hanya di container ini)
        const nDel = (Array.isArray(b.remove) ? b.remove : []).length
        if (!ins.length && !upd.length && !nDel) return send(res, 200, { ok: true, inserted: 0, updated: 0, removed: 0, kept: 0 })
        const [{ n: nLama }] = await db`select count(*)::int as n from rows where group_id = ${g.id}`
        const stmts = await backupStmts(db, g.id, user.username, 'gabung') // cadangan container sebelum digabung (bisa dibatalkan dari halaman Upload)
        // semua baris yang sudah ada sebelum penggabungan ini diberi label OLD; baris yang ditambahkan sekarang berlabel NEW
        stmts.push(db`update rows set data = data || '{"label":"old"}'::jsonb where group_id = ${g.id}`)
        if (nDel) stmts.push(db`delete from rows where group_id = ${g.id} and id in (select jsonb_array_elements_text(${del}::jsonb))`)
        if (ins.length) stmts.push(db`insert into rows(id, group_id, data) select x.id, ${g.id}::text, x.data from jsonb_to_recordset(${JSON.stringify(ins)}::jsonb) as x(id text, data jsonb)`)
        if (upd.length) stmts.push(db`update rows r set data = r.data || x.patch from jsonb_to_recordset(${JSON.stringify(upd)}::jsonb) as x(id text, patch jsonb) where r.id = x.id and r.group_id = ${g.id}`)
        stmts.push(logQ(db, 'upload', user.username, `${clip(b.fileName, 120) || 'file'} — Container ${g.container}: +${ins.length} baris baru, ${upd.length} diperbarui, ${nDel} dihapus`))
        await db.transaction(stmts)
        return send(res, 200, { ok: true, inserted: ins.length, updated: upd.length, removed: nDel, kept: Math.max(0, nLama - nDel) })
      }
      case 'backupInfo': { // isi lengkap satu cadangan container (baris + header) untuk halaman Data Pulihan dan kartu info
        const [bk] = await db`select id, container, at, by, n, kind, payload from backups where id = ${String(b.id)}`
        if (!bk) return send(res, 404, { error: 'Cadangan tidak ditemukan (mungkin sudah dibuang).' })
        const { group = {}, rows = [] } = bk.payload || {}
        return send(res, 200, { id: bk.id, container: bk.container, at: bk.at, by: bk.by, kind: bk.kind, group, rows: rows.slice(0, 5000).map((r) => r.data || {}) })
      }
      case 'snapshotInfo': { // ringkasan cadangan penuh: tiap container beserta jumlah baris, isian, dan tag packing
        const [sn] = await db`select id, at, kind, by, payload from snapshots where id = ${String(b.id)}`
        if (!sn) return send(res, 404, { error: 'Cadangan tidak ditemukan (mungkin sudah dibuang).' })
        const { groups = [], rows = [], schedules = [] } = sn.payload || {}
        const per = new Map(groups.map((g) => [g.id, { n: 0, packed: 0, isi: 0 }]))
        for (const r of rows) { const c = per.get(r.group_id); if (!c) continue; const d = r.data || {}; c.n++; if (d.packed) c.packed++; if (['area', 'target', 'ket', 'kirim'].some((k) => String(d[k] ?? '').trim())) c.isi++ }
        return send(res, 200, { id: sn.id, at: sn.at, kind: sn.kind, by: sn.by, jadwal: schedules.length,
          groups: groups.map((g) => ({ container: g.container, buyer: g.buyer, packingListNo: g.packing_list_no, shipDate: g.ship_date, status: g.status, addedAt: g.added_at, ...per.get(g.id) })) })
      }
      case 'finishRows': { // pindahkan baris terpilih (mis. satu SO) dari Monitoring ke daftar Barang Jadi
        const [g] = await db`select id, container, buyer, packing_list_no, ship_date, status, revision, added_at, kind from groups where id = ${String(b.groupId)}`
        if (!g) return send(res, 404, { error: 'Container tidak ditemukan.' })
        const want = JSON.stringify([...new Set((Array.isArray(b.ids) ? b.ids : []).map(String))].slice(0, 5000))
        const hit = await db`select id from rows where group_id = ${g.id} and id in (select jsonb_array_elements_text(${want}::jsonb))`
        if (!hit.length) return send(res, 400, { error: 'Tidak ada baris yang bisa dipindahkan.' })
        const list = JSON.stringify(hit.map((x) => x.id))
        const [{ n: sisa }] = await db`select count(*)::int as n from rows where group_id = ${g.id} and id not in (select jsonb_array_elements_text(${list}::jsonb))`
        await db.transaction([
          ...await backupStmts(db, g.id, user.username, 'pindah'),   // bisa dikembalikan dari Barang Jadi atau Data Pulihan
          db`insert into finished_groups(container, buyer, packing_list_no, ship_date, status, revision, kind, added_at) values (${g.container}, ${g.buyer}, ${g.packing_list_no}, ${g.ship_date}, ${g.status}, ${g.revision}, ${kindOf(g.kind)}, ${g.added_at})
             on conflict (container) do update set buyer = excluded.buyer, packing_list_no = excluded.packing_list_no, ship_date = excluded.ship_date, status = excluded.status, revision = excluded.revision, kind = excluded.kind, updated_at = now()`,
          db`insert into finished_rows(id, container, so, data, moved_by) select r.id, ${g.container}::text, coalesce(r.data->>'so', ''), r.data, ${user.username}::text from rows r
             where r.group_id = ${g.id} and r.id in (select jsonb_array_elements_text(${list}::jsonb))
             on conflict (id) do update set container = excluded.container, so = excluded.so, data = excluded.data, moved_at = now(), moved_by = excluded.moved_by`,
          db`delete from rows where group_id = ${g.id} and id in (select jsonb_array_elements_text(${list}::jsonb))`,
          db`delete from groups where id = ${g.id} and not exists (select 1 from rows where group_id = ${g.id})`,
          logQ(db, 'barang', user.username, `Pindah ke Barang Jadi: Container ${g.container} · ${hit.length} baris${sisa ? '' : ' (container kosong, dihapus dari Monitoring)'}`),
        ])
        return send(res, 200, { ok: true, moved: hit.length, emptied: !sisa })
      }
      case 'unfinishRows': { // kembalikan baris Barang Jadi ke Monitoring (container dibuat lagi bila sudah tidak ada)
        const container = String(b.container || '')
        const [fg] = await db`select container, buyer, packing_list_no, ship_date, status, revision, kind from finished_groups where container = ${container}`
        if (!fg) return send(res, 404, { error: 'Container tidak ada di Barang Jadi.' })
        const want = JSON.stringify([...new Set((Array.isArray(b.ids) ? b.ids : []).map(String))].slice(0, 5000))
        const hit = await db`select id from finished_rows where container = ${container} and id in (select jsonb_array_elements_text(${want}::jsonb))`
        if (!hit.length) return send(res, 400, { error: 'Tidak ada baris yang bisa dikembalikan.' })
        const list = JSON.stringify(hit.map((x) => x.id))
        const [live] = await db`select id from groups where container = ${container}`
        const gid = live?.id || randomUUID(), stmts = []
        if (!live) stmts.push(db`insert into groups(id, container, buyer, packing_list_no, ship_date, status, revision, added_at, kind) values (${gid}, ${container}, ${fg.buyer}, ${fg.packing_list_no}, ${fg.ship_date}, ${fg.status}, ${fg.revision}, ${todayTZ()}, ${kindOf(fg.kind)})`)
        else stmts.push(...await backupStmts(db, gid, user.username, 'gabung'))
        stmts.push(
          db`insert into rows(id, group_id, data) select f.id, ${gid}::text, f.data from finished_rows f where f.container = ${container} and f.id in (select jsonb_array_elements_text(${list}::jsonb)) on conflict (id) do nothing`,
          db`delete from finished_rows f where f.container = ${container} and f.id in (select jsonb_array_elements_text(${list}::jsonb)) and exists (select 1 from rows r where r.id = f.id and r.group_id = ${gid})`,
          db`delete from finished_groups g where g.container = ${container} and not exists (select 1 from finished_rows f where f.container = g.container)`,
          logQ(db, 'barang', user.username, `Kembali dari Barang Jadi: Container ${container} · ${hit.length} baris`),
        )
        await db.transaction(stmts)
        return send(res, 200, { ok: true, restored: hit.length, recreated: !live })
      }
      case 'finishedRows': { // isi satu container di Barang Jadi (untuk tabel lihat-saja)
        const container = String(b.container || '')
        const [fg] = await db`select container, buyer, packing_list_no, ship_date, status, revision, kind from finished_groups where container = ${container}`
        if (!fg) return send(res, 404, { error: 'Container tidak ada di Barang Jadi.' })
        const r = await db`select id, data, moved_at, moved_by from finished_rows where container = ${container} order by seq limit 5000`
        return send(res, 200, { group: { container: fg.container, buyer: fg.buyer || '', packingListNo: fg.packing_list_no || '', shipDate: fg.ship_date || '', status: fg.status || '', revision: fg.revision || '', kind: fg.kind || '' }, rows: r.map((x) => ({ ...x.data, id: x.id, movedAt: x.moved_at, movedBy: x.moved_by })) })
      }
      case 'clearLabels': { // hapus label old / new di satu container
        const gid = String(b.groupId || '')
        await db`update rows set data = data - 'label' where group_id = ${gid}`
        return send(res, 200, { ok: true })
      }
      case 'moveRows': { // masukkan data lama ke container baru: isi baris yang cocok (fill) dan/atau tambah baris yang belum ada (insert); rencana disusun di browser
        const [from] = await db`select id, container from groups where id = ${String(b.fromId)}`
        const [to] = await db`select id, container from groups where id = ${String(b.toId)}`
        if (!from || !to || from.id === to.id) return send(res, 400, { error: 'Container asal atau tujuan tidak valid.' })
        const okKey = (k) => EDIT.has(k) || /^x\d{1,2}$/.test(k)
        const clean = (o) => { const d = {}; for (const [k, v] of Object.entries(o || {})) if (okKey(k)) d[k] = clip(v, k === 'ket' ? 300 : 80); else if (k === 'packed') d.packed = clip(v, 40); return d }
        const ins = (Array.isArray(b.insert) ? b.insert : []).slice(0, 3000).map((r) => { const data = clean(r); INFO.concat(STAGES).forEach((k) => { data[k] ??= '' }); data.label = 'old'; return { id: randomUUID(), data } })
        const fill = (Array.isArray(b.fill) ? b.fill : []).slice(0, 3000).filter((r) => r?.id).map((r) => ({ id: String(r.id), patch: clean(r.patch) })).filter((r) => Object.keys(r.patch).length)
        const rem = (Array.isArray(b.removeFrom) ? b.removeFrom : []).map(String)
        if (!ins.length && !fill.length && !rem.length) return send(res, 200, { ok: true, inserted: 0, filled: 0, removed: 0 })
        const stmts = [...await backupStmts(db, to.id, user.username, 'gabung'), ...(rem.length ? await backupStmts(db, from.id, user.username, 'hapus') : [])]
        stmts.push(db`update rows set data = data || '{"label":"new"}'::jsonb where group_id = ${to.id}`)   // isi container tujuan sebelum ini = NEW
        if (ins.length) stmts.push(db`insert into rows(id, group_id, data) select x.id, ${to.id}::text, x.data from jsonb_to_recordset(${JSON.stringify(ins)}::jsonb) as x(id text, data jsonb)`)
        if (fill.length) stmts.push(db`update rows r set data = r.data || x.patch from jsonb_to_recordset(${JSON.stringify(fill)}::jsonb) as x(id text, patch jsonb) where r.id = x.id and r.group_id = ${to.id}`)
        if (rem.length) stmts.push(db`delete from rows where group_id = ${from.id} and id in (select jsonb_array_elements_text(${JSON.stringify(rem)}::jsonb))`)
        stmts.push(logQ(db, 'upload', user.username, `Data lama Container ${from.container} → Container ${to.container}: +${ins.length} baris (old), ${fill.length} baris diisi${rem.length ? `, ${rem.length} dihapus dari container lama` : ''}`))
        await db.transaction(stmts)
        return send(res, 200, { ok: true, inserted: ins.length, filled: fill.length, removed: rem.length })
      }
      case 'restoreBackup': { // kembalikan container dari cadangan di server. Isi container sekarang dicadangkan dulu; cadangan yang dipakai TIDAK dibuang.
        const [bk] = await db`select id, container, payload from backups where id = ${String(b.id)}`
        if (!bk) return send(res, 404, { error: 'Cadangan tidak ditemukan (mungkin sudah dibuang).' })
        const { group: g = {}, rows: input = [] } = bk.payload || {}
        if (!input.length) return send(res, 400, { error: 'Cadangan ini kosong, tidak ada yang bisa dipulihkan.' })
        const [st] = await db`select value from settings where key = 'main'`, cfg = { autoDelete: true, months: 1, ...(st?.value || {}) }
        const gid = randomUUID(), rows = input.map((r) => ({ id: randomUUID(), data: r.data }))
        const stmts = []
        for (const o of await db`select id from groups where container = ${bk.container}`) {
          stmts.push(...await backupStmts(db, o.id, user.username, 'sebelum-pulih'))   // data yang sedang tampil tidak hilang tanpa jejak
          stmts.push(db`delete from schedules where group_id = ${o.id}`, db`delete from groups where id = ${o.id}`)
        }
        stmts.push(
          db`insert into groups(id, container, buyer, packing_list_no, ship_date, status, revision, added_at, kind) values (${gid}, ${bk.container}, ${clip(g.buyer)}, ${clip(g.packingListNo)}, ${clip(g.shipDate)}, ${clip(g.status)}, ${clip(g.revision)}, ${tanggalPulih(g.addedAt, cfg, todayTZ())}, ${kindOf(g.kind)})`,
          db`insert into rows(id, group_id, data) select x.id, ${gid}::text, x.data from jsonb_to_recordset(${JSON.stringify(rows)}::jsonb) as x(id text, data jsonb)`,
          logQ(db, 'upload', user.username, `Pemulihan data: Container ${bk.container} · ${rows.length} baris`),
        )
        await db.transaction(stmts)
        return send(res, 200, { ok: true, container: bk.container, rows: rows.length })
      }
      case 'dropBackup': {await db`delete from backups where id = ${String(b.id)}`; return send(res, 200, { ok: true }) }
      case 'addGroup': {
        const g = b.group || {}, input = Array.isArray(b.rows) ? b.rows : []
        const container = clip(g.container, 60).trim()
        if (!container || !input.length) return send(res, 400, { error: 'Container atau isi packing list kosong.' })
        if (b.mode === 'baru' && (await db`select 1 from groups where container = ${container}`).length) return send(res, 400, { error: `Nomor container ${container} sudah dipakai. Isi nama container baru yang berbeda.` })
        const gid = randomUUID()
        const rows = input.map((r) => {
          const data = {}
          INFO.forEach((k) => { data[k] = clip(r[k]) })
          STAGES.forEach((k) => { data[k] = '' }) // kolom input selalu mulai kosong
          return { id: randomUUID(), data }
        })
        const stmts = []
        const old = await db`select id from groups where container = ${container}`
        for (const o of old) {   // cadangan penuh (header + semua baris beserta isian & tag packing) sebelum diganti
          stmts.push(...await backupStmts(db, o.id, user.username, 'ganti'))
          stmts.push(db`delete from schedules where group_id = ${o.id}`, db`delete from groups where id = ${o.id}`,
            logQ(db, 'hapus', user.username, `Diganti upload baru: Container ${container}`))
        }
        stmts.push(
          db`insert into groups(id, container, buyer, packing_list_no, ship_date, status, revision, added_at, kind)
             values (${gid}, ${container}, ${clip(g.buyer)}, ${clip(g.packingListNo)}, ${clip(g.shipDate)}, ${clip(g.status)}, ${clip(g.revision)}, ${todayTZ()}, ${kindOf(g.kind)})`,
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
          ...await backupStmts(db, g.id, user.username, 'hapus'),   // bisa dipulihkan dari halaman Upload Excel / Cadangan
          db`delete from schedules where group_id = ${g.id}`, db`delete from groups where id = ${g.id}`,
          logQ(db, 'hapus', user.username, `${clip(b.reason, 60) || 'Hapus manual'}: Container ${g.container} · Buyer ${g.buyer || '-'} · ${g.n} baris`),
        ])
        return send(res, 200, { ok: true })
      }

      case 'removeRows': {
        const list = ids(b.ids)
        const gone = await db`select distinct data->>'so' as so from rows where id in (select jsonb_array_elements_text(${list}::jsonb))`
        const [c] = await db`select count(*)::int as n from rows where id in (select jsonb_array_elements_text(${list}::jsonb))`
        const hit = c.n ? await db`select distinct group_id from rows where id in (select jsonb_array_elements_text(${list}::jsonb))` : []
        const bk = []; for (const h of hit) bk.push(...await backupStmts(db, h.group_id, user.username, 'hapus'))
        if (c.n) await db.transaction([
          ...bk,
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
