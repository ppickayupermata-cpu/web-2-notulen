// Barang Jadi: ringkasan sebelum memindahkan satu SO dari Monitoring (kunci SO sama dengan pengelompokan di DataTable)
export const kunciSo = (r) => String(r?.so ?? '').trim() || '(tanpa SO)'
export function infoPindahSo(rows, groupId, so) {
  const semua = rows.filter((r) => r.groupId === groupId)
  const target = semua.filter((r) => kunciSo(r) === so)
  const packed = target.filter((r) => !!r.packed).length
  return { ids: target.map((r) => r.id), total: target.length, packed, belum: target.length - packed, containerKosong: target.length > 0 && target.length === semua.length }
}
