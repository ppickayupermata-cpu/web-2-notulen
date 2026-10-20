import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { X, Download, UserPlus, NotebookPen, QrCode, Trash2, Copy, Lock, Unlock, RefreshCw } from 'lucide-react'
import { useData } from '../context/DataContext.jsx'
import { api } from '../api.js'
import { dariTabel, tglID } from '../utils/notulen.js'
import { buatDocx, NOTE_DEFAULT } from '../utils/makeDocx.js'
import { tgl, jam } from '../utils/notulenUtil.js'
import { today } from '../utils/date.js'
import JamMerah, { jamStr, tglPendek } from './JamMerah.jsx'

const P0 = [['Desti', 'MKT'], ['Ajeng', 'MKT'], ['Eko N', 'PROD'], ['Kasiro', 'QC'], ['Banjar', 'QC'], ['Nanang', 'PROD'], ['Suyono', 'RND'], ['Syaeful', 'PROD'], ['Ainul', 'PROD'], ['Danny', 'PPIC'], ['Dadan', 'PPIC'], ['Syaeful', 'WH'], ['Irul', 'RND'], ['Reza', 'PROD']].map(([n, d]) => ({ n, d, hadir: false }))
const lbl = (p) => `${p.n} ( ${p.d} )` // absensi di notulen: hanya nama dan bagian
const baca = (id) => { try { return JSON.parse(localStorage.getItem('pl_nt_' + id)) || {} } catch { return {} } }
const MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

export default function Notulen({ group, rows, calc, onClose }) {
  const { token } = useData()
  const init = useRef(baca(group.id)).current
  const [info, setInfo] = useState(init.info || { nama: 'MEETING CUSTOM ORDER', tanggal: today(), ruang: '', mulai: '13:00', selesai: '15:00' })
  const [prefix, setPrefix] = useState(init.prefix ?? `${group.container}${group.buyer ? ' ' + group.buyer : ''}`.trim())
  const [tglKirim, setTglKirim] = useState(init.tglKirim ?? (group.shipDate || ''))
  const [manual, setManual] = useState(init.manual || P0)
  const [np, setNp] = useState({ n: '', d: '' }), [err, setErr] = useState('')
  const [room, setRoom] = useState(null), [log, setLog] = useState([]), [offset, setOffset] = useState(0), [link, setLink] = useState(''), [qr, setQr] = useState('')
  const roomId = room?.id

  useEffect(() => { try { localStorage.setItem('pl_nt_' + group.id, JSON.stringify({ info, prefix, tglKirim, manual })) } catch {} }, [info, prefix, tglKirim, manual, group.id])
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
  const hadir = [...new Map([...log.map((e) => `${e.nama} ( ${e.bagian} )`), ...manual.filter((p) => p.hadir).map(lbl)].map((x) => [x.toLowerCase(), x])).values()]
  const heading = [prefix, tglKirim ? 'RENCANA KIRIM ' + tglID(tglKirim).toUpperCase() : ''].filter(Boolean).join(' ')
  const groups = [{ h: heading, items: tabel.items, bold: true }]
  const set = (k) => (e) => setInfo({ ...info, [k]: e.target.value })
  const tambah = () => { if (np.n.trim()) { setManual([...manual, { n: np.n.trim(), d: (np.d || '-').toUpperCase(), hadir: true }]); setNp({ n: '', d: '' }) } }
  const unduh = async () => {
    try {
      const tpl = await (await fetch('/template-notulen.docx')).arrayBuffer(), meta = { nama: info.nama, tanggal: info.tanggal, ruang: info.ruang || '-', mulai: info.mulai, selesai: info.selesai }
      const b = await buatDocx(tpl, 'NOTULEN ' + info.nama.toUpperCase(), meta, hadir, groups, NOTE_DEFAULT, true), a = document.createElement('a')
      a.href = URL.createObjectURL(new Blob([b], { type: MIME })); a.download = `NOTULEN ${info.nama}.docx`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 3000)
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
              <div className="tw"><table className="logtbl"><thead><tr><th>#</th><th>Nama</th><th>Bagian</th><th>Waktu absen</th><th /></tr></thead>
                <tbody>{log.length === 0 && <tr><td colSpan="5" className="hint">Belum ada yang absen.</td></tr>}
                  {log.map((l, i) => <tr key={l.id}><td>{i + 1}</td><td>{l.nama}</td><td>{l.bagian}</td><td className="wkt">{jamStr(l.at)}<small> {tglPendek(l.at)}</small></td><td><button className="icon-btn" title="Hapus entri" onClick={() => kirim({ action: 'remove', room: roomId, id: l.id })}><Trash2 size={14} /></button></td></tr>)}</tbody></table></div>
            </div>)}
          {err && <div className="msg err">{err}</div>}
          <details style={{ marginTop: 10 }}><summary>Absen manual (tanpa QR)</summary>
            <div className="chips">{manual.map((p, i) => <button key={i} className={'chip' + (p.hadir ? ' on' : '')} onClick={() => setManual(manual.map((x, j) => (j === i ? { ...x, hadir: !x.hadir } : x)))}>{lbl(p)}</button>)}</div>
            <div className="toolbar"><input placeholder="Nama" value={np.n} onChange={(e) => setNp({ ...np, n: e.target.value })} /><input placeholder="Bagian (PROD)" size="10" value={np.d} onChange={(e) => setNp({ ...np, d: e.target.value })} /><button className="btn sm" onClick={tambah}><UserPlus size={14} /> Tambah</button></div></details></div>
        <div className="ntsec"><h4>Notulen dari Excel yang diupload</h4>
          <p className="hint">{tabel.baris} baris tabel diringkas menjadi {tabel.items.length} catatan ({tabel.po} PO). Kesamaan AREA dan TARGET SELESAI dalam satu PO dicatat sekali; PO yang sama dengan AREA berbeda ditulis berurutan dalam satu baris.{tabel.selesai ? ` ${tabel.selesai} catatan sudah dipacking ditaruh paling bawah (warna hijau).` : ''}{tabel.kosong ? ` ${tabel.kosong} baris belum diisi AREA / TARGET / KETERANGAN dan dilewati.` : ''} Judul dan tanggal pengiriman di bawah bisa diedit langsung.</p>
          <div className="paper"><div className="ttlbox">{'NOTULEN ' + info.nama.toUpperCase()}</div>
            <div className="kv"><span>Hari,Tanggal</span><span>:</span><span>{tgl(info.tanggal)}</span><span>Tempat</span><span>:</span><span>Ruang Meeting {info.ruang || '-'}</span><span>Jam</span><span>:</span><span>{jam(info.mulai)} WIB s/d {jam(info.selesai)}</span><span>Peserta</span><span>:</span><span /></div>
            <ol>{hadir.map((h) => <li key={h}>{h}</li>)}</ol>
            <div className="g">*<input className="inl" aria-label="Judul kelompok" size={Math.max(6, prefix.length)} value={prefix} onChange={(e) => setPrefix(e.target.value)} /> RENCANA KIRIM <input className="inl" aria-label="Tanggal pengiriman" type={/^\d{4}-\d{2}-\d{2}$/.test(tglKirim) || !tglKirim ? 'date' : 'text'} value={tglKirim} onChange={(e) => setTglKirim(e.target.value)} />
              <span className="hint noprint"> → {tglKirim ? tglID(tglKirim).toUpperCase() : 'kosong'}</span></div>
            <ul>{tabel.items.map((it, j) => <li key={j} className={'b' + (it.selesai ? ' done' : '')}>{it.t}</li>)}</ul>
            <div className="note">NOTE : {NOTE_DEFAULT}</div></div>
          <button className="btn primary" disabled={!tabel.items.length} onClick={unduh}><Download size={15} /> Unduh notulen (.docx)</button></div>
      </div>
    </div>
  )
}
