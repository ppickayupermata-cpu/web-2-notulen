// Pekan absensi meeting: meeting dilaksanakan hari RABU, jadi absensi direset tiap Rabu 00.00 WIB (Asia/Jakarta, UTC+7 tanpa DST).
// (file berawalan _ tidak dijadikan endpoint)
const WIB = 7 * 3600e3, HARI = 86400e3
// awal pekan = Rabu 00.00 WIB terakhir yang <= sekarang
export function awalPekanRabu(now = new Date()) {
  const w = new Date(now.getTime() + WIB)                    // "jam dinding" WIB dibaca lewat getUTC*
  const mundur = (w.getUTCDay() - 3 + 7) % 7                 // 0 = Minggu ... 3 = Rabu
  return new Date(Date.UTC(w.getUTCFullYear(), w.getUTCMonth(), w.getUTCDate() - mundur) - WIB)
}
export const resetBerikutnya = (now = new Date()) => new Date(awalPekanRabu(now).getTime() + 7 * HARI)
