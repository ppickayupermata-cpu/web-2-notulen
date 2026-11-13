// Nama container yang disebut di keterangan riwayat ("... Container X · ..."), dipakai untuk mengelompokkan Riwayat per container
// (file berawalan _ tidak dijadikan endpoint)
export const containerDari = (detail) => (String(detail ?? '').match(/Container (.+?)(?: · | → |: |, | [(]|$)/) || [])[1]?.trim() || ''
