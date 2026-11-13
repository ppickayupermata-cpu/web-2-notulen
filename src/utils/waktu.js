// Waktu meeting selalu dalam WIB (Asia/Jakarta), tidak bergantung zona waktu perangkat.
const fmt = (opt) => new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', ...opt })
export const jamWIB = (iso) => (iso && !Number.isNaN(Date.parse(iso)) ? fmt({ hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso)) : '')      // '13:05'
export const tglWIB = (iso) => { if (!iso || Number.isNaN(Date.parse(iso))) return ''; const p = Object.fromEntries(fmt({ year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(iso)).map((x) => [x.type, x.value])); return `${p.year}-${p.month}-${p.day}` } // '2026-11-12'
