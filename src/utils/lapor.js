import { api } from '../api.js'
// Kesalahan di browser dilaporkan diam-diam ke server (tampil di menu Riwayat, jenis Error) supaya masalah di komputer lain tidak perlu dilaporkan manual.
const seen = new Set()
export function lapor(token, e, where = '') {
  try {
    const msg = String(e?.message || e || '').slice(0, 220)
    if (!token || !msg || /ResizeObserver|Script error|Failed to fetch|NetworkError/i.test(msg)) return
    const k = msg + where; if (seen.has(k) || seen.size >= 15) return
    seen.add(k)
    api('/api/act', { token, body: { action: 'clientError', message: msg, where: where || location.pathname, stack: String(e?.stack || '').split('\n').slice(0, 3).join(' | ') } }).catch(() => {})
  } catch { /* melapor tidak boleh membuat error baru */ }
}
