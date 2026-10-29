// Tempel (paste) dari Excel / Google Sheets: pecah teks clipboard menjadi grid sel, dan baca tanggal dari berbagai penulisan.

// Teks clipboard -> baris x kolom. Sel yang berisi Enter / tab / tanda kutip dibungkus "..." oleh Excel (kutip ganda ditulis "").
export function parseGrid(text) {
  const t = String(text ?? '').replace(/\r\n?/g, '\n'), rows = [[]]
  let cell = '', q = false, i = 0
  const endCell = () => { rows[rows.length - 1].push(cell); cell = '' }
  for (; i < t.length; i++) {
    const ch = t[i]
    if (q) { if (ch === '"') { if (t[i + 1] === '"') { cell += '"'; i++ } else q = false } else cell += ch }
    else if (ch === '"' && cell === '') q = true
    else if (ch === '\t') endCell()
    else if (ch === '\n') { endCell(); rows.push([]) }
    else cell += ch
  }
  endCell()
  if (rows.length > 1 && rows[rows.length - 1].length === 1 && rows[rows.length - 1][0] === '') rows.pop() // baris kosong terakhir (clipboard selalu berakhir Enter)
  return rows
}

const BULAN = { jan: 1, januari: 1, january: 1, feb: 2, februari: 2, february: 2, mar: 3, maret: 3, march: 3, apr: 4, april: 4, mei: 5, may: 5, jun: 6, juni: 6, june: 6, jul: 7, juli: 7, july: 7, agu: 8, agt: 8, agustus: 8, aug: 8, august: 8, sep: 9, sept: 9, september: 9, okt: 10, oktober: 10, oct: 10, october: 10, nov: 11, november: 11, des: 12, desember: 12, dec: 12, december: 12 }
const valid = (y, m, d) => { const dt = new Date(Date.UTC(y, m - 1, d)); return m >= 1 && m <= 12 && dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d }
const iso = (y, m, d) => (valid(y, m, d) ? `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` : '')
const th = (y) => (y < 100 ? 2000 + y : y)

// Tanggal dari penulisan apa pun -> "YYYY-MM-DD" (format kolom kalender). Hasil '' bila tidak bisa dibaca.
// Dukung: 2026-10-25, 25/10/2026, 25-10-26, 25.10.2026 (hari dulu), 25 Okt 2026, 25 Oktober 2026, Minggu, 25 Oktober 2026, 25-Oct-2026, nomor seri Excel.
export function normDate(v) {
  let s = String(v ?? '').trim()
  if (!s) return ''
  s = s.replace(/^[A-Za-z]+,\s*/, '')                       // buang nama hari: "Minggu, 25 Oktober 2026"
  let m
  if ((m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T\s].*)?$/))) return iso(+m[1], +m[2], +m[3])
  if ((m = s.match(/^(\d{1,2})[-/.\s](\d{1,2})[-/.\s](\d{2}|\d{4})$/))) return iso(th(+m[3]), +m[2], +m[1])
  if ((m = s.match(/^(\d{1,2})[-/.\s]*([A-Za-z]+)\.?[-/.,\s]*(\d{2}|\d{4})$/)) && BULAN[m[2].toLowerCase()]) return iso(th(+m[3]), BULAN[m[2].toLowerCase()], +m[1])
  if (/^\d{5}(\.\d+)?$/.test(s) && +s > 20000 && +s < 80000) { const d = new Date(Date.UTC(1899, 11, 30) + Math.floor(+s) * 864e5); return iso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()) } // nomor seri tanggal Excel
  return ''
}

// Tentukan sel tujuan paste ala Excel. sel = rentang terpilih {r0,r1,c0,c1}; grid = hasil parseGrid.
// - satu nilai ke banyak sel terpilih -> semua sel terisi nilai itu
// - banyak nilai: mulai dari sel kiri-atas; bila pilihan kelipatan ukuran data, data diulang (tile) memenuhi pilihan
export function petaPaste(sel, grid) {
  const gh = grid.length, gw = Math.max(...grid.map((r) => r.length)), h = sel.r1 - sel.r0 + 1, w = sel.c1 - sel.c0 + 1, out = []
  if (gh === 1 && gw === 1) { for (let i = 0; i < h; i++) for (let j = 0; j < w; j++) out.push({ i: sel.r0 + i, c: sel.c0 + j, v: grid[0][0] }); return out }
  const th_ = h > gh && h % gh === 0 ? h : gh, tw = w > gw && w % gw === 0 ? w : gw
  for (let i = 0; i < th_; i++) for (let j = 0; j < tw; j++) out.push({ i: sel.r0 + i, c: sel.c0 + j, v: grid[i % gh]?.[j % gw] ?? '' })
  return out
}
