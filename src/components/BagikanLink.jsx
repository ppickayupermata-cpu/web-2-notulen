import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Copy, Share2, Download, Check } from 'lucide-react'

// QR + link siap dibagikan: salin, bagikan (menu share HP/WhatsApp bila ada), dan unduh QR sebagai gambar PNG berjudul.
export default function BagikanLink({ url, judul, sub = '' }) {
  const [qr, setQr] = useState(''), [ok, setOk] = useState(false)
  useEffect(() => { let on = true; QRCode.toDataURL(url, { width: 360, margin: 1 }).then((d) => on && setQr(d)).catch(() => {}); return () => { on = false } }, [url])
  const salin = async () => { try { await navigator.clipboard.writeText(url); setOk(true); setTimeout(() => setOk(false), 2200) } catch { window.prompt('Salin link ini:', url) } }
  const bagikan = async () => { if (navigator.share) { try { await navigator.share({ title: judul, text: judul + (sub ? ' · ' + sub : ''), url }) } catch { /* dibatalkan */ } } else salin() }
  const unduh = async () => { // gambar PNG: judul + QR + link, siap dicetak / dikirim
    const W = 640, c = document.createElement('canvas'), x = c.getContext('2d'); c.width = W; c.height = 790
    x.fillStyle = '#fff'; x.fillRect(0, 0, W, c.height); x.fillStyle = '#111'; x.textAlign = 'center'
    x.font = 'bold 30px sans-serif'; x.fillText(judul.slice(0, 40), W / 2, 60)
    x.font = '20px sans-serif'; x.fillStyle = '#555'; x.fillText(sub.slice(0, 60), W / 2, 96)
    const img = new Image(); img.src = await QRCode.toDataURL(url, { width: 520, margin: 1 }); await img.decode()
    x.drawImage(img, 60, 120, 520, 520)
    x.font = '16px monospace'; x.fillStyle = '#333'; const lines = url.match(/.{1,52}/g) || [url]; lines.slice(0, 3).forEach((l, i) => x.fillText(l, W / 2, 680 + i * 24))
    c.toBlob((b) => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'QR-' + judul.replace(/[^\w-]+/g, '_').slice(0, 40) + '.png'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 3000) }, 'image/png')
  }
  return (
    <div className="bagikan">
      {qr ? <img className="qrimg" src={qr} alt={'QR ' + judul} width="200" height="200" /> : <div className="qrimg" />}
      <div className="bg-r">
        <input className="bg-url" readOnly value={url} onFocus={(e) => e.target.select()} aria-label="Link" />
        <div className="toolbar wrap">
          <button className="btn sm" onClick={salin}>{ok ? <><Check size={14} /> Tersalin</> : <><Copy size={14} /> Salin link</>}</button>
          <button className="btn sm" onClick={bagikan}><Share2 size={14} /> Bagikan</button>
          <button className="btn sm" onClick={unduh}><Download size={14} /> Unduh QR (.png)</button>
        </div>
      </div>
    </div>
  )
}
