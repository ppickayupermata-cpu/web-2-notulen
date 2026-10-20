import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import AbsenRoom from './pages/AbsenRoom.jsx'
import { UiProvider } from './context/UiContext.jsx'
import './styles.css'
// Link QR absensi (?absen=ID) membuka halaman absen publik tanpa login
const absen = new URLSearchParams(location.search).get('absen')
createRoot(document.getElementById('root')).render(<UiProvider>{absen ? <AbsenRoom id={absen} /> : <App />}</UiProvider>)
