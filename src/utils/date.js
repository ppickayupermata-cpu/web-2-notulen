const p = (n) => String(n).padStart(2, '0')
const fmt = (d) => `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
export const today = () => fmt(new Date())
export const tomorrow = () => { const d = new Date(); d.setDate(d.getDate() + 1); return fmt(d) }
// tambah bulan pada tanggal "yyyy-mm-dd" (31 Jan + 1 bulan -> 28/29 Feb)
export function addMonths(s, m) {
  const [y, mo, da] = s.split('-').map(Number)
  const last = new Date(y, mo - 1 + m + 1, 0).getDate()
  return fmt(new Date(y, mo - 1 + m, Math.min(da, last)))
}
export const showDate = (s) => { const [y, m, d] = s.split('-'); return `${d}/${m}/${y}` }
