import { useEffect } from 'react'

// Halaman berisi tabel: area isi tidak ikut tergulung, hanya tabel yang punya scroll (kanan-kiri dan atas-bawah).
// Dipakai bersama oleh beberapa komponen yang bertumpuk (mis. Monitoring + Input), jadi pakai penghitung agar kelas tidak terlepas terlalu awal.
let n = 0
export function useFill(on = true) {
  useEffect(() => {
    const c = document.querySelector('.content')
    if (!on || !c) return
    n++; c.classList.add('fill')
    return () => { n = Math.max(0, n - 1); if (!n) c.classList.remove('fill') }
  }, [on])
}
