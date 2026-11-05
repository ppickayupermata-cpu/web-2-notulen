// Tanggal upload yang dipakai saat memulihkan data (file berawalan _ tidak dijadikan endpoint)
// tanggal upload yang dipakai saat memulihkan: bila tanggal asli sudah melewati batas hapus otomatis, mulai lagi dari hari ini
// (kalau tidak, pembersihan otomatis menghapus data yang baru dipulihkan pada permintaan berikutnya)
export function tanggalPulih(addedAt, cfg, today) {
  if (!addedAt || !/^\d{4}-\d{2}-\d{2}/.test(addedAt)) return today
  if (!cfg?.autoDelete) return addedAt
  const d = new Date(addedAt.slice(0, 10) + 'T00:00:00Z'); d.setUTCMonth(d.getUTCMonth() + (cfg.months || 1))
  return d.toISOString().slice(0, 10) <= today ? today : addedAt
}

