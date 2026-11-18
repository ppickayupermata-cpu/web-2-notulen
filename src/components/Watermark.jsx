// Watermark teks "La Von So" bergaya liquid glass di kanan bawah. Hanya hiasan: tidak bisa diklik / dipilih (klik tembus ke bawahnya),
// berada di bawah dialog dan tombol melayang, tidak ikut tercetak, dan menyesuaikan tema terang / gelap.
export default function Watermark() {
  return <div className="wm" aria-hidden="true"><span>La Fonzo</span></div>
}
