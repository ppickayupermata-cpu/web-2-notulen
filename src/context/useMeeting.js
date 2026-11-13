import { useCallback, useEffect, useState } from 'react'
import { api } from '../api.js'
import { useData } from './DataContext.jsx'

// Meeting terbaru + absensinya (satu absensi untuk semua container). Disegarkan tiap 3 detik selama komponen terpasang.
// d = { meeting: {id, nama, status: 'berjalan'|'selesai', startedAt, endedAt, autoConfirm} | null, room, log, now }
export function useMeeting() {
  const { token } = useData()
  const [d, setD] = useState(null), [err, setErr] = useState(''), [busy, setBusy] = useState(false), [offset, setOffset] = useState(0)
  const terima = useCallback((x) => { setD(x); setErr(''); if (x?.now) setOffset(Date.parse(x.now) - Date.now()) }, [])
  const muat = useCallback(() => api('/api/absen?current=1', { token }).then(terima).catch((e) => setErr(e.message)), [token, terima])
  useEffect(() => {
    muat()
    const t = setInterval(() => { if (!document.hidden) muat() }, 3000)
    return () => clearInterval(t)
  }, [muat])
  const kirim = (body) => { setBusy(true); return api('/api/absen', { token, body }).then((x) => { terima(x); return x }).catch((e) => { setErr(e.message); return null }).finally(() => setBusy(false)) }
  return { d, meeting: d?.meeting || null, room: d?.room || null, log: d?.log || [], offset, err, busy, kirim, muat, loaded: d !== null }
}
