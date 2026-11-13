// Helper server (file berawalan _ tidak dijadikan endpoint oleh Vercel)
import { neon } from '@neondatabase/serverless'
import { createHmac, timingSafeEqual, randomUUID } from 'node:crypto'
export { randomUUID }
export { tanggalPulih } from './_pulih.js'
import { containerDari } from './_teks.js'
export { containerDari }
export class PublicError extends Error {}

// ---------- database ----------
let _sql = null
export const setSql = (s) => { _sql = s } // dipakai untuk pengujian
export function getSql() {
  if (_sql) return _sql
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL
  if (!url) throw new PublicError('DATABASE_URL belum diatur di server.')
  return (_sql = neon(url))
}

let ready = null
export function ensureDb() {
  if (!ready) {
    const db = getSql()
    ready = db.transaction([
      db`create table if not exists groups (seq bigserial, id text primary key, container text not null unique,
          buyer text default '', packing_list_no text default '', ship_date text default '', status text default '',
          revision text default '', added_at text not null)`,
      db`create table if not exists rows (seq bigserial, id text primary key,
          group_id text not null references groups(id) on delete cascade, data jsonb not null)`,
      db`create index if not exists rows_group_idx on rows(group_id)`,
      db`create table if not exists schedules (id text primary key, kind text not null, group_id text, row_ids jsonb,
          label text, run_on text not null, created_by text, created_at text)`,
      db`create table if not exists logs (id text primary key, at timestamptz not null default now(),
          type text, actor text, detail text)`,
      db`create table if not exists settings (key text primary key, value jsonb not null)`,
      db`create table if not exists backups (seq bigserial, id text primary key, container text not null, at timestamptz not null default now(), by text, n int not null default 0, payload jsonb not null)`,
      db`create table if not exists live_links (group_id text primary key references groups(id) on delete cascade, token text not null unique, enabled boolean not null default true, created_at timestamptz not null default now())`,
      db`create table if not exists live_presence (group_id text primary key references groups(id) on delete cascade, editor text, row_id text, col text, editing boolean not null default false, draft jsonb not null default '{}'::jsonb, at timestamptz not null default now())`,
      db`create table if not exists snapshots (seq bigserial, id text primary key, at timestamptz not null default now(), kind text not null, by text, n_groups int not null default 0, n_rows int not null default 0, payload jsonb not null)`,
      db`create table if not exists cell_history (id bigserial primary key, row_id text not null, col text not null, old_v text, new_v text, by text, at timestamptz not null default now())`,
      db`create index if not exists cell_history_idx on cell_history(row_id, col, at desc)`,
      db`create table if not exists absen_rooms (id text primary key, group_id text references groups(id) on delete cascade,
          title text default '', created_by text, created_at timestamptz not null default now(), closed boolean not null default false)`,
      db`create table if not exists absen_log (seq bigserial, id text primary key, room_id text not null references absen_rooms(id) on delete cascade,
          nama text not null, bagian text not null, k text not null, at timestamptz not null default now(), unique (room_id, k))`,
      db`create table if not exists meetings (id text primary key, nama text not null default '', status text not null default 'berjalan', room_id text references absen_rooms(id) on delete set null, started_at timestamptz not null default now(), ended_at timestamptz, started_by text not null default '', auto_confirm boolean not null default false)`,
      db`create table if not exists live_global (id text primary key, token text not null unique, enabled boolean not null default true, last_group_id text, last_at timestamptz, created_at timestamptz not null default now())`,
      db`alter table logs add column if not exists container text`,
      db`update logs set container = coalesce((regexp_match(detail, 'Container (.+?)(?: · | → |: |, | [(]|$)'))[1], '') where container is null`,
      db`delete from backups where kind = 'pindah'`,
      db`delete from backups b where exists (select 1 from logs l where l.type = 'barang' and l.container = b.container and abs(extract(epoch from (l.at - b.at))) < 5)`,
      db`alter table backups add column if not exists kind text not null default 'ganti'`,
      db`alter table groups add column if not exists kind text not null default ''`,
      db`create table if not exists finished_groups (container text primary key, buyer text, packing_list_no text, ship_date text, status text, revision text, kind text not null default '', added_at text, updated_at timestamptz not null default now())`,
      db`create table if not exists finished_rows (seq bigserial, id text primary key, container text not null references finished_groups(container) on delete cascade, so text not null default '', data jsonb not null, moved_at timestamptz not null default now(), moved_by text not null default '')`,
      db`create index if not exists finished_rows_container_idx on finished_rows(container)`,
      db`alter table absen_log add column if not exists confirmed boolean not null default false`,
      db`alter table absen_log add column if not exists confirmed_at timestamptz`,
    ]).catch((e) => { ready = null; throw e })
  }
  return ready
}

// Cadangan satu container (header + semua baris beserta isian & tag packing). Dipanggil SEBELUM aksi yang menghapus / menimpa data.
// kind: ganti | hapus | gabung | sebelum-pulih. Disimpan 8 terakhir per container.
export async function backupStmts(db, gid, by, kind) {
  const [g] = await db`select container, buyer, packing_list_no, ship_date, status, revision, added_at, kind from groups where id = ${gid}`
  if (!g) return []
  const rows = await db`select data from rows where group_id = ${gid} order by seq`
  if (!rows.length) return []
  const payload = { group: { buyer: g.buyer, packingListNo: g.packing_list_no, shipDate: g.ship_date, status: g.status, revision: g.revision, addedAt: g.added_at, kind: g.kind || '' }, rows: rows.map((x) => ({ data: x.data })) }
  return [
    db`insert into backups(id, container, by, n, kind, payload) values (${randomUUID()}, ${g.container}, ${by}, ${rows.length}, ${kind}, ${JSON.stringify(payload)}::jsonb)`,
    db`delete from backups where container = ${g.container} and id not in (select id from backups where container = ${g.container} order by at desc limit 8)`,
  ]
}
export const clip = (v, n = 200) => String(v ?? '').slice(0, n)
export const todayTZ = () => new Date().toLocaleDateString('sv-SE', { timeZone: process.env.APP_TZ || 'Asia/Jakarta' })
export const logQ = (db, type, by, detail, container) =>
  db`insert into logs(id, type, actor, detail, container) values (${randomUUID()}, ${type}, ${by}, ${clip(detail, 500)}, ${container ?? containerDari(detail)})`

// ---------- http ----------
export const send = (res, code, obj) => { res.statusCode = code; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(obj)) }
export async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body
  let s = ''
  for await (const c of req) s += c
  try { return JSON.parse(s) } catch { return {} }
}
export function fail(res, e) {
  if (e instanceof PublicError) return send(res, 500, { error: e.message })
  console.error(e)
  send(res, 500, { error: 'Terjadi kesalahan di server.' })
}

// ---------- login token (ditandatangani HMAC, berlaku 12 jam) ----------
const secret = () => process.env.AUTH_SECRET || ''
const mac = (b) => createHmac('sha256', secret()).update(b).digest('base64url')
const same = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && timingSafeEqual(x, y) }

export function signToken(user) {
  if (!secret()) throw new PublicError('AUTH_SECRET belum diatur di server.')
  const b = Buffer.from(JSON.stringify({ username: user.username, exp: Date.now() + 12 * 3600e3 })).toString('base64url')
  return `${b}.${mac(b)}`
}
export function verifyToken(req) {
  const h = req.headers?.authorization || ''
  const [b, s] = (h.startsWith('Bearer ') ? h.slice(7) : '').split('.')
  if (!b || !s || !secret() || !same(s, mac(b))) return null
  try {
    const p = JSON.parse(Buffer.from(b, 'base64url').toString())
    return p.exp > Date.now() ? p : null
  } catch { return null }
}

// ---------- baca semua data ----------
export async function loadAll() {
  const db = getSql()
  const [g, r, s, l, st, bk, sn, fin] = await Promise.all([
    db`select id, container, buyer, packing_list_no, ship_date, status, revision, added_at, kind from groups order by seq`,
    db`select id, group_id, data from rows order by seq`,
    db`select id, kind, group_id, row_ids, label, run_on, created_by, created_at from schedules order by run_on`,
    db`select id, at, type, actor, detail, container from logs order by at desc limit 500`,
    db`select value from settings where key = 'main'`,
    db`select id, container, at, by, n, kind, payload->'group' as g from backups b where kind <> 'pindah' and not exists (select 1 from logs l where l.type = 'barang' and l.container = b.container and abs(extract(epoch from (l.at - b.at))) < 5) order by at desc limit 30`,
    db`select id, at, kind, by, n_groups, n_rows from snapshots order by at desc limit 20`,
    db`select g.container, g.buyer, g.packing_list_no, g.ship_date, g.status, g.revision, g.kind, count(r.id)::int as n, count(distinct r.so)::int as so_n, max(r.moved_at) as moved_at
       from finished_groups g left join finished_rows r on r.container = g.container group by g.container order by max(r.moved_at) desc nulls last`,
  ])
  return {
    groups: g.map((x) => ({ id: x.id, container: x.container, buyer: x.buyer, packingListNo: x.packing_list_no, shipDate: x.ship_date, status: x.status, revision: x.revision, addedAt: x.added_at, kind: x.kind || '' })),
    rows: r.map((x) => ({ ...x.data, id: x.id, groupId: x.group_id })),
    schedules: s.map((x) => ({ id: x.id, kind: x.kind, groupId: x.group_id, rowIds: x.row_ids || [], label: x.label, date: x.run_on, by: x.created_by, createdAt: x.created_at })),
    logs: l.map((x) => ({ id: x.id, at: x.at, type: x.type, by: x.actor, detail: x.detail, container: x.container || '' })),
    settings: { autoDelete: true, months: 1, ...(st[0]?.value || {}) },
    backups: bk.map((x) => ({ id: x.id, container: x.container, at: x.at, by: x.by, count: x.n, kind: x.kind, group: x.g || {} })),
    snapshots: sn.map((x) => ({ id: x.id, at: x.at, kind: x.kind, by: x.by, groups: x.n_groups, rows: x.n_rows })), // cadangan penuh database (isi tidak ikut dikirim)
    // daftar Barang Jadi per container (isi baris diambil saat dibuka lewat aksi finishedRows)
    finished: fin.map((x) => ({ container: x.container, buyer: x.buyer || '', packingListNo: x.packing_list_no || '', shipDate: x.ship_date || '', status: x.status || '', revision: x.revision || '', kind: x.kind || '', count: x.n, soCount: x.so_n, movedAt: x.moved_at })),
    // cadangan sebelum "Ganti semua" (isi tidak ikut dikirim)
  }
}

// satu link live untuk MEETING: menampilkan container yang sedang dibuka host (berpindah otomatis); dibuat bila belum ada
export async function pastikanLiveGlobal(db) {
  const [l] = await db`select token, enabled from live_global where id = 'main'`
  if (l) return l
  const token = randomUUID().replace(/-/g, '').slice(0, 20)
  await db`insert into live_global(id, token) values ('main', ${token}) on conflict (id) do nothing`
  const [n] = await db`select token, enabled from live_global where id = 'main'`
  return n
}
// token live read-only untuk satu container; dibuat bila belum ada (dipakai saat admin mengkonfirmasi absen)
export async function pastikanLive(db, groupId) {
  const [l] = await db`select token, enabled from live_links where group_id = ${groupId}`
  if (l) return l
  const token = randomUUID().replace(/-/g, '').slice(0, 20)
  await db`insert into live_links(group_id, token) values (${groupId}, ${token}) on conflict (group_id) do nothing`
  const [n] = await db`select token, enabled from live_links where group_id = ${groupId}`
  return n
}

// ---------- cadangan penuh (snapshot) ----------
// Seluruh container, baris (beserta isian & tag packing), jadwal, dan pengaturan. Disimpan 14 terakhir di database yang sama.
export async function snapshot(db, kind = 'harian', by = 'Sistem') {
  const [g, r, s, st] = await Promise.all([
    db`select id, container, buyer, packing_list_no, ship_date, status, revision, added_at, kind from groups order by seq`,
    db`select id, group_id, data from rows order by seq`,
    db`select id, kind, group_id, row_ids, label, run_on, created_by, created_at from schedules order by run_on`,
    db`select value from settings where key = 'main'`,
  ])
  if (!g.length && kind === 'harian') return null // belum ada data: tidak perlu cadangan harian
  const id = randomUUID()
  await db.transaction([
    db`insert into snapshots(id, kind, by, n_groups, n_rows, payload) values (${id}, ${kind}, ${by}, ${g.length}, ${r.length}, ${JSON.stringify({ groups: g, rows: r, schedules: s, settings: st[0]?.value || {} })}::jsonb)`,
    db`delete from snapshots where id not in (select id from snapshots order by at desc limit 14)`,
  ])
  return id
}
export async function snapshotIfDue(db, hours = 20) {
  const [l] = await db`select at from snapshots where kind = 'harian' order by at desc limit 1`
  if (l && Date.now() - new Date(l.at).getTime() < hours * 3600e3) return null
  return snapshot(db, 'harian')
}

// ---------- pembersihan: jadwal hapus jatuh tempo + hapus otomatis data lama ----------
let lastSweep = 0
export const sweepIfDue = () => (Date.now() - lastSweep > 10 * 60 * 1000 ? sweep() : null)

export async function sweep() {
  const db = getSql()
  lastSweep = Date.now()
  const t = todayTZ()
  const stmts = []
  await snapshotIfDue(db) // cadangan harian SEBELUM data lama dibersihkan

  const due = await db`select * from schedules where run_on <= ${t}`
  for (const s of due) {
    if (s.kind === 'container') {
      const [g] = await db`select id, container, buyer from groups where id = ${s.group_id}`
      if (g) stmts.push(...await backupStmts(db, g.id, 'Sistem', 'hapus'), db`delete from groups where id = ${g.id}`, logQ(db, 'hapus', 'Sistem', `Hapus terjadwal (${s.run_on}): ${s.label} · Buyer ${g.buyer || '-'}`))
    } else {
      const ids = JSON.stringify(s.row_ids || [])
      const [c] = await db`select count(*)::int as n from rows where id in (select jsonb_array_elements_text(${ids}::jsonb))`
      if (c.n) stmts.push(db`delete from rows where id in (select jsonb_array_elements_text(${ids}::jsonb))`, logQ(db, 'hapus', 'Sistem', `Hapus terjadwal (${s.run_on}): ${s.label} · ${c.n} baris`))
    }
  }
  if (due.length) stmts.push(db`delete from schedules where run_on <= ${t}`)

  const [st] = await db`select value from settings where key = 'main'`
  const cfg = { autoDelete: true, months: 1, ...(st?.value || {}) }
  if (cfg.autoDelete) {
    // container yang punya jadwal sendiri dikecualikan
    const old = await db`select g.id, g.container, g.buyer, (select count(*) from rows r where r.group_id = g.id)::int as n
      from groups g where g.added_at::date + make_interval(months => ${cfg.months}) <= ${t}::date
      and not exists (select 1 from schedules s where s.kind = 'container' and s.group_id = g.id)`
    for (const g of old) {
      stmts.push(...await backupStmts(db, g.id, 'Sistem', 'hapus'), db`delete from groups where id = ${g.id}`,
        logQ(db, 'hapus', 'Sistem', `Hapus otomatis (lebih dari ${cfg.months} bulan): Container ${g.container} · Buyer ${g.buyer || '-'} · ${g.n} baris`))
    }
  }
  stmts.push(
    db`delete from cell_history where at < now() - interval '90 days'`,
    db`delete from cell_history h where not exists (select 1 from rows r where r.id = h.row_id) and not exists (select 1 from finished_rows f where f.id = h.row_id)`,
    db`delete from groups g where not exists (select 1 from rows r where r.group_id = g.id)`,
    db`delete from schedules s where s.kind = 'container' and not exists (select 1 from groups g where g.id = s.group_id)`,
    db`delete from schedules s where s.kind = 'so' and not exists
        (select 1 from jsonb_array_elements_text(s.row_ids) e(id) join rows r on r.id = e.id)`,
  )
  await db.transaction(stmts)
}
