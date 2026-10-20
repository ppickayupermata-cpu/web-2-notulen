import { useEffect, useState } from 'react'
// Jam besar berwarna merah, tebal, lengkap dengan detik (WIB). offset = selisih jam server dan jam perangkat (ms), supaya jam akurat.
const TZ = 'Asia/Jakarta'
const fJam = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
const fTgl = new Intl.DateTimeFormat('id-ID', { timeZone: TZ, weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
const fTglPendek = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' })
export const jamStr = (d) => fJam.format(new Date(d))
export const tglStr = (d) => fTgl.format(new Date(d))
export const tglPendek = (d) => fTglPendek.format(new Date(d))

export default function JamMerah({ offset = 0, compact = false }) {
  const [t, setT] = useState(() => Date.now() + offset)
  useEffect(() => { const i = setInterval(() => setT(Date.now() + offset), 250); return () => clearInterval(i) }, [offset])
  return (
    <div className={'jam-wrap' + (compact ? ' compact' : '')} role="timer" aria-label="Jam sekarang">
      <div className="jam-merah">{jamStr(t)}<small>WIB</small></div>
      <div className="jam-tgl">{tglStr(t)}</div>
    </div>
  )
}
