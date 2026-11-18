// Kolom identitas (hasil upload Excel)
export const INFO_COLS = [
  { key: 'productCode', label: 'Product Code' },
  { key: 'productName', label: 'Product Name' },
  { key: 'po', label: 'PO' },
  { key: 'so', label: 'SO' },
  { key: 'soItem', label: 'SO Item' },
  { key: 'material', label: 'Material' },
  { key: 'type', label: 'Type' },
  { key: 'size', label: 'Size' },
  { key: 'qty', label: 'Qty' },
  { key: 'uom', label: 'UOM' },
  { key: 'group', label: 'Group' },
]
// Kolom input (tanpa persen). type: text | date
export const INPUT_COLS = [
  { key: 'area', label: 'AREA', type: 'text' },
  { key: 'target', label: 'TARGET SELESAI', type: 'date' },
  { key: 'ket', label: 'KETERANGAN', type: 'text' },
  { key: 'kirim', label: 'TANGGAL PENGIRIMAN', type: 'date' },
]
export const ALL_COLS = [...INFO_COLS, ...INPUT_COLS]

// Packing list CO ADS: kolom tabel yang tampil (memakai field yang sama dengan container biasa: po = DSA PO, so = KP SO, material = Wood Species)
export const CO_ADS_COLS = [
  { key: 'no', label: 'NO' },
  { key: 'po', label: 'DSA PO NUMBER' },
  { key: 'so', label: 'KP SO NUMBER' },
  { key: 'productName', label: 'PRODUCT DESCRIPTION' },
  { key: 'type', label: 'TYPE' },
  { key: 'size', label: 'SIZE' },
  { key: 'material', label: 'WOOD SPECIES' },
  { key: 'qty', label: 'QTY' },
  { key: 'uom', label: 'UoM' },
  ...INPUT_COLS,
]
export const isCoAds = (g) => g?.kind === 'coads'
export const colsFor = (g) => (isCoAds(g) ? CO_ADS_COLS : ALL_COLS)
