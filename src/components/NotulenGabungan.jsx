import { useEffect, useMemo, useState } from 'react'
import { X, Download, Printer, ClipboardCheck, Copy, Merge, ArrowLeft, UserPlus, Wand2, CheckSquare, Square } from 'lucide-react'
import HalamanNotulen from './HalamanNotulen.jsx'
import { useData } from '../context/DataContext.jsx'
import { api } from '../api.js'
import { dariTabel, tglID } from '../utils/notulen.js'
import { buatDocx, NOTE_DEFAULT } from '../utils/makeDocx.js'
import { jamWIB, tglWIB } from '../utils/waktu.js'
import { susunGabungan, gantiPeserta, parseIsi, teksBaris, keWA } from '../utils/isiNotulen.js'
import { tgl, jam } from '../utils/notulenUtil.js'
import { today } from '../utils/date.js'

const MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'

// Gabungkan notulen beberapa container menjadi satu dokumen: pilih semua / custom select, proses, lalu preview yang bisa diedit langsung
// (sama seperti Catat Notulen). Peserta = yang sudah dikonfirmasi di absensi tiap container (digabung, tanpa dobel) + tambahan manual.
export default function NotulenGabungan({ groups, rows, onClose }) {
  const { token } = useData()
  const [step, setStep] = useState('pilih'), [pick, setPick] = useState(() => new Set()), [q, setQ] = useState('')
  const [info, setInfo] = useState({ nama: 'MEETING CUSTOM ORDER', tanggal: today(), ruang: '', mulai: '13:00', selesai: '15:00' })
  const [manual, setManual] = useState([]), [np, setNp] = useState({ n: '', d: '' }), [absen, setAbsen] = useState([]), [busy, setBusy] = useState(false), [err, setErr] = useState('')
  const [isi, setIsi] = useState(null), [copied, setCopied] = useState(false), [urut, setUrut] = useState(true) // urut: yang sudah dicentang di atas, urut centang pertama

  useEffect(() => { const k = (e) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [])
  const info0 = useMemo(() => new Map(groups.map((g) => [g.id, dariTabel(rows.filter((r) => r.groupId === g.id))])), [groups, rows]) // catatan per container
  const daftar = groups.filter((g) => !q.trim() || (g.container + ' ' + g.buyer).toLowerCase().includes(q.toLowerCase()))
  const terpilih = groups.filter((g) => pick.has(g.id))
  const toggle = (id) => setPick((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })

  const ambilAbsen = async (gs) => { // peserta terkonfirmasi: absensi meeting (satu untuk semua container) + absensi lama per container
    const gm = await api('/api/absen?current=1', { token }).catch(() => null), m = gm?.meeting
    if (m && (m.status === 'berjalan' || tglWIB(m.startedAt) === today())) setInfo((i) => ({ ...i, tanggal: tglWIB(m.startedAt), mulai: jamWIB(m.startedAt), ...(m.endedAt ? { selesai: jamWIB(m.endedAt) } : {}) })) // jam dari tombol Meeting dimulai / ditutup
    const global = (gm?.log || []).filter((l) => l.confirmed).map((l) => `${l.nama} ( ${l.bagian} )`)
    const hasil = await Promise.all(gs.map((g) => api('/api/absen?groupId=' + encodeURIComponent(g.id), { token }).then((x) => (x.log || []).filter((l) => l.confirmed).map((l) => `${l.nama} ( ${l.bagian} )`)).catch(() => [])))
    return [...global, ...hasil.flat()]
  }
  const hadirDari = (a, m) => { const u = new Map(); [...a, ...m.map((p) => `${p.n} ( ${p.d} )`)].forEach((x) => { if (!u.has(x.toLowerCase())) u.set(x.toLowerCase(), x) }); return [...u.values()] } // tanpa dobel; penulisan pertama dipakai
  const hadir = hadirDari(absen, manual)
  const sections = terpilih.map((g) => ({ heading: [`${g.container}${g.buyer ? ' ' + g.buyer : ''}`.trim(), g.shipDate ? 'RENCANA KIRIM ' + tglID(g.shipDate).toUpperCase() : 'RENCANA KIRIM'].join(' '), items: info0.get(g.id).items }))
  const auto = susunGabungan({ judul: 'NOTULEN ' + info.nama.toUpperCase(), hari: tgl(info.tanggal), tempat: 'Ruang Meeting ' + (info.ruang || '-'), jam: `${jam(info.mulai)} WIB s/d ${jam(info.selesai)}`, hadir, sections, selesaiDiAtas: urut, rincian: terpilih.flatMap((g) => info0.get(g.id).rincian.map((r) => ({ ...r, container: g.container }))), note: NOTE_DEFAULT })
  const text = isi ?? auto
  const done = new Set(terpilih.flatMap((g) => teksBaris(info0.get(g.id).items.filter((i) => i.selesai))))
  const nCatatan = terpilih.reduce((n, g) => n + info0.get(g.id).items.length, 0)

  const proses = async () => { setBusy(true); setErr(''); setAbsen(await ambilAbsen(terpilih)); setIsi(null); setStep('preview'); setBusy(false) }
  const pesertaBaru = async () => { const a = await ambilAbsen(terpilih); setAbsen(a); setIsi(gantiPeserta(text, hadirDari(a, manual))) }
  const tambah = () => { if (np.n.trim()) { const m = [...manual, { n: np.n.trim(), d: (np.d || '-').toUpperCase() }]; setManual(m); setNp({ n: '', d: '' }); setIsi(gantiPeserta(text, hadirDari(absen, m))) } }
  const unduh = async () => {
    try {
      const tpl = await (await fetch('/template-notulen.docx')).arrayBuffer(), b = await buatDocx(tpl, parseIsi(text, done), true), a = document.createElement('a')
      a.href = URL.createObjectURL(new Blob([b], { type: MIME })); a.download = `NOTULEN GABUNGAN ${info.nama}.docx`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 3000)
    } catch (e) { setErr('Gagal membuat Word: ' + e.message) }
  }
  const cetak = () => { document.body.classList.add('print-notulen'); const f = () => { document.body.classList.remove('print-notulen'); removeEventListener('afterprint', f) }; addEventListener('afterprint', f); window.print() }
  const salin = async () => { try { await navigator.clipboard.writeText(keWA(text)); setCopied(true); setTimeout(() => setCopied(false), 2500) } catch { setErr('Tidak bisa menyalin otomatis. Blok teks lalu salin manual (Ctrl+C).') } }
  const susunUlang = () => { if (isi === null || window.confirm('Susun ulang seluruh halaman? Semua ketikan di preview akan diganti.')) setIsi(null) }

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal wide" role="dialog" aria-modal="true" aria-label="Gabungkan notulen" onClick={(e) => e.stopPropagation()}>
        <div className="toolbar"><h3 style={{ margin: 0 }}><Merge size={18} style={{ verticalAlign: '-3px' }} /> Gabungkan notulen</h3><span className="spacer" /><button className="icon-btn" aria-label="Tutup" onClick={onClose}><X size={18} /></button></div>

        {step === 'pilih' && <>
          <p className="hint">Pilih container yang notulennya digabung. Hanya baris yang sudah diisi (AREA / TARGET / KETERANGAN) atau sudah dipacking yang masuk.</p>
          <div className="toolbar wrap">
            <button className="btn sm" onClick={() => setPick(new Set(groups.map((g) => g.id)))}><CheckSquare size={14} /> Pilih semua</button>
            <button className="btn sm" onClick={() => setPick(new Set())}><Square size={14} /> Kosongkan</button>
            <input placeholder="Cari container / buyer…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Cari container" />
            <span className="hint">{pick.size} dipilih · {nCatatan} catatan</span>
          </div>
          <div className="tablewrap">
            <table className="grid"><thead><tr><th /><th>Container</th><th>Buyer</th><th>Ship Date</th><th>Catatan</th></tr></thead>
              <tbody>{daftar.map((g) => <tr key={g.id} onClick={() => toggle(g.id)} style={{ cursor: 'pointer' }}>
                <td><input type="checkbox" className="chk" checked={pick.has(g.id)} onChange={() => toggle(g.id)} onClick={(e) => e.stopPropagation()} aria-label={'Pilih ' + g.container} /></td>
                <td>{g.container}</td><td>{g.buyer}</td><td>{g.shipDate}</td><td>{info0.get(g.id).items.length}{!info0.get(g.id).items.length && <span className="hint"> (belum ada yang terisi, dilewati)</span>}</td></tr>)}</tbody></table>
          </div>
          <div className="toolbar wrap" style={{ marginTop: 10 }}>
            <label>Nama meeting<input value={info.nama} onChange={(e) => setInfo({ ...info, nama: e.target.value })} /></label>
            <label>Tanggal<input type="date" value={info.tanggal} onChange={(e) => setInfo({ ...info, tanggal: e.target.value })} /></label>
            <label>Ruang<input value={info.ruang} onChange={(e) => setInfo({ ...info, ruang: e.target.value })} placeholder="mis. Bengkirai" /></label>
            <label>Mulai<input type="time" value={info.mulai} onChange={(e) => setInfo({ ...info, mulai: e.target.value })} /></label>
            <label>Selesai<input type="time" value={info.selesai} onChange={(e) => setInfo({ ...info, selesai: e.target.value })} /></label>
          </div>
          <button className="btn primary" disabled={!pick.size || !nCatatan || busy} onClick={proses}><Merge size={15} /> {busy ? 'Memproses…' : `Proses & lihat preview (${pick.size} container)`}</button>
        </>}

        {step === 'preview' && <>
          <div className="toolbar wrap">
            <button className="btn" onClick={() => setStep('pilih')}><ArrowLeft size={15} /> Ubah pilihan</button>
            <label className="swlabel" title="Yang sudah dicentang (tag packing) ditaruh sesuai urutan dicentang: yang pertama dicentang paling atas"><input type="checkbox" checked={urut} onChange={(e) => { setUrut(e.target.checked); setIsi(null) }} /> Yang dicentang di paling atas (urut centang)</label>
            <span className="hint">{terpilih.length} container · {nCatatan} catatan · {hadir.length} peserta terkonfirmasi. Seluruh halaman bisa diedit langsung.</span>
          </div>
          <div className="paper print-area"><HalamanNotulen text={text} done={done} onText={setIsi} onPeserta={pesertaBaru} onSusun={susunUlang} canSusun={isi !== null} /></div>
          <div className="toolbar wrap">
            <button className="btn primary" disabled={!text.trim()} onClick={unduh}><Download size={15} /> Unduh notulen gabungan (.docx)</button>
            <button className="btn" disabled={!text.trim()} onClick={cetak}><Printer size={15} /> Cetak / PDF</button>
            <button className="btn" disabled={!text.trim()} onClick={salin}>{copied ? <ClipboardCheck size={15} /> : <Copy size={15} />} {copied ? 'Tersalin' : 'Salin teks (WhatsApp)'}</button>
            <input placeholder="Tambah peserta: nama" value={np.n} onChange={(e) => setNp({ ...np, n: e.target.value })} aria-label="Nama peserta" /><input placeholder="Bagian" size="8" value={np.d} onChange={(e) => setNp({ ...np, d: e.target.value })} aria-label="Bagian peserta" />
            <button className="btn sm" onClick={tambah}><UserPlus size={14} /> Tambah</button>
          </div>
        </>}
        {err && <div className="msg err">{err}</div>}
      </div>
    </div>
  )
}
