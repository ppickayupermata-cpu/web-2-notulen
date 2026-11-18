import { useEffect, useState } from 'react'
import { X, Lock, Unlock, CheckCheck, Check, Undo2, Trash2, RefreshCw, QrCode } from 'lucide-react'
import BagikanLink from './BagikanLink.jsx'
import { jamStr } from './JamMerah.jsx'
import { api } from '../api.js'
import { useData } from '../context/DataContext.jsx'

// Pantau absensi satu container: QR + link (salin / bagikan / unduh), daftar yang absen, dan KONFIRMASI oleh admin.
// Peserta yang sudah dikonfirmasi masuk ke notulen dan, di HP-nya, muncul tombol "Lihat live".
export default function PantauAbsensi({ group, onClose }) {
  const { token } = useData()
  const [d, setD] = useState(null), [err, setErr] = useState(''), [busy, setBusy] = useState(false)
  const terima = (x) => { setD(x.room ? x : null); setErr('') }
  const kirim = (body) => { setBusy(true); return api('/api/absen', { token, body }).then(terima).catch((e) => setErr(e.message)).finally(() => setBusy(false)) }
  useEffect(() => { api('/api/absen?groupId=' + encodeURIComponent(group.id), { token }).then((x) => (x.room ? terima(x) : setD(false))).catch((e) => setErr(e.message)) }, [])
  useEffect(() => { if (!d?.room) return; const t = setInterval(() => api('/api/absen?room=' + d.room.id, { token }).then(terima).catch(() => {}), 3000); return () => clearInterval(t) }, [d?.room?.id])
  const room = d?.room, log = d?.log || [], nOk = log.filter((l) => l.confirmed).length
  const url = room ? `${location.origin}/?absen=${room.id}` : ''
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal pantau" role="dialog" aria-modal="true" aria-label="Pantau absensi" onClick={(e) => e.stopPropagation()}>
        <div className="toolbar"><h3 style={{ margin: 0 }}><QrCode size={18} style={{ verticalAlign: '-3px' }} /> Pantau absensi · Container {group.container}</h3><span className="spacer" /><button className="icon-btn" aria-label="Tutup" onClick={onClose}><X size={18} /></button></div>
        {err && <div className="msg err">{err}</div>}
        {d === null && !err && <div className="empty">Memuat…</div>}
        {d === false && (
          <div className="empty">Belum ada QR absensi untuk container ini.<br /><button className="btn primary" disabled={busy} onClick={() => kirim({ action: 'create', groupId: group.id, title: 'Meeting · Container ' + group.container })}><QrCode size={15} /> Buat QR absensi</button></div>
        )}
        {room && <>
          <BagikanLink url={url} judul={'Absensi · ' + group.container} sub={room.title} />
          <div className="toolbar wrap" style={{ marginTop: 8 }}>
            <span className="chip-st buka" style={{ margin: 0 }}>{nOk} terkonfirmasi</span><span className="chip-st" style={{ margin: 0, background: 'var(--accent-soft)', color: 'var(--accent)' }}>{log.length - nOk} menunggu</span><span className="spacer" />
            <button className="btn sm" disabled={busy || nOk === log.length} onClick={() => kirim({ action: 'confirmAll', room: room.id })}><CheckCheck size={14} /> Konfirmasi semua</button>
            <button className="btn sm" disabled={busy} onClick={() => kirim({ action: 'setClosed', room: room.id, closed: !room.closed })}>{room.closed ? <><Unlock size={14} /> Buka absensi</> : <><Lock size={14} /> Tutup absensi</>}</button>
            <button className="btn sm" disabled={busy} onClick={() => window.confirm('Buat QR baru? QR lama tidak bisa dipakai lagi.') && kirim({ action: 'create', groupId: group.id, title: room.title, fresh: true })}><RefreshCw size={14} /> QR baru</button>
          </div>
          <div className="tablewrap" style={{ maxHeight: 280 }}>
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
          <p className="hint">Hanya peserta yang sudah dikonfirmasi masuk ke notulen. Setelah dikonfirmasi, di HP peserta muncul tombol <b>Lihat live</b> untuk memantau container ini.</p>
        </>}
      </div>
    </div>
  )
}
