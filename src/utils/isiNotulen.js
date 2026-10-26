// Seluruh halaman notulen sebagai TEKS BEBAS (diedit langsung di preview seperti halaman Word), lalu diubah ke blok untuk Word.
// Aturan teks:
//   baris pertama diawali "NOTULEN" = judul (masuk header halaman Word)
//   "Hari,Tanggal : ..", "Tempat : ..", "Jam : ..", "Peserta :" = baris keterangan (tab sejajar seperti file contoh)
//   bullet di bawah "Peserta :" = daftar peserta (sampai ada teks lain atau dua baris kosong)
//   "• " atau "- " = bullet; spasi di depan 2+ = bullet tingkat 2; "*" di depan = judul tebal
//   "NOTE : .." = catatan merah; baris kosong = jarak; selain itu = paragraf biasa
export const BUL = '• '

// Satu SO = satu daftar: baris pertama "• SO, catatan" (bullet tingkat 1), catatan berikutnya di SO yang sama "  • catatan" (tingkat 2).
const barisSO = (list) => {
  const m = new Map(); list.forEach((i) => m.set(i.so || '', [...(m.get(i.so || '') || []), i]))
  return [...m].map(([so, g]) => g.flatMap((i) => i.segs ?? [i.t]).map((x, n) => (n === 0 ? BUL + (so ? so + ', ' : '') + x : '  ' + BUL + x)))
}
// Teks baris yang tampil di halaman (tanpa bullet) untuk kelompok yang sudah dipacking: dipakai memberi warna hijau di preview dan Word.
export const teksBaris = (list) => barisSO(list).flat().map((l) => l.replace(/^\s*•\s+/, ''))

// Isi catatan dari tabel: tiap SO satu blok baris, antar SO diberi baris kosong; yang sudah dipacking di bagian bawah.
export function susun(items, heading) {
  const a = barisSO(items.filter((i) => !i.selesai)), b = barisSO(items.filter((i) => i.selesai))
  return [...(heading ? ['*' + heading, ''] : []), [...a, ...b].map((g) => g.join('\n')).join('\n\n')].join('\n').trimEnd()
}

// Satu halaman penuh: judul, keterangan meeting, peserta, catatan per SO, NOTE.
export function susunDokumen({ judul, hari, tempat, jam, hadir, items, heading, note }) {
  return [judul, `Hari,Tanggal : ${hari}`, `Tempat : ${tempat}`, `Jam : ${jam}`, 'Peserta :', '', ...hadir.map((h) => BUL + h), '', '', susun(items, heading), '', `NOTE : ${note}`].join('\n')
}

// Ganti daftar peserta di teks (mis. setelah ada yang absen lewat QR) tanpa mengubah bagian lain.
export function gantiPeserta(text, hadir) {
  const L = String(text ?? '').split('\n'), i = L.findIndex((l) => /^\s*Peserta\s*:/i.test(l))
  if (i < 0) return text
  let j = i + 1, kosong = 0
  while (j < L.length) { const l = L[j]; if (!l.trim()) { if (++kosong >= 2) break } else if (/^\s*(•|-|–)\s/.test(l)) kosong = 0; else break; j++ }
  while (j > i + 1 && !L[j - 1].trim()) j--      // sisakan baris kosong penutup
  return [...L.slice(0, i + 1), '', ...hadir.map((h) => BUL + h), ...L.slice(j)].join('\n')
}

// Teks -> blok { type: 'title'|'info'|'head'|'bullet'|'text'|'note'|'blank', ... }. done = teks baris yang sudah dipacking (diberi warna).
export function parseIsi(text, done = new Set(), warna = '00B050') {
  let peserta = false, kosong = 0, awal = true
  const out = String(text ?? '').replace(/\r/g, '').split('\n').map((raw) => {
    const ln = raw.replace(/\s+$/, '')
    if (!ln.trim()) { if (++kosong >= 2) peserta = false; return { type: 'blank' } }
    kosong = 0
    if (awal) { awal = false; if (/^\s*NOTULEN\b/i.test(ln)) return { type: 'title', t: ln.trim() } }
    const inf = ln.match(/^\s*(Hari\s*,\s*Tanggal|Tempat|Jam|Peserta)\s*:\s*(.*)$/i)
    if (inf) { peserta = /^peserta/i.test(inf[1]); return { type: 'info', label: inf[1].replace(/\s+/g, ''), v: inf[2].trim() } }
    if (/^\s*NOTE\s*:/i.test(ln)) { peserta = false; return { type: 'note', t: ln.trim() } }
    const h = ln.match(/^\s*\*\s*(.*)$/); if (h) { peserta = false; return { type: 'head', t: h[1] } }
    const b = ln.match(/^(\s*)(?:•|-|–)\s+(.*)$/)
    if (b && peserta) return { type: 'peserta', t: b[2].trim() }
    peserta = false
    const t = b ? b[2] : ln.trim(), color = done.has(t) ? warna : ''
    return b ? { type: 'bullet', t, lvl: b[1].replace(/\t/g, '  ').length >= 2 ? 1 : 0, color } : { type: 'text', t, color }
  })
  while (out.length && out[out.length - 1].type === 'blank') out.pop()
  return out
}
