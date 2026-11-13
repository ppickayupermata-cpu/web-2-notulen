import { useEffect, useState } from 'react'
import { X, Radio, RefreshCw, ExternalLink } from 'lucide-react'
import BagikanLink from './BagikanLink.jsx'
import { useData } from '../context/DataContext.jsx'

// Link LIVE read-only satu container: siapa pun yang memegang link bisa memantau perubahan tanpa login. Admin bisa mematikan / mengganti link.
export default function LiveDialog({ group, onClose }) {
  const { ask } = useData()
  const [l, setL] = useState(null)
  useEffect(() => { ask('liveLink', { groupId: group.id }).then((x) => setL(x || false)) }, [])
  const ubah = async (extra) => { const x = await ask('liveLink', { groupId: group.id, ...extra }); if (x) setL(x) }
  const url = l ? `${location.origin}/?live=${l.token}` : ''
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal pantau" role="dialog" aria-modal="true" aria-label="Link live" onClick={(e) => e.stopPropagation()}>
        <div className="toolbar"><h3 style={{ margin: 0 }}><Radio size={18} style={{ verticalAlign: '-3px' }} /> Link live · Container {group.container}</h3><span className="spacer" /><button className="icon-btn" aria-label="Tutup" onClick={onClose}><X size={18} /></button></div>
        <p className="hint">Siapa pun yang memegang link ini bisa <b>melihat</b> isi container secara langsung (otomatis ter-update), tanpa login dan tanpa bisa mengubah apa pun.</p>
        <p className="hint">Link ini hanya menampilkan container ini. Untuk satu link yang <b>otomatis berpindah</b> mengikuti container yang sedang Anda edit, pakai <b>Link live meeting</b> di tombol <b>Absensi &amp; Meeting</b> (Monitoring).</p>
        {l === null && <div className="empty">Memuat…</div>}
        {l === false && <div className="msg err">Gagal membuat link live. Coba lagi.</div>}
        {l && <>
          <BagikanLink url={url} judul={'Live · ' + group.container} sub={group.buyer ? 'Buyer ' + group.buyer : ''} />
          <div className="toolbar wrap" style={{ marginTop: 8 }}>
            <label className="swlabel"><input type="checkbox" checked={l.enabled} onChange={(e) => ubah({ enabled: e.target.checked })} /> Link aktif</label><span className="spacer" />
            <a className="btn sm" href={url} target="_blank" rel="noreferrer"><ExternalLink size={14} /> Buka tampilan live</a>
            <button className="btn sm danger" onClick={() => window.confirm('Ganti link? Link lama langsung tidak bisa dipakai lagi dan perlu dibagikan ulang.') && ubah({ rotate: true })}><RefreshCw size={14} /> Ganti link</button>
          </div>
        </>}
      </div>
    </div>
  )
}
