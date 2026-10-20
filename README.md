# Monitoring Packing List

## Pasang di Vercel
1. Import project ke Vercel.
2. Tab **Storage** > buat database **Neon (Postgres)** dan hubungkan ke project (DATABASE_URL terisi otomatis).
3. Settings > Environment Variables: isi `APP_USERS`, `AUTH_SECRET`, `CRON_SECRET` (contoh di `.env.example`).
4. Deploy. Tabel dibuat otomatis saat pertama dipakai.

## Dev lokal
Salin `.env.example` ke `.env.local` (DATABASE_URL isi dari Neon), lalu `npm install && npm run dev`.

## Struktur
- `api/` server (login, data, act, sweep) | `src/pages` halaman | `src/components` komponen
- `src/context` data (sinkron ke server) | `src/utils` filter & pembaca Excel | `src/config.js` kolom & hak akses

## Perubahan terbaru
- **Tabel per SO**: di Monitoring (View dan Input), Hapus per baris, dan pratinjau Upload Excel, tiap SO tampil di tabel sendiri, tersusun ke bawah. Semua tabel memakai lebar kolom yang sama persis (table-layout fixed + colgroup; ubah lebar kolom berlaku untuk semua tabel). Unduh Excel ikut memisahkan blok per SO.
- **Qty**: persen di bawah Qty dan kotak Total Qty dihapus.
- **Wrap text**: tombol di toolbar tabel (ikon bungkus teks); ikut terbawa ke hasil Unduh Excel.
- **Kolom input**: sel input memenuhi seluruh kotak sel (input/textarea penuh).
- **Lembar Excel (Preview)**: hanya untuk melihat file; tidak bisa diedit dan tidak ada tombol unduh (utils/xlsxPatch.js dihapus).
- **Catat Notulen**: tombol di kanan "Unduh Excel" (Monitoring > View dan Input). Isi: data meeting, peserta, notulen dari tabel (PO dengan AREA + TARGET sama digabung dengan koma, KETERANGAN dalam tanda kurung), dan unduh Word (.docx) berdasarkan public/template-notulen.docx. Data meeting tersimpan di browser (localStorage) per container.
- **Ukuran per tabel**: tarik tepi header kolom pada satu tabel SO untuk mengubah ukuran tabel itu saja; tombol "Samakan ke semua" memakai ukuran tabel itu untuk semua tabel, "Reset ukuran" mengembalikan tabel itu ke bawaan.

## Perbaikan
- Kolom beku (freeze) di mode Edit/Input: sel input pada kolom beku sebelumnya kehilangan sifat sticky sehingga bergeser dan menumpuk; sudah diperbaiki.
- Rekam suara dan catatan suara di Catat Notulen dihapus; notulen dibuat dari data Excel yang sudah diupload.
- Ukuran kolom per tabel SO (tarik tepi header); "Samakan ke semua" dan "Reset ukuran" ada di tiap tabel; judul SO menempel di kiri saat digulir.

## Editor tabel: fitur baru (v8)
- **Merge & Center** (hanya menggabungkan) dan **Unmerge** (melepas semua gabungan yang bersinggungan dengan seleksi, termasuk bila yang terpilih hanya sel yang tertutup, mis. lewat klik nomor baris). Merge yatim (baris sudah dihapus) dibersihkan otomatis.
- **Isi ke bawah / kanan**: Ctrl+D, Ctrl+R (menyalin nilai dan format). **Ctrl+Enter** mengisi seluruh seleksi, **Ctrl+;** mengisi tanggal hari ini di kolom tanggal.
- **Cari & Ganti**: Ctrl+F / Ctrl+H (Enter = berikutnya, Shift+Enter = sebelumnya, Aa = peka huruf besar-kecil; Ganti dan Ganti semua hanya di mode Edit).
- **Bar statistik** seleksi: jumlah sel, terisi, jumlah, rata-rata, min, maks.
- **Auto-fit** lebar kolom per tabel SO (klik dua kali tepi header untuk satu kolom).
- **Sorot TARGET terlewat**: tombol jam alarm; TARGET yang sudah lewat dan belum ada TANGGAL PENGIRIMAN diberi warna merah, ikut terbawa ke Excel.
- **AREA**: saran pilihan (dropdown) dari daftar bawaan + nilai yang sudah ada.
- **Klik nomor baris** memilih seluruh baris (Shift untuk memperluas). **Ctrl+B / Ctrl+I** menebalkan / memiringkan seleksi.
- **Rumus** baru: UPPER, LOWER, LEN, TRIM, CONCAT, LEFT, RIGHT, AND, OR, NOT (selain SUM, AVERAGE, MIN, MAX, COUNT, IF, ROUND, ABS).
- **Unduh Excel**: dropdown AREA (peringatan, bukan penolakan), autofilter (bila satu tabel SO), siap cetak A4 landscape 1 halaman lebar, judul kolom berulang, format angka Qty, nama sheet = container.
- **Optimasi**: tabel SO di luar layar tidak dirender (content-visibility), sehingga lebih ringan untuk banyak SO.
- Catatan lisensi: HyperFormula (GPLv3/komersial) dan Handsontable (lisensi komersial) sengaja tidak dipasang; mesin rumus tetap buatan sendiri.

## Absensi QR, tag packing, dan aturan notulen (v9)
**Setelah menimpa project:** jalankan `npm install` (ada paket baru `qrcode`). Dua tabel baru (`absen_rooms`, `absen_log`) dibuat otomatis oleh `ensureDb` pada permintaan pertama; tidak perlu migrasi manual. Endpoint baru: `api/absen.js` (Vercel otomatis membuat rute `/api/absen`).

- **Absensi QR (tanpa login)**: di Catat Notulen > Absensi, klik "Buat QR absensi". Peserta scan QR, isi Nama dan Bagian, lalu Submit. Link berbentuk `https://domain-anda/?absen=<id>` dan membuka halaman publik (tanpa login). Waktu absen dicatat oleh server saat Submit (WIB, lengkap dengan detik) dan langsung tampil di log absensi (halaman peserta dan jendela PPIC, diperbarui tiap 3-4 detik). Jam di halaman absen berwarna merah, tebal, besar, dengan detik. Di notulen hanya tercantum "Nama ( BAGIAN )". Nama + bagian yang sama tidak dicatat dua kali. PPIC bisa menutup/membuka absensi, menghapus entri, atau membuat QR baru. Saat uji lokal di komputer, ubah alamat di kotak link ke IP komputer lalu "Perbarui QR" agar HP bisa membukanya.
- **Tag packing**: tombol di ujung kiri dan kanan tiap baris tabel (tidak ada di header; tetap menempel saat tabel digulir). Klik = baris ditandai sudah dipacking (hijau), klik lagi = batal. Boleh untuk PPIC dan Warehouse; Read Only tidak. Waktu tag dicatat server (kolom data `packed`). Baris yang sudah dipacking diwarnai hijau juga di Unduh Excel.
- **Notulen**: format `(SO), (PO) ada di (AREA) target selesai (TARGET SELESAI), KETERANGAN`. Dalam satu PO, kesamaan AREA + TARGET dicatat sekali. SO sama + PO sama dengan AREA berbeda ditulis satu baris: `SO, PO ada di A target selesai T, KET, PO ada di B target selesai T, KET`. Baris yang sudah dipacking ditaruh paling bawah di Word dengan warna hijau. Judul kelompok dan tanggal pengiriman bisa diedit langsung di preview. Sel berisi rumus dihitung dulu sebelum masuk notulen.
