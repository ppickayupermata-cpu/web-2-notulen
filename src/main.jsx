import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import AbsenRoom from './pages/AbsenRoom.jsx'
import LiveView from './pages/LiveView.jsx'
import Watermark from './components/Watermark.jsx'
import { UiProvider } from './context/UiContext.jsx'
import './styles.css'
// Link QR absensi (?absen=ID) membuka halaman absen publik tanpa login
// Link live read-only (?live=TOKEN) juga publik: hanya melihat, tanpa login
const q = new URLSearchParams(location.search), absen = q.get('absen'), live = q.get('live')
createRoot(document.getElementById('root')).render(<UiProvider>{live ? <LiveView token={live} /> : absen ? <AbsenRoom id={absen} /> : <App />}<Watermark /></UiProvider>)
