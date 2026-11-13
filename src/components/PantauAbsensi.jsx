import { useEffect, useState } from 'react'
import { X, Lock, Unlock, CheckCheck, Check, Undo2, Trash2, QrCode, Play, Square, Radio, RefreshCw } from 'lucide-react'
import BagikanLink from './BagikanLink.jsx'
import JamMerah, { jamStr } from './JamMerah.jsx'
import { useData } from '../context/DataContext.jsx'
import { useMeeting } from '../context/useMeeting.js'
import { jamWIB } from '../utils/waktu.js'

// Absensi & Meeting: SATU absensi untuk seluruh container (peserta cukup absen sekali), tombol Meeting dimulai / Meeting ditutup,
// konfirmasi oleh admin, dan satu link LIVE meeting yang otomatis mengikuti container yang sedang dibuka host.
// Isi panel (tanpa pembungkus modal): dipakai di dialog Absensi & Meeting dan di dalam Catat Notulen. mt = hasil useMeeting().
export function PanelMeeting({ mt, defaultNama = 'MEETING CUSTOM ORDER' }) {
  const { ask } = useData()
  const { meeting, room, log, err, busy, kirim, offset, loaded } = mt
  const [nama, setNama] = useState(defaultNama), [auto, setAuto] = useState(false)
  const [lv, setLv] = useState(null)   // link live meeting { token, enabled }
  useEffect(() => { ask('liveMeetingLink', {}).then((x) => setLv(x || false)) }, [])
  const ubahLive = async (extra) => { const x = await ask('liveMeetingLink', extra); if (x) setLv(x) }
  const jalan = meeting?.status === 'berjalan', nOk = log.filter((l) => l.confirmed).length
  const url = room ? `${location.origin}/?absen=${room.id}` : '', liveUrl = lv ? `${location.origin}/?meeting=${lv.token}` : ''
  const mulai = () => kirim({ action: 'startMeeting', nama, autoConfirm: auto })
  const tutup = () => window.confirm(`Tutup meeting?\n\nAbsensi ditutup dan jam selesai dicatat (${nOk} peserta terkonfirmasi, ${log.length - nOk} menunggu). Daftar hadir tetap tersimpan dan terbaca di notulen.`) && kirim({ action: 'endMeeting' })
  return (
    <>
        {err && <div className="msg err">{err}</div>}
        {!loaded && !err && <div className="empty">Memuat…</div>}

        {loaded && <div className="ntsec"><h4>Mulai / tutup meeting</h4>
          {jalan ? (
            <div className="toolbar wrap">
              <span className="chip-st buka" style={{ margin: 0 }}>Meeting dimulai {jamWIB(meeting.startedAt)} WIB</span><b>{meeting.nama}</b>{meeting.autoConfirm && <span className="chip-st" style={{ margin: 0 }}>Konfirmasi otomatis</span>}<span className="spacer" />
              <button className="btn danger" disabled={busy} onClick={tutup}><Square size={15} /> Meeting ditutup</button>
            </div>
          ) : (
            <div className="toolbar wrap">
              {meeting && <span className="chip-st tutup" style={{ margin: 0 }}>Meeting ditutup {jamWIB(meeting.endedAt)} WIB · {meeting.nama}</span>}
              <label className="inline">Nama meeting<input value={nama} onChange={(e) => setNama(e.target.value)} /></label>
              <label className="swlabel" title="Peserta yang absen langsung terkonfirmasi (tanpa menunggu Anda)"><input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} /> Konfirmasi absen otomatis</label>
              <button className="btn primary" disabled={busy} onClick={mulai}><Play size={15} /> Meeting dimulai</button>
            </div>
          )}
          <p className="hint">{jalan ? 'Peserta cukup absen satu kali lewat QR di bawah, tidak perlu absen lagi saat pindah container.' : 'Klik Meeting dimulai untuk membuka absensi (satu QR untuk semua container). Jam mulai dan selesai otomatis masuk ke notulen.'}</p>
        </div>}

        {room && <div className="ntsec"><h4>Absensi</h4>
          <BagikanLink url={url} judul={'Absensi · ' + (meeting?.nama || 'Meeting')} sub={room.closed ? 'Absensi ditutup' : 'Scan untuk absen'} />
          <div className="toolbar wrap" style={{ marginTop: 8 }}>
            <JamMerah offset={offset} compact />
            <span className="chip-st buka" style={{ margin: 0 }}>{nOk} terkonfirmasi</span><span className="chip-st" style={{ margin: 0, background: 'var(--accent-soft)', color: 'var(--accent)' }}>{log.length - nOk} menunggu</span><span className="spacer" />
            <button className="btn sm" disabled={busy || nOk === log.length} onClick={() => kirim({ action: 'confirmAll', room: room.id })}><CheckCheck size={14} /> Konfirmasi semua</button>
            <button className="btn sm" disabled={busy} onClick={() => kirim({ action: 'setClosed', room: room.id, closed: !room.closed })}>{room.closed ? <><Unlock size={14} /> Buka absensi</> : <><Lock size={14} /> Tutup absensi</>}</button>
          </div>
          <div className="tablewrap">
            <table className="grid">
              <thead><tr><th>#</th><th>Nama</th><th>Bagian</th><th>Waktu</th><th>Status</th><th>Aksi</th></tr></thead>
              <tbody>
                {!log.length && <tr><td colSpan="6" className="hint">Belum ada yang absen. Bagikan QR / link di atas.</td></tr>}
                {log.map((l, i) => (
                  <tr key={l.id}><td>{i + 1}</td><td>{l.nama}</td><td>{l.bagian}</td><td>{jamStr(l.at)}</td>
                    <td>{l.confirmed ? <span className="chip-st buka" style={{ margin: 0 }}>Terkonfirmasi</span> : <span className="chip-st" style={{ margin: 0, background: '#fef3c7', color: '#92400e' }}>Menunggu</span>}</td>
                    <td className="actions">
                      {l.confirmed ? <button className="btn sm" disabled={busy} onClick={() => kirim({ action: 'confirm', room: room.id, id: l.id, confirmed: false })}><Undo2 size={13} /> Batalkan</button>
                        : <button className="btn sm primary" disabled={busy} onClick={() => kirim({ action: 'confirm', room: room.id, id: l.id, confirmed: true })}><Check size={13} /> Konfirmasi</button>}
                      <button className="icon-btn" title="Hapus entri" onClick={() => kirim({ action: 'remove', room: room.id, id: l.id })}><Trash2 size={14} /></button>
                    </td></tr>))}
              </tbody>
            </table>
          </div>
          <p className="hint">Hanya peserta yang sudah dikonfirmasi masuk ke notulen. Setelah dikonfirmasi, di HP peserta muncul tombol <b>Lihat live</b> (live meeting).</p>
        </div>}

        <div className="ntsec"><h4><Radio size={14} style={{ verticalAlign: '-2px' }} /> Link live meeting</h4>
          <p className="hint">Satu link untuk semua container: tampilan live <b>otomatis berpindah</b> ke container yang sedang Anda buka di halaman Input. Hanya melihat, tanpa login.</p>
          {lv === null && <div className="empty">Memuat…</div>}
          {lv === false && <div className="msg err">Gagal membuat link live meeting. Coba lagi.</div>}
          {lv && <>
            <BagikanLink url={liveUrl} judul="Live meeting" sub="Otomatis mengikuti container yang sedang dibuka host" />
            <div className="toolbar wrap" style={{ marginTop: 8 }}>
              <label className="swlabel"><input type="checkbox" checked={lv.enabled} onChange={(e) => ubahLive({ enabled: e.target.checked })} /> Link aktif</label><span className="spacer" />
              <button className="btn sm danger" onClick={() => window.confirm('Ganti link live meeting? Link lama langsung tidak bisa dipakai lagi dan perlu dibagikan ulang.') && ubahLive({ rotate: true })}><RefreshCw size={14} /> Ganti link</button>
            </div>
          </>}
        </div>
    </>
  )
}

export default function PantauAbsensi({ onClose }) {
  const mt = useMeeting()
  useEffect(() => { const k = (e) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [])
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal pantau wide" role="dialog" aria-modal="true" aria-label="Absensi dan meeting" onClick={(e) => e.stopPropagation()}>
        <div className="toolbar"><h3 style={{ margin: 0 }}><QrCode size={18} style={{ verticalAlign: '-3px' }} /> Absensi &amp; Meeting <small>satu absensi untuk semua container</small></h3><span className="spacer" /><button className="icon-btn" aria-label="Tutup" onClick={onClose}><X size={18} /></button></div>
        <PanelMeeting mt={mt} />
      </div>
    </div>
  )
}
