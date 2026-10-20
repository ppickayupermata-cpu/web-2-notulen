const BLN = ['JANUARI','FEBRUARI','MARET','APRIL','MEI','JUNI','JULI','AGUSTUS','SEPTEMBER','OKTOBER','NOVEMBER','DESEMBER']
const HR = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu']
export const tgl = (s) => { const d = new Date(s + 'T00:00'); return `${HR[d.getDay()]}, ${String(d.getDate()).padStart(2,'0')} – ${BLN[d.getMonth()]} - ${d.getFullYear()}` }
export const jam = (s) => (s || '').replace(':', '.')
