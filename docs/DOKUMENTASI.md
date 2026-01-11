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
