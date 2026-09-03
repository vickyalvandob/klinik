# Klinik

Klinik adalah fondasi aplikasi **Clinic Management & Electronic Medical Record SaaS** berbasis Laravel dan Inertia. Produk diarahkan untuk operasional klinik kecil hingga menengah dengan alur yang ringkas, backend yang aman, dan arsitektur yang dapat berkembang menjadi SaaS multi-tenant.

Repository saat ini telah menyelesaikan **Phase 1 — SaaS Tenancy & Authorization**. Tenant, clinic, membership, role-permission, konteks request, isolasi query, dan skeleton Platform Admin sudah aktif. Pasien, encounter, rekam medis, farmasi, dan billing belum diaktifkan sebelum fase masing-masing selesai dan terverifikasi.

## Stack

- PHP 8.4 dan Laravel 13
- React 19, TypeScript strict, dan Inertia 3
- Tailwind CSS 4 dengan komponen bergaya shadcn/ui
- Laravel Fortify untuk autentikasi session-based
- Laravel Wayfinder untuk route TypeScript
- MySQL 8+ sebagai database utama
- SQLite in-memory untuk automated test
- Pest, PHPStan/Larastan, Pint, Vite Plus lint/format, dan Vite build

Vite Plus menjalankan lint berbasis Oxlint dengan aturan kompatibel ESLint. Project mempertahankan toolchain starter Laravel 13 ini agar lint dan format berada dalam satu quality gate tanpa menambah dependency yang tumpang tindih.

## Persyaratan lokal

- PHP 8.4 dengan ekstensi Laravel dan `pdo_mysql`
- Composer 2
- Node.js 22 dan npm
- MySQL 8+ untuk environment aplikasi utama

## Instalasi

Contoh berikut menggunakan PowerShell dari root project.

```powershell
Copy-Item .env.example .env
composer install
npm.cmd install
php artisan key:generate
php artisan migrate
php artisan db:seed --class=AuthorizationSeeder
npm.cmd run build
```

Sebelum migrasi, buat database MySQL bernama `klinik` atau sesuaikan `DB_DATABASE`, `DB_USERNAME`, dan `DB_PASSWORD` pada `.env`. Jangan commit `.env` atau kredensial production.

Untuk pengembangan ringan tanpa MySQL, SQLite dapat dipakai secara lokal:

```powershell
New-Item database/database.sqlite -ItemType File -Force
```

Kemudian atur nilai berikut pada `.env`:

```dotenv
DB_CONNECTION=sqlite
```

Automated test selalu memakai SQLite in-memory melalui `phpunit.xml`, sehingga tidak menyentuh database pengembangan.

## Menjalankan aplikasi

Jalankan backend dan frontend pada dua terminal:

```powershell
php artisan serve
```

```powershell
npm.cmd run dev
```

Halaman publik tersedia di `/`, login di `/login`, area tenant di `/dashboard`, dan control plane terbatas di `/platform`.

Registrasi akun baru membuat tenant, clinic awal, dan membership `OWNER_ADMIN` dalam satu transaksi. Identitas klinik awal dapat dilengkapi pada Phase 2.

Untuk memberi akses Platform Admin kepada akun yang sudah ada, gunakan perintah berikut. Perintah ini tidak membuat akun atau password baru.

```powershell
php artisan platform:promote-admin admin@example.com
```

## Quality gate

Jalankan pemeriksaan berikut sebelum menyerahkan perubahan:

```powershell
vendor\bin\pint --dirty --format agent
npm.cmd run check
npm.cmd run types:check
composer.bat run types:check
php artisan test --compact
npm.cmd run build
composer.bat audit
npm.cmd audit --omit=dev
```

`composer.bat run ci:check` menggabungkan frontend check, TypeScript, Pint, PHPStan, dan backend test. Build tetap dijalankan terpisah agar artifact production ikut diverifikasi.

## Struktur fondasi

- `app/Actions/Fortify` — aturan pembuatan akun dan reset kata sandi
- `app/Support/Tenancy` — `CurrentTenant` dan `CurrentClinic` per request
- `app/Models/Concerns/BelongsToTenant.php` — scope tenant fail-closed dan assignment tenant server-side
- `app/Policies` — policy resource tenant dan clinic membership
- `app/Support/Authorization` — katalog tenant permission dan preset role
- `app/Http/Controllers/Platform` — metadata tenant/clinic tanpa akses rekam medis
- `app/Http/Middleware/HandleInertiaRequests.php` — shared props Inertia
- `resources/js/pages` — halaman Inertia React
- `resources/js/layouts` — layout publik, autentikasi, dan aplikasi
- `resources/js/components` — AppShell, sidebar/topbar, PageHeader, EmptyState, dan form field
- `resources/js/components/ui` — Button, Input, Select, Dialog, Badge, Table, dan primitive UI lain
- `tests/Feature/Auth` — kontrak login, logout, registrasi, reset, dan throttling

Frontend harus menggunakan fungsi route hasil Wayfinder dari `@/routes` atau `@/actions`, bukan URL aplikasi yang di-hardcode. Setelah mengubah route, regenerasi definisi dengan:

```powershell
php artisan wayfinder:generate --with-form --no-interaction
```

## Security baseline

- Autentikasi menggunakan session Laravel dan CSRF middleware.
- Login dibatasi lima percobaan per menit berdasarkan email dan alamat IP.
- Password di-hash melalui cast model dan atribut sensitif disembunyikan dari serialisasi.
- Session cookie `HttpOnly` dan `SameSite=Lax`; `.env.example` mengaktifkan enkripsi session.
- Halaman dashboard dilindungi middleware `auth`. Wiring `verified` sudah tersedia, tetapi kewajiban verifikasi email belum diaktifkan pada model user.
- Route tenant memasang user-active check dan clinic context sebelum route model binding. UUID milik tenant lain menghasilkan `404`.
- Model operasional dengan `BelongsToTenant` menghasilkan query kosong bila `CurrentTenant` belum di-resolve; pembuatan record memakai tenant server-side.
- Membership klinik dilindungi unique clinic-user serta foreign key komposit tenant-clinic agar pasangan lintas tenant ditolak database.
- Platform Admin terpisah dari permission tenant dan tidak otomatis memperoleh akses data operasional atau rekam medis.
- Rahasia hanya dibaca dari environment melalui file konfigurasi.

## Production baseline

Sebelum deployment, setidaknya gunakan `APP_ENV=production`, `APP_DEBUG=false`, HTTPS, secure session cookie, kredensial database khusus aplikasi, queue worker, scheduler, persistent storage, backup, dan monitoring. Jalankan migration secara forward-safe; jangan memakai `migrate:fresh` atau `db:wipe` pada environment yang tidak dipastikan lokal/test.

Implementasi teknis bukan klaim sertifikasi atau kepatuhan regulasi. Regulasi kesehatan Indonesia dan panduan SATUSEHAT harus diverifikasi kembali sebelum peluncuran production.
