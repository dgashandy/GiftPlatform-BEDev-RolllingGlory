# Dokumentasi Proyek

Dokumen ini memberikan tinjauan komprehensif mengenai arsitektur, tumpukan teknologi (technology stack), dan detail modul Rolling Glory Gift Platform.

---

## 1. Tumpukan Teknologi Inti (Core Technology Stack)

### Mengapa NestJS 10+?
NestJS dipilih karena strukturnya yang kokoh, modular, dan dukungan TypeScript kelas utama. Versi 10+ secara khusus memberikan:
- **SWC Compiler**: Peningkatan signifikan pada kecepatan build dan pengembangan.
- **Enhanced Type Safety**: Pengetikan yang lebih baik untuk decorator dan dependency injection.
- **Stabilitas**: Versi paling stabil dengan jendela dukungan terlama dan kompatibilitas ESM.
- **Ekosistem**: Integrasi mulus dengan library modern seperti Drizzle ORM dan Passport.js.

### Arsitektur Aplikasi
Aplikasi ini mengikuti **Modular Layered Architecture**:
- **AppModule**: Root module yang mengatur seluruh aplikasi.
- **Feature Modules**: `Auth`, `Users`, dan `Gifts` adalah domain terisolasi dengan controller, service, dan DTO mereka sendiri.
- **Database Module**: Modul global yang menyediakan instance Drizzle ORM.
- **Alur Request**: `Middleware` → `Guards` → `Interceptors/Pipes` → `Controller` → `Service` → `Drizzle ORM` → `PostgreSQL`.

---

## 2. Desain & Optimasi Database

### Mengapa PostgreSQL (vs MySQL)?
PostgreSQL dipilih daripada MySQL karena beberapa keunggulan teknis kritis:
1. **Dukungan Native UUID**: Penanganan UUID sebagai primary key yang efisien tanpa overhead performa CHAR(36) seperti di MySQL.
2. **Tipe Data JSONB**: Penyimpanan JSON biner yang sangat efisien dan dapat diindeks untuk izin pengguna dan metadata fleksibel.
3. **Kepatuhan ACID & MVCC**: Penanganan konkurensi yang unggul, sangat penting untuk konsistensi transaksi poin dan penebusan (redemption).
4. **Presisi**: Penanganan tipe DECIMAL/NUMERIC yang lebih baik untuk perhitungan rating yang akurat.

### Optimasi Database
- **Selective Selection**: Menggunakan API seleksi Drizzle untuk hanya mengambil kolom yang diperlukan, mengurangi penggunaan memori dan bandwidth.
- **Denormalized Aggregates**: Tabel `gifts` menyimpan `avg_rating` dan `total_reviews` untuk menghindari JOIN dan COUNT yang mahal saat menampilkan katalog.
- **Running Balance**: Tabel `point_balance` menyimpan `balance_after` untuk setiap transaksi, memungkinkan lookup saldo O(1) daripada summasi O(n).
- **Indexing Strategis**: Pengindeksan otomatis pada semua Foreign Key, Unique constraint (email, slug), dan kolom yang sering difilter.
- **Pagination**: Pagination berbasis offset untuk mencegah penurunan performa pada dataset besar.

---

## 3. T Injauan Modul

### Modul Auth
Menangani akses aman ke platform melalui beberapa metode:
- **JWT Authentication**: Access token stateless (jangka pendek) dan refresh token (disimpan di DB untuk pencabutan).
- **Google OAuth 2.0**: Integrasi pihak ketiga yang mulus untuk kenyamanan pengguna.
- **Email OTP**: Sistem kode verifikasi 6 digit yang aman untuk pendaftaran dan verifikasi.
- **RBAC**: Role-Based Access Control menggunakan guard khusus (`admin`, `support`, `user`).

### Modul Users
Mengelola data pengguna dan ekonomi poin:
- **Manajemen Profil**: CRUD aman untuk detail pengguna dan perubahan kata sandi.
- **Sistem Poin**: Buku besar append-only (`point_balance`) yang melacak setiap kredit dan debit dengan riwayat audit.
- **Riwayat Penebusan**: Melacak klaim hadiah pengguna di masa lalu dan status mereka saat ini.

### Modul Gifts
Katalog inti dan mesin transaksi:
- **CRUD Gift**: Dikelola oleh admin/support dengan dukungan gambar, kategori, dan lencana (badge).
- **Logika Penebusan**: Logika transaksional thread-safe yang memotong poin dan memperbarui stok secara bersamaan.
- **Sistem Rating**: Sistem ulasan terintegrasi yang memerlukan bukti penebusan untuk mencegah ulasan palsu.
- **Filter Kategori**: Penjelajahan terorganisir melalui kategori berbasis slug.

### Modul Database
Dikelola melalui **Drizzle ORM** dan **Drizzle Kit**:
- **Single Source of Truth**: `schema.ts` mendefinisikan semua tabel dan relasi.
- **Migrasi yang Disederhanakan**: Menggunakan `db:push` untuk pengembangan dan migrasi SQL versi untuk pelacakan produksi.

---

*Dokumentasi ini dikelola sebagai satu-satunya sumber kebenaran untuk arsitektur teknis proyek.*
