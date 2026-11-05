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

## Upload ulang container yang sama (v10)
Saat file yang diupload cocok dengan container yang sudah tersimpan (nomor container sama, Packing List No sama, atau mayoritas SO sama), baris dibandingkan dengan kunci **SO + SO Item** dan tiap baris diberi status **Baru / Berubah / Sudah ada**. Tiga tombol:
- **Custom select**: centang baris yang mau diterapkan. Baris Baru ditambahkan; baris Berubah/Sudah ada hanya kolom identitasnya (Product Name, Qty, dst) diperbarui, sedangkan AREA, TARGET SELESAI, KETERANGAN, TANGGAL PENGIRIMAN dan tag packing tetap.
- **Import baris baru (N)**: hanya menambahkan baris baru; baris lama tidak disentuh.
- **Ganti semua**: seperti sebelumnya, data lama dihapus dan diganti (ada konfirmasi).
Server: aksi baru `mergeRows` di `api/act.js` (hanya PPIC). Logika pembanding: `src/utils/diffRows.js`.

## Perbaikan lain (v10)
- Lembar Excel (Preview): menyalin sel tidak lagi error (variabel `ed` tidak terdefinisi).
- Kolom yang dibaca dari Excel: Product Code, Product Name, PO, SO, SO Item, Material, Type, Size, Qty, UOM, Group. Kolom lain di file (Glass Type, Nett Weight) diabaikan. AREA, TARGET SELESAI, KETERANGAN, TANGGAL PENGIRIMAN selalu mulai kosong untuk diisi saat meeting dan dipakai notulen.
- File tanpa label (nomor packing list di satu sel di bawah header) terbaca: Packing List No, Buyer (awalan huruf), dan Container terisi otomatis.
- KETERANGAN boleh sampai 300 karakter (sebelumnya terpotong di 80).

## Penyempurnaan upload ulang dan optimalisasi (v10, lanjutan)
- **Gabungkan & pertahankan data lama**: hanya menambah baris baru (kolom input kosong); semua isian yang sudah diedit di Monitoring/Input tetap.
- **Custom select** menampilkan selisih per kolom (lama → baru) dan baris lama yang tidak ada di file baru (bisa dicentang untuk dihapus; bawaannya dipertahankan).
- **Ganti semua** menyimpan cadangan di browser; banner **Batalkan penggantian** di halaman Upload memulihkan container lengkap dengan isian dan tag packing (aksi server `restoreGroup`).
- Peringatan bila SO di file juga ada di container lain.
- **Rumus** kini memakai `utils/formula.js` (tanpa eval): mendukung teks `"..."`, `&`, IFERROR, COUNTIF, SUMIF, dll. Arahkan kursor ke judul kolom untuk melihat huruf kolom.
- Cari & Ganti: regex dibuat sekali, tidak per sel.

## Catat Notulen: per SO dan preview teks bebas (v10)
- Isi notulen disusun **per SO**: semua baris satu SO berurutan, lalu **satu baris kosong** sebagai jarak ke SO berikutnya. Baris yang sudah dipacking tetap di bagian paling bawah (per SO) dan berwarna hijau di Word.
- Preview adalah **editor teks bebas** dalam satu halaman: ketik apa saja. Tombol **Bullet** menjadikan / melepas bullet pada baris terpilih; Enter di bullet = bullet baru, Enter di bullet kosong = selesai daftar; Tab / Shift+Tab menggeser (bullet tingkat 2); baris diawali `*` = judul tebal; baris kosong = jarak.
- File Word mengikuti persis teks di preview (`utils/isiNotulen.js` mengubah teks menjadi blok untuk `makeDocx.js`). Ketikan tersimpan di browser per container; **Susun ulang dari tabel** mengisi ulang dari tabel (dengan konfirmasi bila sudah diedit).
- Warna hijau baris yang sudah dipacking hanya terbawa selama teks barisnya tidak diubah.

### Halaman notulen sepenuhnya bebas diedit (v10, lanjutan)
Seluruh halaman preview (judul, Hari/Tanggal, Tempat, Jam, Peserta, catatan per SO, NOTE) adalah satu editor teks seperti halaman Word. Baris `Hari,Tanggal : ..`, `Tempat : ..`, `Jam : ..`, `Peserta :` tetap dirapikan sejajar di Word; bullet di bawah `Peserta :` menjadi daftar peserta; baris `NOTE : ..` berwarna merah. Tombol **Peserta terbaru** hanya memperbarui daftar peserta (absen QR + manual); **Susun ulang** mengisi ulang seluruh halaman. Judul pada baris pertama (diawali NOTULEN) ikut tampil di kop Word.
Tampilan halaman (`components/HalamanNotulen.jsx`) memakai contenteditable dengan tata letak kertas: kotak judul, keterangan sejajar, bullet, judul `*`, NOTE merah. Tempel selalu menjadi teks polos; Enter/Backspace/Tab bekerja seperti Word untuk bullet.

## Peningkatan produktivitas (v10, final)
**Tabel & scroll**: scroll bar tebal dan kontras; bayangan di tepi kiri/kanan tabel sebagai tanda masih ada kolom di luar layar; posisi gulir diingat (sampai tab ditutup); bar navigasi SO (Lompat ke SO, SO sebelumnya/berikutnya, Atas, Bawah); Shift+scroll menggeser tabel; tombol Cetak (dialog cetak, bisa Simpan sebagai PDF).
**Ringkasan target** (di atas tabel Monitoring): jumlah baris Dipacking, Terlambat, Target hari ini, AREA belum diisi, dan jumlah per AREA (klik untuk memfilter). TARGET terlambat berwarna merah, TARGET hari ini kuning; sorotan aktif secara bawaan.
**Simpan & kolaborasi**: indikator Menyimpan / Tersimpan jam / Offline di bilah atas; peringatan saat menutup halaman yang masih menyimpan; notifikasi bila sel yang baru Anda edit ternyata diubah pengguna lain (nilai server dipakai); data tidak digambar ulang bila isinya sama sehingga posisi gulir dan seleksi tidak loncat.
**Pencarian global** Ctrl+K (SO, PO, produk, AREA, keterangan, container) lalu Enter membuka tabelnya; `?` membuka daftar pintasan.
**Upload**: seret-lepas file; pemetaan kolom manual bila judul kolom berbeda (juga alias umum: Sales Order, Quantity, Description, dst.); tebak baris header; **cadangan otomatis di server** sebelum Ganti semua (tabel `backups`, 5 terakhir per container) dan tombol Batalkan penggantian.
**Notulen**: riwayat versi (15 terakhir, di browser), Simpan versi, Salin teks untuk WhatsApp, Cetak / PDF.
**Catatan `xlsx`**: dipakai versi 0.18.5 dari npm (npm di sebagian komputer menolak paket dari alamat langsung seperti cdn.sheetjs.com, error EALLOWREMOTE). Versi ini punya celah yang diketahui bila membuka file Excel dari sumber yang tidak dipercaya; aman selama yang diupload hanya file packing list internal.
Belum dikerjakan: virtualisasi baris untuk tabel ribuan baris (saat ini mengandalkan `content-visibility`).

## Hanya PPIC, cadangan, riwayat sel (v10, terbaru)
- **Fitur role dihapus**: semua akun di `APP_USERS` adalah PPIC (format `[{"username":"ppic","password":"..."}]`). Akun lama berperan `warehouse` / `readonly` di ENV otomatis DITOLAK saat login, jadi hapus saja dari ENV.
- **Halaman login**: ikon mata untuk menampilkan / menyembunyikan password, plus peringatan Caps Lock.
- **Lembar Excel (Preview) dihapus.**
- **Riwayat perubahan per sel**: pilih sel lalu klik ikon jam (History) di toolbar tabel: tampil siapa, kapan, nilai lama -> baru, dan tombol **Kembalikan**. Disimpan 90 hari (tabel `cell_history`).
- **Menu Cadangan Data**: unduh semua container ke satu file Excel; unduh cadangan `.json`; cadangan otomatis harian di server (14 terakhir, dibuat sebelum pembersihan harian `/api/sweep`) dan **Pulihkan** (keadaan sekarang disimpan dulu sebagai "Sebelum pemulihan" sehingga bisa dibatalkan).
- **Kualitas**: tes otomatis `npm test` (rumus, perbandingan baris upload, notulen, token login); kesalahan di browser dilaporkan otomatis ke Riwayat (jenis Error) dan layar putih diganti pesan ramah (ErrorBoundary).

### Menu hamburger di layar penuh
Di mode layar penuh, tombol hamburger tetap ada di panel kecil kanan bawah. Kliknya membuka sidebar sebagai laci yang menimpa tabel (lebar tabel tidak berkurang); memilih menu, klik di luar laci, atau klik hamburger lagi akan menutupnya. Esc tetap keluar dari layar penuh.

### Format catatan notulen (terbaru)
- Tiap catatan: `(PO) ada di (AREA) target selesai (TARGET SELESAI), ( KETERANGAN )` — keterangan dalam tanda kurung; beberapa keterangan berbeda digabung dengan `;`.
- **Satu SO = satu daftar**: baris pertama diawali SO (`(SO), (PO) ada di ...`) sebagai bullet tingkat 1; catatan berikutnya di SO yang sama (AREA lain atau PO lain) menjadi **bullet tingkat 2** tanpa mengulang SO. Antar SO ada satu baris kosong; yang sudah dipacking di bagian paling bawah dan berwarna hijau.

### Edit sel ala Excel (v10)
Di halaman Input, klik 1x = **memilih** sel (kursor tanda tambah tebal, sel tidak langsung jadi kolom input), klik 2x = membuka kolom input; F2 juga membuka, dan **mengetik langsung** pada sel terpilih mengganti isinya. Enter menyimpan dan pindah ke bawah (Shift+Enter ke atas), Tab ke kanan (Shift+Tab ke kiri), Esc membatalkan dan mengembalikan nilai lama. Panah menggerakkan pilihan, Shift+panah / seret mouse / Shift+klik memperluas pilihan, sehingga **Merge & Center** cukup: seret rentang lalu klik tombolnya.

## Update 1–9 (notulen PPIC, Vercel)
1. **Pantau absensi** (Monitoring → kolom Aksi): QR + link absensi per container (salin, bagikan lewat menu share HP, unduh QR `.png`), daftar yang absen, **Konfirmasi / Batalkan / Konfirmasi semua**, buka/tutup absensi, QR baru. Hanya peserta yang sudah dikonfirmasi masuk ke notulen.
2. **Paste multi-sel** di halaman Input: tempel dari Excel / Google Sheets (tab + Enter) mengisi banyak sel sekaligus dari sel terpilih; satu nilai ke banyak sel terpilih mengisi semuanya; data yang lebih kecil dari pilihan diulang seperti Excel. **Kolom kalender** membaca banyak penulisan tanggal (25/10/2026, 25-10-26, 25 Okt 2026, Minggu, 25 Oktober 2026, 2026-10-25, nomor seri Excel); yang tidak terbaca dilewati dan dilaporkan. Paste / isi bawah / Delete / Ganti semua = **satu langkah Undo**.
3. **Tombol Edit dihapus** di halaman Input (langsung bisa diisi). Header daftar Monitoring (Container, Buyer, dst.) juga langsung diedit dengan klik 2x, tanpa tombol Edit.
4. **Halaman Input satu layar penuh**: tidak ada scroll halaman, hanya tabel yang punya scroll.
5. **Edit cells**: semua alat edit (warna, arah teks, merge & center, unmerge, kolom, cari, dst.) diringkas di satu tombol yang membuka / menutup panelnya.
6. Info "N sel dipilih / Terisi / Jumlah" dipindah ke **bilah status tetap di bawah tabel** (tidak lagi menggeser tabel); pesan hasil paste tampil di sana.
7. **View → Live (read-only)**: tombol Live di Monitoring membuka tampilan yang ter-update tiap 4 detik. **Bagikan link live** menghasilkan link `/?live=TOKEN` (QR, salin, bagikan) yang bisa dibuka siapa pun tanpa login hanya untuk MELIHAT (perubahan baris berkedip). Admin bisa mematikan link atau menggantinya. Alur absen: peserta absen di HP → admin mengkonfirmasi → tombol **Lihat live** muncul di halaman absen HP peserta.
8. **Layar penuh**: empat tombol diganti **satu tombol melayang** yang bisa diseret ke mana saja dan menempel ke tepi seperti magnet (animasi ease-in-out); klik membuka menu (menu, pencarian, tema, keluar); 10 menit tidak dipakai memudar dan setengah bersembunyi di tepi, klik sekali memunculkannya lagi. Posisi diingat.
9. **Gabungkan notulen** (tombol di atas daftar Monitoring): pilih semua atau custom select container, proses, lalu preview yang bisa diedit langsung seperti Catat Notulen (unduh Word, cetak/PDF, salin WhatsApp, peserta digabung dari absensi terkonfirmasi tiap container). Tata letak: tidak ada baris kosong berlebih setelah "Peserta :" dan hanya satu baris kosong sebelum catatan; antar container pada notulen gabungan dipisah dua baris kosong.
Tabel baru otomatis dibuat saat permintaan pertama: `live_links`, kolom `confirmed` pada `absen_log`.

### Header biru + ringkasan per AREA
- **Header (judul kolom) semua tabel berwarna biru** (putih di atasnya) agar mudah dibedakan dari isi tabel; kolom yang bisa diisi memakai biru yang sedikit lebih terang. Tema gelap memakai biru tua. (File Excel hasil unduhan tidak diubah: tetap mengikuti format acuan.)
- **Ringkasan per AREA** otomatis di bagian paling bawah notulen, tepat di atas baris `NOTE : ...`:
  `AREA PC` lalu bullet semua catatan di area itu, kemudian `AREA WC`, dst. Penulisan AREA tidak peka huruf besar/kecil (PC = pc = Pc digabung). Urutan AREA mengikuti kemunculan pertama di tabel; catatan tanpa AREA ditaruh di akhir dengan judul `TANPA AREA`. Baris yang sudah dipacking tidak masuk ringkasan. Pada notulen gabungan, ringkasan menggabung semua container terpilih dan tiap bullet diberi nama container-nya.

## Update berikutnya (packing, live realtime, tata letak Input)
- **Tombol packing** di tepi baris sekarang juga **mengisi AREA = "PACKING"**; klik lagi = tag dilepas dan tulisan PACKING dihapus (isi AREA lain tidak ikut terhapus). Berlaku di halaman Input maupun Live admin.
- **Halaman Input lebih lega**: tombol **Edit cells** dan ringkasan (Dipacking, Terlambat, Target hari ini, AREA belum diisi, per AREA) sejajar dalam satu baris. **Filter**, **Ringkasan**, dan **Navigasi SO** bisa disembunyikan dengan tombolnya (pilihan diingat); petunjuk pemakaian pindah ke bilah status di bawah tabel.
- **Live realtime tanpa Submit**: saat admin mengetik di halaman Input, isian yang belum di-Submit (kuning, miring) dan **kursor admin** (sel berbingkai oranye berlabel nama + ✎ saat mengetik) langsung terlihat di tampilan live pengunjung, ter-update tiap 2 detik. Setelah Submit / Batal / admin keluar, tanda itu hilang (kedaluwarsa otomatis 20 detik tanpa denyut). Tombol "Ikuti kursor admin" membuat layar pengunjung menggulir otomatis ke sel yang sedang diedit.
- **Tampilan live nyaman digeser & di-zoom**: seluruh tabel berada dalam SATU area geser, jadi menyentuh bagian mana pun pada tabel langsung menggeser (jari di HP, seret mouse di desktop). Zoom: cubit dua jari di HP, Ctrl+scroll di desktop, atau tombol −, 100%, +, Pas lebar layar. **Layar penuh** tersedia (tombol melayang yang bisa diseret berisi zoom, pas layar, ikuti kursor, tema, keluar).
- Server: tabel baru `live_presence` (dibuat otomatis), aksi `livePresence` (PPIC), dan `/api/live` mengembalikan `presence`.

### Watermark "La Von So"
Teks watermark bergaya **liquid glass** (kaca bening berkilau) di kanan bawah semua halaman, termasuk login, absen HP, dan live. Hanya hiasan: tidak bisa diklik atau dipilih (klik tembus ke bawahnya), berada di bawah dialog dan tombol melayang, **tidak ikut tercetak / PDF**, menyesuaikan tema terang dan gelap, mengecil di layar sempit, dan animasi kilaunya berhenti bila pengguna mengaktifkan "kurangi gerakan". Komponen: `src/components/Watermark.jsx`; gaya `.wm` di `styles.css`. Untuk mengganti teks atau menghapusnya, ubah / hapus satu baris `<Watermark />` di `src/main.jsx`.

## Perbaikan upload ulang, cadangan, dan pemulihan (v11)
**Bug fatal: data hilang setelah Pulihkan.** Penyebab: data yang dipulihkan membawa tanggal upload aslinya; bila sudah lewat batas hapus otomatis (bawaan 1 bulan), pembersihan otomatis (`sweep`, jalan tiap ada yang membuka aplikasi) langsung menghapusnya lagi. Pemulihan cadangan penuh juga membawa jadwal hapus yang sudah jatuh tempo, yang menghapus data kembali. Cadangan yang dipakai pun dibuang sehingga tidak ada jalan kembali.
- Pemulihan sekarang memulai lagi tanggal upload dari hari ini bila tanggal aslinya sudah kedaluwarsa (`api/_pulih.js`), dan jadwal hapus yang sudah lewat tidak ikut dipulihkan.
- Cadangan yang dipakai **tidak dibuang**; isi container yang sedang tampil dicadangkan dulu (jenis "Sebelum pemulihan") sehingga pemulihan bisa dibatalkan.
- Cadangan per container kini dibuat otomatis juga **sebelum Delete / hapus baris / Gabungkan / Pindah data** (8 terakhir per container, kolom baru `backups.kind`, dibuat otomatis). Tombol **Pulihkan** ada di halaman Upload Excel dan di Cadangan Data (panel "Cadangan per container").

**Upload file yang sama:** tombol baru **Buat container baru** (nama usulan `<container>-2`, harus unik; container lama tidak diubah). Baris lama yang tidak ada di file baru ditampilkan di daftar "tidak ada di file ini" dan dipastikan tetap ada saat Gabungkan.

**Label OLD / NEW:** saat Gabungkan (atau Custom select / Pindah data), baris yang sudah ada diberi label **old** dan baris yang baru masuk **new**; tampil sebagai chip kecil di bawah nomor baris tabel. Tombol **Hapus label** muncul di kolom Aksi bila container punya label.

**Pindah data (kolom Aksi, di samping Delete):** pilih container tujuan, centang baris lama. Baris yang sudah ada di tujuan (SO + SO Item sama) hanya disalin isiannya ke kolom yang masih kosong (opsi "Timpa" tersedia); baris yang belum ada ditambahkan dengan label old. Opsi "Hapus dari container lama" bawaannya mati. Server: aksi `moveRows`, `clearLabels`; logika: `rencanaPindah` di `utils/diffRows.js`.

Tes: `npm test` (tambahan: `tests/pulih.test.mjs`, kasus a,b,c + a,b,d dan Pindah data di `tests/diffRows.test.mjs`).

## Data Pulihan, kartu info, dan perbaikan tata letak (v11b)
- **Menu Data Pulihan** (di bawah Monitoring): daftar file cadangan container dengan kolom seperti Monitoring (Container, Buyer, Packing List No, Ship Date, Status, Baris) ditambah Jenis, waktu cadangan, dan status "Di Monitoring". Aksi: **Lihat isi** (tabel baris yang sama seperti Monitoring, hanya lihat), **Lihat info**, **Pindahkan ke Monitoring** (memulihkan langsung; bila container sudah ada, isinya dicadangkan dulu), **Buang**. Filter Container / Buyer sama seperti Monitoring.
- **Lihat info** juga ada di Cadangan Data (cadangan penuh dan cadangan per container). Kartu info: identitas file, jenis / waktu / pembuat cadangan, perbandingan dengan Monitoring sekarang, jumlah baris / SO / PO / Qty, persentase AREA / TARGET / KETERANGAN / TANGGAL PENGIRIMAN yang terisi, baris dipacking, label old/new, ringkasan per AREA dan daftar SO. Untuk cadangan penuh: tabel isi tiap container. Server: aksi `backupInfo`, `snapshotInfo`.
- **Teks bocor**: panel Upload / Cadangan / Pindah data dibatasi lebar 560 px sehingga tombol dan tabel meluap (kini `.panel.wide`); tombol di kolom Aksi tidak turun baris (kini membungkus); teks panjang di pesan, judul, dialog, dan baris cadangan memakai `overflow-wrap`; tombol panjang boleh turun baris. Semua di akhir `styles.css`.
- **Ruang kosong di kanan tabel (kolom Aksi)**: sel `td.actions` memakai `display:flex` sehingga bukan lagi sel tabel (tidak ikut melebar dan garis barisnya terpotong). Kini `display:table-cell` dengan tombol membungkus ke bawah, dan kolom Aksi mengisi sisa lebar tabel.
- **Audit v11b**: pembersihan otomatis / terjadwal kini mencadangkan container sebelum menghapusnya (muncul di Data Pulihan); id baris pratinjau Data Pulihan dibuat unik per cadangan agar format sel di browser tidak tercampur antar cadangan.

## Upload CO ADS dan tab Monitoring (v12)
- **Upload Excel punya dua pilihan:** *Upload biasa* (format lama) dan *Upload CO ADS* (menyaring file DRAFT PL). CO ADS membaca semua sheet (R0, R1, R2, ...), tiap sheet = satu container berjenis CO ADS (`groups.kind = 'coads'`, kolom dibuat otomatis). Yang diambil hanya tabel: NO, DSA PO Number, KP SO Number, Product Description, Type, Size, Wood Species, Qty, UoM. Dibuang: kop surat/alamat, baris Total, daftar PO di bawah Total, catatan, kolom liar di luar tabel. NO / PO / SO yang kosong pada baris lanjutan (termasuk sel gabungan) diisi dari baris di atasnya. Sheet tanpa judul kolom (Sheet1) dibaca sebagai kolom A-I standar dan tidak dicentang otomatis. Total Qty hasil baca dibandingkan dengan baris Total di file; UoM yang janggal (mis. PAA) diberi peringatan. Parser: `src/utils/parseCoAds.js` (tes memakai file asli di `tests/fixtures`).
- Nama container usulan: `<nama file> - <nama sheet>`. Bila nama sudah ada: *Buat container baru* (bawaan, akhiran -2), *Gabungkan* (hanya baris baru, label old/new, cadangan otomatis), atau *Ganti semua* (cadangan otomatis).
- **Tabel CO ADS** memakai tabel edit yang sama persis (Input, Live, notulen, tag packing, ekspor), hanya kolomnya: NO, DSA PO NUMBER, KP SO NUMBER, PRODUCT DESCRIPTION, TYPE, SIZE, WOOD SPECIES, QTY, UoM + AREA, TARGET SELESAI, KETERANGAN, TANGGAL PENGIRIMAN. Field di database memakai kunci yang sama dengan container biasa (po, so, productName, type, size, material, qty, uom) ditambah `no`.
- **Monitoring** kini punya tiga tombol pilihan: *Packlist CO ADS*, *All Container* (semua, CO ADS bertanda lencana), dan *Terpulihkan* (isi menu Data Pulihan sebelumnya, yang kini dipindah ke sini dan dihapus dari sidebar).
