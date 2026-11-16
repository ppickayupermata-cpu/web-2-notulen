// Isi Panduan: SEMUA teks pandu aplikasi ada di sini (bukan lagi tersebar di tiap halaman).
// Tiap topik: ringkas (apa itu), analogi (perumpamaan), kerja (cara kerjanya), cara (langkah pakai), tips (catatan).
// Penulisan **tebal** diubah menjadi huruf tebal oleh komponen Panduan.

export const PINTASAN = [
  ['Umum', [['Ctrl + K', 'Cari SO / PO / produk di semua container'], ['F1', 'Buka Panduan'], ['?', 'Buka daftar pintasan ini'], ['Esc', 'Tutup jendela / keluar layar penuh']]],
  ['Tabel', [['Ctrl + F', 'Cari & Ganti'], ['Enter / Shift + Enter', 'Hasil cari berikutnya / sebelumnya'], ['Ctrl + Z / Ctrl + Y', 'Undo / Redo format'], ['Ctrl + C / Ctrl + V', 'Salin / tempel sel'], ['Ctrl + D / Ctrl + R', 'Isi ke bawah / ke kanan'], ['Shift + klik', 'Perluas pilihan sel'], ['Shift + scroll', 'Geser tabel ke kiri / kanan'], ['F2 / ketik', 'Mengisi sel yang dipilih'], ['Enter / Tab', 'Simpan isian dan pindah sel'], ['Esc', 'Batalkan isian sel']]],
  ['Catat Notulen', [['Enter di bullet', 'Bullet baru (Enter di bullet kosong = selesai)'], ['Tab / Shift + Tab', 'Bullet tingkat 2 / kembali'], ['- spasi di awal baris', 'Jadikan bullet']]],
]

export const TOPIK = [
  {
    id: 'mulai', judul: 'Mulai cepat', ringkas: 'Alur kerja dari file Excel sampai barang jadi, dalam enam langkah.',
    analogi: 'Aplikasi ini seperti papan kontrol gudang. File Excel dari customer adalah daftar belanja, **Monitoring** adalah papan tulis besar tempat tiap truk (container) dicatat, dan **Barang Jadi** adalah rak untuk barang yang sudah selesai.',
    cara: [
      'Masuk lewat menu **Upload Excel**, pilih file packing list. Container dan barisnya terbentuk otomatis.',
      'Buka **Monitoring**, klik **Input** pada container. Isi AREA, TARGET SELESAI, KETERANGAN, TANGGAL PENGIRIMAN, dan tandai baris yang sudah dipacking.',
      'Klik **Submit** supaya semua isian tersimpan sekaligus.',
      'Saat rapat: **Absensi & Meeting** → Meeting dimulai, peserta scan QR, lalu **Catat Notulen** dan bagikan **Live**.',
      'SO yang sudah selesai: klik **Simpan ke list Barang Jadi** di header SO.',
      'Salah hapus atau salah timpa? Buka tab **Terpulihkan** atau menu **Cadangan Data**.',
    ],
    tips: ['Tidak ada yang perlu dihafal: tombol bertanda tanya kecil di judul tiap halaman membuka topik yang sesuai.', 'Tekan **F1** kapan saja untuk membuka Panduan, **Esc** untuk menutup.'],
  },
  {
    id: 'istilah', judul: 'Istilah penting', ringkas: 'Arti kata-kata yang sering muncul.',
    analogi: 'Container itu satu truk pengiriman. Di dalamnya ada beberapa nota belanja (SO). Tiap nota punya beberapa baris barang (SO Item).',
    kerja: [
      '**Container**: satu packing list / satu pengiriman. Nama dan datanya (Buyer, Packing List No, Ship Date, Status) ada di bagian atas file Excel.',
      '**SO** (Sales Order): satu pesanan. **SO Item**: satu baris barang di pesanan itu. **PO**: nomor pesanan dari pembeli.',
      '**AREA, TARGET SELESAI, KETERANGAN, TANGGAL PENGIRIMAN**: kolom isian PPIC. Tidak dibaca dari Excel, diisi manual di tabel Input.',
      '**Tag packing / Dipacking**: kotak hijau kecil di kiri baris, seperti stiker "sudah dibungkus". Waktu dicentang ikut tersimpan.',
      '**Label old / new**: stiker kecil di nomor baris setelah penggabungan. **old** = data yang sudah ada sebelumnya, **new** = data yang baru masuk.',
      '**Cadangan**: salinan data sebelum diubah, seperti foto sebelum renovasi. Dibuat otomatis, bukan oleh Anda.',
      '**Packlist CO ADS**: jenis container khusus dari file DRAFT PL (kolom NO, DSA PO Number, KP SO Number, dst.).',
    ],
  },
  {
    id: 'monitoring', judul: 'Monitoring', ringkas: 'Halaman utama: daftar semua container dan pintu masuk ke tabel Input, Live, dan fitur lain.',
    analogi: 'Seperti papan jadwal di bandara: satu baris per penerbangan (container), dengan tombol untuk membuka detailnya.',
    kerja: [
      'Daftar diperbarui otomatis dari server, jadi perubahan rekan kerja ikut tampil.',
      'Empat tab: **Packlist CO ADS** (hanya container jenis CO ADS), **All Container** (semua; CO ADS diberi lencana), **Terpulihkan**, dan **Barang Jadi**. Angka kecil di tab adalah jumlahnya.',
    ],
    cara: [
      '**Klik 2x** pada Container, Buyer, Packing List No, Ship Date, atau Status untuk mengubahnya langsung. **Enter** menyimpan, **Esc** membatalkan.',
      '**Input**: membuka tabel isian container. **Live**: tampilan hanya-lihat yang selalu terbaru (di sana ada tombol Catat Notulen).',
      '**Pindah data**: memasukkan data container lama ke container baru (lihat topik Pindah data). **Hapus label**: muncul bila container punya label old/new. **Delete**: menghapus container (cadangan dibuat otomatis).',
      'Tombol di kanan atas: **Absensi & Meeting** dan **Gabungkan notulen**.',
    ],
    tips: ['Pakai kotak **Cari** di atas daftar untuk menyaring container, atau **Ctrl + K** untuk mencari di semua tempat.'],
  },
  {
    id: 'input', judul: 'Tabel Input', ringkas: 'Tempat mengisi dan memantau barang per SO di satu container.',
    analogi: 'Seperti lembar Excel yang sudah dipisah per SO, dengan tombol **Submit** sebagai "simpan semua sekaligus" supaya tidak ada yang tersimpan setengah-setengah.',
    kerja: [
      'Yang Anda ketik belum langsung tersimpan. Isian ditampung sebagai draft (sel berwarna) sampai **Submit**. **Batal** membuang semua draft, **Undo** membatalkan satu per satu.',
      'Saat Anda membuka Input, tampilan **Live** rekan kerja ikut menunjukkan kursor dan isian Anda.',
      'Tiap SO punya bagian sendiri dengan header dan tombolnya sendiri.',
    ],
    cara: [
      'Klik sel untuk memilih. **Klik 2x / F2 / langsung ketik** untuk mengisi. **Enter / Tab** menyimpan dan pindah sel, **Esc** membatalkan. Bisa **paste banyak sel** dari Excel.',
      'Tandai **Dipacking** lewat kotak hijau kecil di kiri baris (klik lagi untuk membatalkan). Waktu dicentang tersimpan dan dipakai untuk urutan di notulen.',
      'Klik **Submit (n)** untuk menyimpan n perubahan.',
      '**Edit cells** menampilkan alat tambahan: Kolom, Filter per kolom, Bekukan kolom, Undo/Redo format, warna sel dan teks, tebal, miring, rata, bungkus teks, Merge & Center, Unmerge, Hapus format, Isi ke bawah (Ctrl+D) dan ke kanan (Ctrl+R), **Cari & Ganti** (Ctrl+F), **Riwayat perubahan sel** (siapa dan kapan, bisa mengembalikan nilai), Sorot TARGET yang sudah lewat, tambah / hapus baris, **Unduh Excel**, **Cetak**, dan **Catat Notulen**.',
      'Lencana ringkasan (Dipacking, Terlambat, Target hari ini, AREA belum diisi, jumlah per AREA) bisa diklik untuk menyorot atau menyaring. **Ringkasan** dan **Navigasi SO** menampilkan atau menyembunyikan panelnya. **Filter** membuka pencarian SO, SO Item, Product Code.',
      'Di header tiap SO: **Auto-fit** (lebar kolom sesuai isi), **Samakan ke semua** (pakai ukuran ini untuk semua tabel), **Reset ukuran**, dan **Simpan ke list Barang Jadi**.',
    ],
    tips: ['Klik 2x tepi header kolom untuk menyesuaikan lebar satu kolom.', 'Baris atau kolom yang tidak perlu bisa disembunyikan; tidak ikut terhapus.', 'Pembatalan format memakai **Ctrl + Z / Ctrl + Y**.'],
  },
  {
    id: 'upload', judul: 'Upload Excel (biasa)', ringkas: 'Memasukkan file packing list menjadi container.',
    analogi: 'Seperti memfoto daftar belanja: bagian atas file dibaca sebagai kepala (Container, Buyer, Packing List No, Ship Date, Status), lalu tiap baris sebagai satu barang.',
    kerja: [
      'Kolom AREA sampai TANGGAL PENGIRIMAN di Excel **tidak dibaca**; itu diisi manual di tabel Input.',
      'Tiap kolom Excel dipetakan ke kolom aplikasi. Kolom yang tidak dipakai bisa dipilih **Abaikan**. Kolom wajib: **SO** dan **Qty**.',
      'Bila container yang sama sudah ada, file dibandingkan dengan data tersimpan: baris **Baru** ditambahkan, baris **Berubah / Sudah ada** hanya diperbarui kolom identitasnya (isian dan tag packing tetap utuh).',
    ],
    cara: [
      'Buka **Upload Excel** → **Upload biasa**, seret file atau klik untuk memilih (.xlsx / .xls).',
      'Periksa pemetaan kolom dan kepala file.',
      'Bila container sudah ada, pilih: **Gabungkan** (tambah baris baru, data lama utuh, diberi label old / new), **Custom select** (pilih sendiri baris yang diterapkan), **Buat container baru** (nama harus unik, container lama tidak diubah), atau **Ganti semua** (diganti total).',
      'Klik tombol import / terapkan.',
    ],
    tips: ['Sebelum Ganti / Gabung, cadangan container dibuat otomatis (lihat tab Terpulihkan).', 'Baris lama yang tidak ada di file baru tidak dihapus saat Gabungkan; daftarnya ditampilkan sebagai "baris lama tidak ada di file ini".'],
  },
  {
    id: 'coads', judul: 'Upload CO ADS', ringkas: 'Khusus file DRAFT PL (packing list CO ADS) yang punya banyak sheet.',
    analogi: 'Seperti menyalin hanya tabel inti dari surat pengiriman, tanpa kop surat, alamat, dan catatan kaki.',
    kerja: [
      'Yang diambil hanya tabel: NO, DSA PO Number, KP SO Number, Product Description, Type, Size, Wood Species, Qty, UoM. Kop surat, baris Total, daftar PO di bawahnya, dan catatan tidak ikut.',
      'Tiap sheet (R0, R1, R2, ...) menjadi satu container berjenis CO ADS. NO, PO, dan SO yang kosong pada baris lanjutan diisi dari baris di atasnya.',
      'Total Qty hasil baca dicocokkan dengan baris Total di file, dan satuan yang janggal diberi peringatan.',
    ],
    cara: [
      'Buka **Upload Excel** → **Upload CO ADS**, pilih file.',
      'Centang sheet yang dipakai dan ubah nama container bila perlu. Sheet tanpa judul kolom tidak dicentang otomatis.',
      'Bila nama sudah ada: **Buat container baru**, **Gabungkan** (baris baru saja, label old / new), atau **Ganti semua**.',
      'Klik **Simpan**. Hasilnya ada di Monitoring, tab **Packlist CO ADS**.',
    ],
    tips: ['Tabelnya memakai kolom: NO, DSA PO NUMBER, KP SO NUMBER, PRODUCT DESCRIPTION, TYPE, SIZE, WOOD SPECIES, QTY, UoM, lalu AREA, TARGET SELESAI, KETERANGAN, TANGGAL PENGIRIMAN (kosong).'],
  },
  {
    id: 'pindahdata', judul: 'Pindah data', ringkas: 'Memasukkan data lama ke container yang baru.',
    analogi: 'Seperti memindahkan catatan tulisan tangan dari buku lama ke buku baru yang sudah berisi daftar yang sama.',
    kerja: [
      'Baris dicocokkan lewat **SO + SO Item**. Yang sudah ada di tujuan hanya disalin isiannya (AREA, TARGET, KETERANGAN, TANGGAL PENGIRIMAN, tag packing) ke kolom yang masih kosong. Yang belum ada ditambahkan utuh dengan label **old**; isi tujuan sebelumnya diberi label **new**.',
    ],
    cara: [
      'Di Monitoring, klik **Pindah data** pada container lama.',
      'Pilih **container tujuan**, lalu centang baris lama (ada pilihan cepat: semua, yang sudah terisi, yang belum ada di tujuan).',
      'Atur opsi bila perlu: **Timpa isian yang sudah terisi di tujuan** dan **Hapus dari container lama setelah dipindah** (keduanya bawaan mati).',
      'Klik **Masukkan n baris ke data baru** dan konfirmasi.',
    ],
    tips: ['Cadangan dibuat otomatis, jadi hasilnya bisa dibatalkan lewat Terpulihkan.', 'Perlu container tujuan? Upload file yang sama lalu pilih **Buat container baru**.'],
  },
  {
    id: 'barangjadi', judul: 'Barang Jadi', ringkas: 'Rak untuk SO yang sudah selesai, terpisah dari Monitoring supaya daftar kerja tetap ringkas.',
    analogi: 'Seperti gudang barang jadi: barang yang sudah selesai dipindah dari lantai produksi ke rak, tapi tetap tercatat dan bisa diambil lagi kapan saja.',
    kerja: [
      'Memindahkan SO membawa **semua barisnya** beserta isian, tag packing, dan label. Barang Jadi punya penyimpanan sendiri, jadi **tidak** masuk ke Terpulihkan.',
      'Tidak ikut terhapus oleh pembersihan otomatis 1 bulan.',
      'Bila itu SO terakhir, container menjadi kosong dan hilang dari Monitoring (termasuk link live dan data absensinya). Barisnya tetap aman di Barang Jadi.',
    ],
    cara: [
      'Buka **Input** pada container. Di header SO yang selesai, klik **Simpan ke list Barang Jadi** lalu konfirmasi. Dialog menyebut jumlah baris dan berapa yang belum ditandai dipacking.',
      'Lihat hasilnya di Monitoring → tab **Barang Jadi** (daftar per container).',
      '**Lihat isi** membuka tabel hanya-lihat; di header SO ada **Kembalikan ke Monitoring**. **Kembalikan semua** mengembalikan satu container. Bila container asalnya sudah tidak ada, dibuat lagi.',
    ],
    tips: ['Perubahan yang belum di-Submit harus disimpan atau dibatalkan dulu sebelum memindahkan SO.'],
  },
  {
    id: 'terpulihkan', judul: 'Terpulihkan', ringkas: 'Cadangan container yang bisa dikembalikan ke Monitoring.',
    analogi: 'Seperti tempat sampah di komputer: yang terhapus atau tertimpa belum benar-benar hilang dan bisa diambil lagi.',
    kerja: [
      'Cadangan dibuat **otomatis** sebelum container diganti (Upload), dihapus, digabung, atau data dipindah dari container lama. 8 terakhir per container disimpan.',
      'Memulihkan **tidak membuang** cadangan. Isi container yang sedang tampil dicadangkan dulu, jadi pemulihan juga bisa dibatalkan.',
      'Tanggal upload yang sudah lewat batas hapus otomatis direset ke hari ini supaya data yang dipulihkan tidak langsung terhapus lagi.',
    ],
    cara: [
      'Buka Monitoring → tab **Terpulihkan**. Cari container lewat kotak Cari.',
      '**Lihat isi**: tabel hanya-lihat. **Lihat info**: kartu lengkap (identitas, jumlah baris / SO / PO / Qty, persen terisi, per AREA, daftar SO, perbandingan dengan Monitoring).',
      '**Pindahkan ke Monitoring** memulihkannya. **Buang** menghapus cadangan itu.',
    ],
    tips: ['Cadangan SEMUA container sekaligus ada di menu **Cadangan Data**.'],
  },
  {
    id: 'absensi', judul: 'Absensi & Meeting', ringkas: 'Satu absensi untuk seluruh meeting, tidak per container.',
    analogi: 'Seperti buku tamu digital di pintu ruang rapat: tamu cukup mengisi sekali di depan, tidak perlu mengisi lagi di tiap meja.',
    kerja: [
      '**Meeting dimulai** membuka absensi dan mencatat jam mulai dari jam server (WIB). **Meeting ditutup** menutup absensi dan mencatat jam selesai. Hanya satu meeting berjalan pada satu waktu.',
      'Hanya peserta yang sudah **dikonfirmasi** yang masuk ke notulen. Opsi **Konfirmasi absen otomatis** membuat yang absen langsung terkonfirmasi (bawaan mati karena link QR bersifat publik).',
      'Peserta yang sudah dikonfirmasi mendapat tombol **Lihat live** di HP-nya.',
    ],
    cara: [
      'Di Monitoring, klik **Absensi & Meeting** (atau dari dalam Catat Notulen).',
      'Isi nama meeting, klik **Meeting dimulai**.',
      'Tampilkan QR atau bagikan link; peserta scan dan mengisi nama dan bagian.',
      'Klik **Konfirmasi** per orang atau **Konfirmasi semua**. Bisa **Batalkan** atau hapus entri.',
      'Selesai rapat, klik **Meeting ditutup**. Daftar hadir tetap tersimpan dan terbaca di notulen.',
    ],
    tips: ['**Tutup absensi / Buka absensi** menutup atau membuka form tanpa mengakhiri meeting.'],
  },
  {
    id: 'live', judul: 'Live', ringkas: 'Layar hanya-lihat yang menampilkan pekerjaan Anda secara langsung.',
    analogi: 'Seperti layar TV di ruang rapat yang menayangkan layar PPIC: yang menonton tidak bisa mengubah apa pun.',
    kerja: [
      '**Link live per container**: siapa pun yang memegang link bisa melihat isi container itu, otomatis terbarui, tanpa login dan tanpa bisa mengubah apa pun. Hanya menampilkan container itu.',
      '**Link live meeting** (di Absensi & Meeting): satu link untuk semua container. Tampilannya **otomatis berpindah** ke container yang sedang Anda buka di halaman Input, dengan pemberitahuan "Host pindah ke Container ...". Bila Anda meninggalkan Input, tampilan tetap di container terakhir.',
      'Kursor dan isian yang belum di-Submit ikut terlihat selama Anda membuka Input.',
    ],
    cara: [
      'Link per container: di Monitoring klik **Live** pada container, lalu pakai tombol bagikan / salin link / QR.',
      'Link meeting: buka **Absensi & Meeting**, bagian **Link live meeting**. Bagikan lewat **Salin link / Bagikan / Unduh QR**.',
      '**Link aktif** mematikan sementara; **Ganti link** membuat link baru dan mematikan yang lama.',
    ],
    tips: ['Dua orang PPIC membuka container berbeda sekaligus: yang denyutnya terbaru yang diikuti.'],
  },
  {
    id: 'notulen', judul: 'Catat Notulen', ringkas: 'Notulen disusun otomatis dari tabel dan absensi, lalu bisa diedit bebas.',
    analogi: 'Seperti sekretaris yang menyalin hasil diskusi dari papan tulis ke buku catatan rapat, lengkap dengan daftar hadir.',
    kerja: [
      'Baris tabel yang sudah diisi (AREA / TARGET / KETERANGAN) atau sudah dipacking diringkas per SO. Kesamaan AREA dan TARGET dalam satu PO dicatat sekali.',
      'Baris yang **sudah dicentang** disusun menurut **urutan dicentang**: yang pertama dicentang paling atas, berikutnya di bawahnya. Pilihan **Yang sudah dicentang di paling atas** bisa dimatikan agar yang selesai ditaruh di bawah.',
      '**Peserta** dibaca otomatis dari absensi meeting yang dikonfirmasi. **Jam mulai / selesai** dan tanggal terisi dari tombol Meeting dimulai / ditutup.',
    ],
    cara: [
      'Di tabel Input aktifkan **Edit cells**, lalu klik **Catat Notulen** (juga ada di tampilan Live Monitoring).',
      'Isi Nama meeting, Tanggal, Ruang. Klik langsung di halaman notulen lalu ketik: **Enter** di bullet = bullet baru, **Enter** di bullet kosong = selesai, **Tab / Shift + Tab** = bullet tingkat 2. Ketik "- " di awal baris untuk bullet.',
      '**Peserta terbaru** memperbarui daftar peserta tanpa mengubah bagian lain. **Susun ulang** mengisi ulang seluruh halaman dari tabel dan data meeting. **Absen manual** untuk menambah nama tanpa QR.',
      'Keluarkan hasilnya: **Unduh notulen (.docx)**, **Cetak / PDF**, atau **Salin teks (WhatsApp)**. **Simpan versi** dan **Riwayat versi** menyimpan dan membuka kembali versi halaman.',
    ],
    tips: ['**Gabungkan notulen** (Monitoring, kanan atas) menggabungkan beberapa container menjadi satu halaman: pilih container (semua atau custom select), hanya baris yang sudah terisi atau dipacking yang masuk, seluruh halaman bisa diedit langsung.', 'Notulen tersimpan di perangkat ini sebagai draft sehingga tidak hilang saat jendela ditutup.'],
  },
  {
    id: 'hapus', judul: 'Hapus Data', ringkas: 'Menghapus container atau baris, langsung atau terjadwal.',
    analogi: 'Seperti membersihkan lemari: bisa langsung dibuang, atau ditempeli catatan "buang tanggal sekian".',
    kerja: [
      'Penghapusan manual membuat **cadangan otomatis** (lihat Terpulihkan), jadi bisa dibatalkan.',
      'Hapus otomatis: container yang diupload lebih dari N bulan terhapus sendiri (bawaan 1 bulan, bisa diubah atau dimatikan).',
    ],
    cara: [
      '**Per Container**: centang container, klik **Hapus sekarang (n)**, atau pilih **Hapus pada tanggal** lalu **Jadwalkan hapus (n)**.',
      '**Per SO / Baris**: ketik di kotak Cari (SO, SO Item, Product Code, atau kata apa saja; mencari di semua container), centang baris, lalu hapus sekarang atau jadwalkan.',
      '**Jadwal & Otomatis**: lihat semua jadwal dan **Batalkan** yang tidak jadi, serta atur hapus otomatis (**Aktif** dan jumlah bulan).',
    ],
    tips: ['Belum mencari = tabel kosong; baris baru muncul setelah ada kata cari.'],
  },
  {
    id: 'riwayat', judul: 'Riwayat', ringkas: 'Catatan siapa melakukan apa dan kapan.',
    analogi: 'Seperti buku log di pos satpam: tiap kejadian dicatat dengan jam dan nama.',
    kerja: ['Upload, hapus, pemindahan ke Barang Jadi, dan jadwal tercatat di sini. Dikelompokkan **per container** supaya mudah dicari.'],
    cara: [
      'Pilih jenis (**Tampilkan**) dan **Container**, atau ketik di kotak Cari.',
      '**Pisahkan per container** menampilkan satu kelompok per container; centang kotak kelompok untuk memilih semua catatannya.',
      'Pilih catatan lalu **Hapus (n)** untuk membersihkan riwayat. Data packing list tidak ikut terhapus.',
    ],
  },
  {
    id: 'cadangan', judul: 'Cadangan Data', ringkas: 'Pusat cadangan: per container, penuh, dan unduhan.',
    analogi: 'Seperti brankas dengan tiga laci: satu laci per container, satu laci berisi salinan seluruh gudang, dan satu laci untuk dibawa pulang.',
    kerja: [
      '**Per container**: dibuat otomatis sebelum container diganti, dihapus, atau digabung (8 terakhir per container). Memulihkan tidak membuang cadangan dan isi saat ini dicadangkan dulu.',
      '**Cadangan penuh**: salinan SEMUA container. Dibuat otomatis tiap hari (sebelum pembersihan data lama) dan sebelum pemulihan; 14 terakhir disimpan. Memulihkan cadangan penuh menggantikan seluruh data.',
    ],
    cara: [
      'Tab **Per container**: satu kelompok per container, terbaru di atas. **Lihat info**, **Pulihkan**, atau **Buang**; ada juga **Pulihkan yang terbaru**.',
      'Tab **Cadangan penuh**: **Buat cadangan sekarang**, lalu Lihat info / Pulihkan / Buang.',
      'Tab **Unduh semua data**: **Unduh Excel (semua container)** atau **Unduh cadangan (.json)**.',
    ],
    tips: ['Unduh berkala dan simpan di tempat lain (Google Drive, flashdisk) agar data tidak hanya bergantung pada satu database.', 'Memulihkan cadangan penuh menghapus absensi QR dan link live milik container yang tidak ada di cadangan.'],
  },
  {
    id: 'cari', judul: 'Pencarian', ringkas: 'Dua cara mencari: kotak Cari di tiap halaman dan pencarian menyeluruh.',
    analogi: 'Kotak Cari di halaman seperti mencari di dalam satu laci; pencarian menyeluruh seperti mencari di seluruh gedung.',
    kerja: [
      '**Kotak Cari** (baris horizontal): **Cari (semua kolom)** menerima beberapa kata, semuanya harus cocok. Kolom di sebelahnya menyaring kolom tertentu. **Reset** mengosongkan.',
      'Cakupannya mengikuti tempat: di dalam container = hanya isi container itu; di daftar = Container, Buyer, Packing List; di Hapus Data = semua container.',
      '**Pencarian menyeluruh** (ikon kaca pembesar atau **Ctrl + K**) mencari di isi semua container, jadwal Hapus Data, Barang Jadi, dan Cadangan Data. Hasil dikelompokkan per sumber dan ditandai container-nya.',
    ],
    cara: ['Ketik, pilih hasil dengan panah atas / bawah, tekan **Enter** atau klik. Halaman tujuan terbuka dengan kata cari terisi. **Esc** menutup.'],
  },
  {
    id: 'pintasan', judul: 'Pintasan keyboard', ringkas: 'Tombol cepat di keyboard.', pintasan: true,
  },
  {
    id: 'tampilan', judul: 'Tampilan & akun', ringkas: 'Tema, layar penuh, status simpan, dan keluar.',
    kerja: [
      '**Tema terang / gelap**: ikon matahari / bulan di bilah atas; pilihan diingat.',
      '**Layar penuh**: ikon kotak; kolom pencarian disembunyikan dan bisa dimunculkan lewat toggle Filter. **Esc** untuk keluar.',
      '**Menu** (tiga garis): menyembunyikan / menampilkan menu samping.',
      '**Tersimpan hh.mm.ss** menunjukkan kapan data terakhir tersinkron dengan server.',
      '**Keluar** mengakhiri sesi. Sesi yang habis meminta login ulang; data tidak hilang.',
    ],
  },
  {
    id: 'faq', judul: 'Masalah umum', ringkas: 'Jawaban cepat untuk hal yang sering ditanyakan.',
    kerja: [
      '**Data container hilang dari Monitoring.** Cek tab **Terpulihkan** (diganti / dihapus / digabung) dan tab **Barang Jadi** (SO yang sudah dipindahkan).',
      '**Isian saya belum tersimpan.** Isian di tabel Input baru tersimpan setelah klik **Submit**.',
      '**Tidak bisa memindahkan SO ke Barang Jadi.** Submit atau Batal dulu perubahan yang belum disimpan.',
      '**Peserta tidak muncul di notulen.** Pastikan Meeting dimulai, peserta sudah **dikonfirmasi** (atau aktifkan Konfirmasi absen otomatis), lalu klik **Peserta terbaru**.',
      '**Live tidak berpindah container.** Pakai **Link live meeting**, bukan link per container, dan pastikan Anda membuka halaman **Input**.',
      '**Muncul "Terjadi kesalahan tak terduga".** Data aman di server. Klik **Muat ulang**; bila berulang, klik **Rincian** dan sampaikan ke admin.',
    ],
  },
]
