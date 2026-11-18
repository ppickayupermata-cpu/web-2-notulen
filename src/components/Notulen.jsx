import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { X, Download, UserPlus, NotebookPen, QrCode, Trash2, Copy, Lock, Unlock, RefreshCw, History, Printer, ClipboardCheck } from 'lucide-react'
import HalamanNotulen from './HalamanNotulen.jsx'
import { useData } from '../context/DataContext.jsx'
import { api } from '../api.js'
import { dariTabel, tglID } from '../utils/notulen.js'
import { buatDocx, NOTE_DEFAULT } from '../utils/makeDocx.js'
import { susunDokumen, gantiPeserta, parseIsi, teksBaris } from '../utils/isiNotulen.js'
import { tgl, jam } from '../utils/notulenUtil.js'
import { today } from '../utils/date.js'
import JamMerah, { jamStr, tglPendek } from './JamMerah.jsx'

const P0 = [['Desti', 'MKT'], ['Ajeng', 'MKT'], ['Eko N', 'PROD'], ['Kasiro', 'QC'], ['Banjar', 'QC'], ['Nanang', 'PROD'], ['Suyono', 'RND'], ['Syaeful', 'PROD'], ['Ainul', 'PROD'], ['Danny', 'PPIC'], ['Dadan', 'PPIC'], ['Syaeful', 'WH'], ['Irul', 'RND'], ['Reza', 'PROD']].map(([n, d]) => ({ n, d, hadir: false }))
const lbl = (p) => `${p.n} ( ${p.d} )` // absensi di notulen: hanya nama dan bagian
const baca = (id) => { try { return JSON.parse(localStorage.getItem('pl_nt_' + id)) || {} } catch { return {} } }
const bacaRiw = (id) => { try { return JSON.parse(localStorage.getItem('pl_nth_' + id)) || [] } catch { return [] } }
// teks halaman -> teks siap tempel di WhatsApp (judul *tebal*, bullet tetap)
const keWA = (t) => String(t).split('\n').map((l) => { const h = l.match(/^\s*\*\s*(.+)$/); return h ? `*${h[1].trim()}*` : /^\s*NOTULEN\b/i.test(l) ? `*${l.trim()}*` : l }).join('\n')
const MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

export default function Notulen({ group, rows, calc, onClose }) {
  const { token } = useData()
  const init = useRef(baca(group.id)).current
  const [info, setInfo] = useState(init.info || { nama: 'MEETING CUSTOM ORDER', tanggal: today(), ruang: '', mulai: '13:00', selesai: '15:00' })
  const [isi, setIsi] = useState(init.isi ?? null) // teks preview yang diedit bebas; null = ikuti tabel secara otomatis
  const [manual, setManual] = useState(init.manual || P0)
  const [np, setNp] = useState({ n: '', d: '' }), [err, setErr] = useState('')
  const [riw, setRiw] = useState(() => bacaRiw(group.id)), [showRiw, setShowRiw] = useState(false), [copied, setCopied] = useState(false)
  const [room, setRoom] = useState(null), [log, setLog] = useState([]), [offset, setOffset] = useState(0), [link, setLink] = useState(''), [qr, setQr] = useState('')
  const roomId = room?.id

  useEffect(() => { try { localStorage.setItem('pl_nt_' + group.id, JSON.stringify({ info, isi, manual })) } catch {} }, [info, isi, manual, group.id])
  useEffect(() => { const k = (e) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [])

  // ---------- absensi QR (log tampil langsung) ----------
  const terima = (x) => { setRoom(x.room); setLog(x.log || []); if (x.now) setOffset(Date.parse(x.now) - Date.now()) }
  const kirim = (body) => api('/api/absen', { token, body }).then(terima).catch((e) => setErr(e.message))
  useEffect(() => { api('/api/absen?groupId=' + encodeURIComponent(group.id), { token }).then((x) => x.room && terima(x)).catch(() => {}) }, [])
  useEffect(() => { if (!roomId) return; const t = setInterval(() => api('/api/absen?room=' + roomId, { token }).then(terima).catch(() => {}), 3000); return () => clearInterval(t) }, [roomId])
  const bikinQR = async (u) => { const url = u || `${location.origin}/?absen=${roomId}`; setLink(url); setQr(await QRCode.toDataURL(url, { width: 240, margin: 1 })) }
  useEffect(() => { if (roomId) bikinQR() }, [roomId])
  const buat = (fresh) => { setErr(''); kirim({ action: 'create', groupId: group.id, title: `${info.nama} · Container ${group.container}`, fresh }) }

  // ---------- isi notulen ----------
  // nilai sel yang berisi rumus (=...) dihitung dulu, supaya yang masuk notulen adalah hasilnya, bukan teks rumus
  const tabel = dariTabel(calc ? rows.map((r) => ({ ...r, area: calc(r, 'area'), target: calc(r, 'target'), ket: calc(r, 'ket') })) : rows)
  const hadir = [...new Map([...log.filter((e) => e.confirmed).map((e) => `${e.nama} ( ${e.bagian} )`), ...manual.filter((p) => p.hadir).map(lbl)].map((x) => [x.toLowerCase(), x])).values()]
  const prefix = init.prefix ?? `${group.container}${group.buyer ? ' ' + group.buyer : ''}`.trim(), tglKirim = init.tglKirim ?? (group.shipDate || '')
  const heading = [prefix, tglKirim ? 'RENCANA KIRIM ' + tglID(tglKirim).toUpperCase() : 'RENCANA KIRIM'].filter(Boolean).join(' ')
  const auto = susunDokumen({ judul: 'NOTULEN ' + info.nama.toUpperCase(), hari: tgl(info.tanggal), tempat: 'Ruang Meeting ' + (info.ruang || '-'), jam: `${jam(info.mulai)} WIB s/d ${jam(info.selesai)}`, hadir, items: tabel.items, rincian: tabel.rincian, heading, note: NOTE_DEFAULT })
  const text = isi ?? auto, edited = isi !== null && isi !== auto
  const done = new Set(teksBaris(tabel.items.filter((i) => i.selesai))) // baris sudah dipacking tetap diberi warna di Word selama teksnya tidak diubah
  // riwayat versi: tiap kali diunduh / disimpan manual, teks halaman dicatat (15 terakhir, di browser ini)
  const simpanVersi = (label) => { const n = [{ at: new Date().toISOString(), label, text }, ...riw.filter((v) => v.text !== text)].slice(0, 15); setRiw(n); try { localStorage.setItem('pl_nth_' + group.id, JSON.stringify(n)) } catch {} }
  const pulihVersi = (v) => { if (window.confirm('Kembalikan halaman ke versi ' + new Date(v.at).toLocaleString('id-ID') + '? Ketikan sekarang akan diganti (tersimpan dulu sebagai versi).')) { simpanVersi('Sebelum dipulihkan'); setIsi(v.text); setShowRiw(false) } }
  const salin = async () => { try { await navigator.clipboard.writeText(keWA(text)); setCopied(true); setTimeout(() => setCopied(false), 2500) } catch { setErr('Tidak bisa menyalin otomatis. Blok teks di halaman lalu salin manual (Ctrl+C).') } }
  const cetak = () => { document.body.classList.add('print-notulen'); const done = () => { document.body.classList.remove('print-notulen'); window.removeEventListener('afterprint', done) }; window.addEventListener('afterprint', done); window.print() }
  const susunUlang = () => { if (!edited || window.confirm('Susun ulang seluruh halaman dari tabel dan data meeting? Semua ketikan di preview akan diganti.')) setIsi(null) }
  const pesertaBaru = () => setIsi(gantiPeserta(text, hadir)) // hanya daftar peserta yang diperbarui, ketikan lain aman
  const set = (k) => (e) => setInfo({ ...info, [k]: e.target.value })
  const tambah = () => { if (np.n.trim()) { setManual([...manual, { n: np.n.trim(), d: (np.d || '-').toUpperCase(), hadir: true }]); setNp({ n: '', d: '' }) } }
  const unduh = async () => {
    try {
      const tpl = await (await fetch('/template-notulen.docx')).arrayBuffer()
      const b = await buatDocx(tpl, parseIsi(text, done), true), a = document.createElement('a')
      a.href = URL.createObjectURL(new Blob([b], { type: MIME })); a.download = `NOTULEN ${info.nama}.docx`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 3000); simpanVersi('Diunduh (.docx)')
    } catch (e) { setErr('Gagal membuat Word: ' + e.message) }
  }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal wide" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="mh"><NotebookPen size={20} /><h3>Catat Notulen · Container {group.container}</h3><button className="icon-btn" onClick={onClose} title="Tutup (Esc)"><X size={18} /></button></div>
        <div className="ntsec"><h4>Meeting</h4>
          <div className="nt">
            <label>Nama meeting<input value={info.nama} onChange={set('nama')} /></label><label>Tanggal<input type="date" value={info.tanggal} onChange={set('tanggal')} /></label>
            <label>Ruang<input value={info.ruang} onChange={set('ruang')} placeholder="Bengkirai" /></label><label>Jam mulai<input type="time" value={info.mulai} onChange={set('mulai')} /></label><label>Jam selesai<input type="time" value={info.selesai} onChange={set('selesai')} /></label>
          </div></div>
        <div className="ntsec"><h4>Absensi lewat QR (tanpa login)</h4>
          {!room ? <div className="toolbar wrap"><button className="btn primary" onClick={() => buat(false)}><QrCode size={15} /> Buat QR absensi</button><span className="hint">Peserta scan QR, isi nama dan bagian, lalu Submit. Waktu tercatat otomatis oleh server.</span></div> : (
            <div className="absen-host">
              <div className="qrbox">
                {qr && <img src={qr} width="200" height="200" alt="QR absensi" />}
                <div className="qrinfo"><JamMerah offset={offset} compact />
                  <input className="linkin" value={link} onChange={(e) => setLink(e.target.value)} aria-label="Link absensi" />
                  <div className="toolbar wrap">
                    <button className="btn sm" onClick={() => bikinQR(link)} title="Buat ulang QR dari alamat di atas (mis. alamat IP komputer saat uji lokal)"><RefreshCw size={14} /> Perbarui QR</button>
                    <button className="btn sm" onClick={() => navigator.clipboard?.writeText(link)}><Copy size={14} /> Salin link</button>
                    <button className="btn sm" onClick={() => kirim({ action: 'setClosed', room: roomId, closed: !room.closed })}>{room.closed ? <><Unlock size={14} /> Buka absensi</> : <><Lock size={14} /> Tutup absensi</>}</button>
                    <button className="btn sm" onClick={() => window.confirm('Buat QR baru? Log absensi lama tetap tersimpan, tetapi QR lama tidak dipakai lagi di sini.') && buat(true)}><QrCode size={14} /> QR baru</button></div>
                  <span className={'chip-st ' + (room.closed ? 'tutup' : 'buka')}>{room.closed ? 'Absensi ditutup' : 'Absensi dibuka'}</span></div></div>
              <p className="hint">Hanya peserta yang <b>sudah dikonfirmasi</b> masuk ke notulen (atau pakai tombol <b>Pantau absensi</b> di daftar Monitoring). {log.some((l) => !l.confirmed) && <button className="btn sm" onClick={() => kirim({ action: 'confirmAll', room: roomId })}>Konfirmasi semua</button>}</p>
              <div className="tw"><table className="logtbl"><thead><tr><th>#</th><th>Nama</th><th>Bagian</th><th>Waktu absen</th><th>Status</th><th /></tr></thead>
                <tbody>{log.length === 0 && <tr><td colSpan="6" className="hint">Belum ada yang absen.</td></tr>}
                  {log.map((l, i) => <tr key={l.id}><td>{i + 1}</td><td>{l.nama}</td><td>{l.bagian}</td><td className="wkt">{jamStr(l.at)}<small> {tglPendek(l.at)}</small></td><td>{l.confirmed ? <span className="chip-st buka" style={{ margin: 0 }}>Terkonfirmasi</span> : <button className="btn sm primary" onClick={() => kirim({ action: 'confirm', room: roomId, id: l.id, confirmed: true })}>Konfirmasi</button>}</td><td><button className="icon-btn" title="Hapus entri" onClick={() => kirim({ action: 'remove', room: roomId, id: l.id })}><Trash2 size={14} /></button></td></tr>)}</tbody></table></div>
            </div>)}
          {err && <div className="msg err">{err}</div>}
          <details style={{ marginTop: 10 }}><summary>Absen manual (tanpa QR)</summary>
            <div className="chips">{manual.map((p, i) => <button key={i} className={'chip' + (p.hadir ? ' on' : '')} onClick={() => setManual(manual.map((x, j) => (j === i ? { ...x, hadir: !x.hadir } : x)))}>{lbl(p)}</button>)}</div>
            <div className="toolbar"><input placeholder="Nama" value={np.n} onChange={(e) => setNp({ ...np, n: e.target.value })} /><input placeholder="Bagian (PROD)" size="10" value={np.d} onChange={(e) => setNp({ ...np, d: e.target.value })} /><button className="btn sm" onClick={tambah}><UserPlus size={14} /> Tambah</button></div></details></div>
        <div className="ntsec"><h4>Notulen dari Excel yang diupload</h4>
          <p className="hint">{tabel.baris} baris tabel diringkas menjadi {tabel.items.length} catatan ({tabel.po} PO), tiap SO satu blok dengan jarak antar SO. Kesamaan AREA dan TARGET SELESAI dalam satu PO dicatat sekali.{tabel.selesai ? ` ${tabel.selesai} catatan sudah dipacking ditaruh paling bawah (warna hijau).` : ''}{tabel.kosong ? ` ${tabel.kosong} baris belum diisi AREA / TARGET / KETERANGAN dan dilewati.` : ''} Seluruh halaman di bawah (judul, keterangan, peserta, catatan, NOTE) bisa diedit langsung; hasil unduhan Word mengikuti teks ini. Mengubah data meeting di atas hanya otomatis menyusun halaman selama belum Anda ketik sendiri.</p>
          <div className="paper print-area"><HalamanNotulen text={text} done={done} onText={setIsi} onPeserta={pesertaBaru} onSusun={susunUlang} canSusun={isi !== null} /></div>
          <div className="toolbar wrap">
            <button className="btn primary" disabled={!text.trim()} onClick={unduh}><Download size={15} /> Unduh notulen (.docx)</button>
            <button className="btn" disabled={!text.trim()} onClick={cetak} title="Buka dialog cetak: pilih 'Simpan sebagai PDF' untuk membuat PDF"><Printer size={15} /> Cetak / PDF</button>
            <button className="btn" disabled={!text.trim()} onClick={salin} title="Salin teks notulen untuk ditempel di WhatsApp"><>{copied ? <ClipboardCheck size={15} /> : <Copy size={15} />}</> {copied ? 'Tersalin' : 'Salin teks (WhatsApp)'}</button>
            <button className="btn" onClick={() => simpanVersi('Disimpan manual')} title="Catat versi halaman saat ini"><History size={15} /> Simpan versi</button>
            <button className={'btn' + (showRiw ? ' on' : '')} disabled={!riw.length} onClick={() => setShowRiw((v) => !v)}><History size={15} /> Riwayat versi ({riw.length})</button>
          </div>
          {showRiw && <div className="riw">{riw.map((v) => <div key={v.at} className="riw-r"><span>{new Date(v.at).toLocaleString('id-ID')} · {v.label}</span><button className="btn sm" onClick={() => pulihVersi(v)}>Kembalikan</button></div>)}</div>}
        </div>
      </div>
    </div>
  )
}
