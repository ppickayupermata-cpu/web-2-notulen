import { useEffect, useState } from 'react'
import { UserCheck, CheckCircle2, Lock, ClipboardList, Radio, Hourglass } from 'lucide-react'
import JamMerah, { jamStr, tglStr } from '../components/JamMerah.jsx'

// Halaman absensi PUBLIK (dibuka dari QR): tanpa login. Hanya nama dan bagian; waktu dicatat server saat Submit.
const BAGIAN = ['PPIC', 'PROD', 'QC', 'WH', 'MKT', 'RND']
const call = async (path, body) => {
  const r = await fetch(path, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
  const d = await r.json().catch(() => ({}))
  if (!r.ok) { const e = new Error(d.error || 'Terjadi kesalahan.'); e.status = r.status; throw e }
  return d
}

export default function AbsenRoom({ id }) {
  const [d, setD] = useState(null), [offset, setOffset] = useState(0), [err, setErr] = useState('')
  const [nama, setNama] = useState(''), [bagian, setBagian] = useState(''), [busy, setBusy] = useState(false), [ok, setOk] = useState(null)
  const kunci = 'absen_entry_' + id
  const [entry, setEntry] = useState(() => { try { return localStorage.getItem(kunci) || '' } catch { return '' } }) // id absen saya (diingat di HP ini)
  const apply = (x) => { setD({ room: x.room, log: x.log, mine: x.mine, live: x.live }); setOffset(Date.parse(x.now) - Date.now()) }
  useEffect(() => {
    let on = true
    const load = () => call('/api/absen?room=' + encodeURIComponent(id) + (entry ? '&entry=' + encodeURIComponent(entry) : '')).then((x) => { if (on) { apply(x); setErr('') } }).catch((e) => { if (on && e.status === 404) setD(false); else if (on) setErr(e.message) })
    load(); const t = setInterval(load, 4000); return () => { on = false; clearInterval(t) }
  }, [id, entry])
  const kirim = async (e) => {
    e.preventDefault(); if (busy) return; setBusy(true); setErr('')
    try { const x = await call('/api/absen', { action: 'submit', room: id, nama, bagian }); apply(x); setOk({ ...x.entry, dup: x.dup }); try { localStorage.setItem(kunci, x.entry.id) } catch { /* mode privat */ } setEntry(x.entry.id); if (!x.dup) setNama('') }
    catch (er) { setErr(er.message) } finally { setBusy(false) }
  }
  const closed = d?.room?.closed
  const areas = [...new Set([...BAGIAN, ...(d?.log || []).map((l) => l.bagian)])]

  return (
    <div className="absen">
      <div className="absen-head"><ClipboardList size={22} /> <b>Absensi Meeting</b></div>
      {d === false && <div className="msg err">Room absensi tidak ditemukan. Minta QR terbaru dari PPIC.</div>}
      {d && <>
        <div className="absen-title">{d.room.title || 'Meeting'}</div>
        <JamMerah offset={offset} />
        {closed && <div className="msg err"><Lock size={15} /> Absensi sudah ditutup.</div>}
        <form className="card absen-form" onSubmit={kirim}>
          <label>Nama<input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama lengkap" autoComplete="name" maxLength={60} required disabled={closed} /></label>
          <label>Bagian<input value={bagian} onChange={(e) => setBagian(e.target.value)} placeholder="Contoh: PPIC" list="dl-bagian" maxLength={40} required disabled={closed} /></label>
          <datalist id="dl-bagian">{areas.map((a) => <option key={a} value={a} />)}</datalist>
          <button className="btn primary big" type="submit" disabled={busy || closed || nama.trim().length < 2 || !bagian.trim()}><UserCheck size={18} /> {busy ? 'Mengirim…' : 'Submit absen'}</button>
        </form>
        {err && <div className="msg err">{err}</div>}
        {ok && <div className="msg okmsg" role="status"><CheckCircle2 size={18} /> {ok.dup ? 'Anda sudah tercatat' : 'Absen tercatat'}: <b>{ok.nama} ( {ok.bagian} )</b> pukul <b>{jamStr(ok.at)} WIB</b></div>}
        {d.mine && (d.mine.confirmed
          ? <div className="msg okmsg" role="status"><CheckCircle2 size={18} /> Absen Anda sudah <b>dikonfirmasi admin</b>.{d.live && <> <a className="btn primary big" style={{ display: 'flex', marginTop: 10 }} href={'/?live=' + d.live}><Radio size={18} /> Lihat live</a></>}</div>
          : <div className="msg" role="status" style={{ background: '#fef3c7', color: '#92400e', borderRadius: 10, padding: '10px 12px' }}><Hourglass size={16} /> Menunggu konfirmasi admin… tombol <b>Lihat live</b> muncul di sini setelah dikonfirmasi (halaman ini ter-update otomatis).</div>)}
        <div className="card"><h4 style={{ margin: '0 0 8px' }}>Log absensi ({d.log.length})</h4>
          <div className="tw"><table className="logtbl"><thead><tr><th>#</th><th>Nama</th><th>Bagian</th><th>Waktu</th><th></th></tr></thead>
            <tbody>{d.log.length === 0 && <tr><td colSpan="5" className="hint">Belum ada yang absen.</td></tr>}
              {d.log.map((l, i) => <tr key={l.id} className={(ok?.id === l.id || entry === l.id) ? 'mine' : ''}><td>{i + 1}</td><td>{l.nama}</td><td>{l.bagian}</td><td className="wkt">{jamStr(l.at)}<small> {tglStr(l.at).split(', ')[1]}</small></td><td>{l.confirmed ? '✔' : ''}</td></tr>)}</tbody></table></div></div>
      </>}
    </div>
  )
}
