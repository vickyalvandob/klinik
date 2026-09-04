# Master Brief Sistem Manajemen Klinik

> Sumber utama arah produk dan urutan development untuk aplikasi ini.
> Terakhir diselaraskan: 4 September 2026.

## 1. Identitas Produk

### 1.1 Ringkasan

Aplikasi ini adalah sistem manajemen klinik dan rekam medis elektronik berbasis SaaS untuk:

- praktik dokter mandiri;
- klinik pratama;
- klinik kecil dengan beberapa petugas yang merangkap pekerjaan;
- klinik menengah dengan pembagian tugas yang lebih jelas;
- klinik yang berkembang menjadi beberapa unit layanan atau cabang.

Produk tidak dirancang sebagai SIMRS. Sistem harus terasa ringan, cepat dipahami, dan berpusat pada pelayanan pasien rawat jalan.

### 1.2 Tujuan utama

1. Mempercepat pendaftaran dan pelayanan pasien.
2. Menyimpan satu data pasien untuk banyak kunjungan.
3. Memberi setiap petugas daftar kerja yang jelas.
4. Memungkinkan dokter menyelesaikan pemeriksaan dari satu workspace.
5. Menjaga rekam medis, transaksi, dan audit tetap aman.
6. Mendukung klinik kecil tanpa menghambat klinik yang tumbuh.
7. Menyiapkan fondasi SaaS dan integrasi tanpa membebani MVP.

### 1.3 Ukuran keberhasilan

Sistem dianggap berhasil bila:

- pasien lama dapat didaftarkan kembali dalam beberapa langkah singkat;
- petugas langsung mengetahui pasien berikutnya yang harus dilayani;
- satu orang dapat menjalankan beberapa fungsi sesuai izin yang diberikan;
- dokter tidak perlu membuka banyak modul untuk satu kunjungan;
- rekam medis final tidak dapat berubah diam-diam;
- alur klinis tetap berjalan walaupun pembayaran atau integrasi eksternal bermasalah;
- data antar-tenant dan antar-klinik tidak dapat saling diakses;
- tampilan tetap ringkas di desktop, tablet, dan ponsel;
- test, analisis statis, lint, dan build tetap hijau.

## 2. Prinsip Produk

### 2.1 Satu pasien, banyak kunjungan

Pasien adalah master data. Kedatangan baru membuat `Encounter`, bukan membuat ulang pasien.

Alur data utama:

`Patient -> Encounter -> Triage -> Medical Record -> Prescription/Procedure -> Billing -> Completed`

### 2.2 Satu kunjungan, satu alur utama

Petugas tidak boleh dipaksa berpindah-pindah modul untuk menyelesaikan satu pasien. Halaman `Hari Ini` menjadi pusat operasional dan workspace dokter menjadi pusat pekerjaan klinis.

### 2.3 Fitur mengikuti kebutuhan klinik

Tahap triase, farmasi, antrean, dan pembayaran dapat diaktifkan atau dinonaktifkan melalui pengaturan klinik. Sistem menentukan status berikutnya di backend berdasarkan konfigurasi tersebut.

Tidak ada workflow builder drag-and-drop pada MVP.

### 2.4 Sederhana di UI, ketat di backend

Kompleksitas keamanan, tenant isolation, audit, transaksi, locking, state transition, dan retry ditangani di backend. Pengguna cukup melihat istilah dan aksi yang mudah dipahami.

### 2.5 Catatan klinis dan keuangan terpisah

Dokter dapat memfinalisasi rekam medis ketika pelayanan klinis selesai walaupun tagihan belum lunas. Status pembayaran tidak boleh mengunci pekerjaan klinis.

### 2.6 Tidak menghapus histori penting

Pasien, encounter, rekam medis final, resep yang sudah diproses, pembayaran, dan audit tidak memiliki aksi hapus normal. Koreksi dilakukan dengan pembatalan, void, amendemen, atau status nonaktif sesuai domain.

## 3. Ruang Lingkup

### 3.1 Modul inti

- autentikasi dan keamanan akun;
- tenant, klinik, pengguna, role, dan permission;
- onboarding dan pengaturan workflow;
- master pasien dan alergi;
- pendaftaran walk-in, encounter, dan antrean;
- pemeriksaan awal atau triase opsional;
- antrean dokter dan rekam medis elektronik;
- diagnosis, tindakan, dan resep;
- farmasi dan stok sederhana;
- tagihan dan pembayaran;
- dashboard operasional dan laporan dasar;
- audit, backup, dan production hardening;
- administrasi platform SaaS;
- kesiapan integrasi SATUSEHAT.

### 3.2 Di luar MVP

- booking, appointment, dan reservasi online;
- rawat inap, bed management, dan IGD kompleks;
- LIS, PACS, RIS, serta workflow laboratorium/radiologi kompleks;
- BPJS VClaim, Antrol, dan INA-CBG;
- accounting lengkap, payroll, HRIS, dan procurement ERP;
- telemedicine, marketplace, dan aplikasi mobile native;
- patient portal;
- UI multi-cabang yang kompleks.

Tidak dibuat tabel `appointments`. Pasien datang langsung ke proses pendaftaran.

## 4. Pengguna, Role, dan Pekerjaan Rangkap

### 4.1 Model identitas

- `User`: akun login individual.
- `StaffProfile`: identitas pekerja di klinik.
- `Practitioner`: tenaga medis dengan atribut profesi dan izin praktik.
- `ClinicMembership`: hubungan akun dengan klinik, role dasar, dan izin tambahan.

Ketiganya tidak boleh disamakan. Practitioner dapat ada tanpa akun login, dan akun nonmedis tidak perlu menjadi practitioner.

### 4.2 Role adalah preset, bukan jabatan kaku

Preset awal:

- Pemilik / Admin;
- Front Office;
- Perawat;
- Dokter;
- Farmasi;
- Kasir.

Role hanya memberi paket izin awal. Otorisasi sebenarnya memakai permission yang efektif pada membership klinik.

### 4.3 Dukungan pekerjaan rangkap

Satu orang dapat menjalankan beberapa fungsi dengan cara:

1. memilih satu role dasar yang paling dekat dengan pekerjaan utamanya;
2. menambahkan permission individual untuk tugas tambahan;
3. menampilkan menu dan aksi berdasarkan permission efektif, bukan nama role;
4. tetap menggunakan satu akun pribadi agar seluruh tindakan dapat diaudit.

Contoh:

- pemilik klinik kecil dapat mendaftar pasien, menerima pembayaran, dan melihat laporan;
- perawat dapat merangkap front office;
- front office dapat merangkap kasir;
- dokter pemilik dapat memiliki akses klinis sekaligus administrasi.

Tidak menggunakan akun bersama. Platform Admin juga tidak otomatis memperoleh akses klinis ke suatu klinik.

### 4.4 Permission minimum

- Patient: `patient.view`, `patient.create`, `patient.update`.
- Encounter: `encounter.view`, `encounter.create`, `encounter.update`, `encounter.cancel`.
- Triage: `triage.view`, `triage.create`, `triage.update`, `triage.complete`.
- Medical record: `medical_record.view`, `medical_record.create`, `medical_record.update`, `medical_record.finalize`, `medical_record.amend`.
- Prescription: `prescription.view`, `prescription.create`, `prescription.update`, `prescription.cancel`.
- Pharmacy: `pharmacy.view`, `pharmacy.process`, `pharmacy.dispense`.
- Billing: `billing.view`, `billing.manage`, `payment.receive`, `payment.void`.
- Reports: `report.view`, `report.export`.
- Settings: `clinic.manage`, `users.manage`, `roles.manage`, `master_data.manage`, `integration.manage`.
- Audit: `audit.view`.

## 5. Arsitektur Teknis

### 5.1 Stack

- Laravel 13 dan PHP 8.4+;
- React, TypeScript, Inertia 3, Tailwind CSS 4, dan Vite;
- MySQL 8+;
- Pest untuk feature dan unit test;
- Redis opsional untuk cache/queue production;
- object storage S3-compatible opsional untuk berkas privat.

Versi package yang terpasang selalu menjadi acuan API. Dependency baru tidak ditambahkan tanpa kebutuhan dan persetujuan yang jelas.

### 5.2 Bentuk aplikasi

Gunakan modular monolith. Controller menangani HTTP, Form Request menangani validasi, Policy/Gate menangani otorisasi, dan Action/Service menangani operasi bisnis penting.

Microservice tidak digunakan sebelum kebutuhan operasional dan batas domain benar-benar terbukti.

### 5.3 Multi-tenancy

Gunakan satu aplikasi, satu database, dan row-level tenant isolation:

`Platform -> Tenant -> Clinic -> Operational Data`

MVP memakai satu tenant dengan satu klinik, tetapi struktur data disiapkan untuk satu tenant memiliki beberapa klinik.

Aturan wajib:

- `tenant_id` dan `clinic_id` tidak dipercaya dari browser;
- context berasal dari membership pengguna yang aktif;
- model tenant-owned fail-closed bila context tidak tersedia;
- route model binding dilakukan setelah context terselesaikan;
- cross-tenant lookup mengembalikan not found agar keberadaan data tidak bocor;
- perubahan status penting memakai transaksi dan `lockForUpdate`;
- constraint database menjadi pertahanan terakhir untuk uniqueness dan ownership.

## 6. Workflow Klinik

### 6.1 Pengaturan workflow

Pengaturan minimum per klinik:

- triase aktif/nonaktif;
- antrean aktif/nonaktif;
- farmasi aktif/nonaktif;
- billing aktif/nonaktif;
- primary diagnosis wajib/tidak;
- rekam medis final wajib/tidak;
- pembayaran parsial diizinkan/tidak;
- prefix antrean.

Jika hanya ada satu unit layanan atau satu dokter yang valid, UI boleh memilihkannya otomatis.

### 6.2 Alur normal

1. Cari pasien.
2. Pilih pasien lama atau buat pasien baru.
3. Buat encounter dan nomor antrean.
4. Jika triase aktif, lakukan pemeriksaan awal.
5. Dokter memulai pemeriksaan.
6. Dokter mengisi SOAP, diagnosis, tindakan, dan resep dalam satu workspace.
7. Dokter menyimpan draft atau memfinalisasi RME.
8. Jika ada resep dan farmasi aktif, proses obat.
9. Jika billing aktif, proses pembayaran.
10. Encounter selesai.
11. Integrasi eksternal berjalan di background.

### 6.3 Status encounter

- `registered` -> Terdaftar;
- `waiting_triage` -> Pemeriksaan Awal;
- `waiting_doctor` -> Menunggu Dokter;
- `in_consultation` -> Sedang Diperiksa;
- `waiting_pharmacy` -> Farmasi;
- `waiting_payment` -> Pembayaran;
- `completed` -> Selesai;
- `cancelled` -> Dibatalkan.

Transisi hanya dilakukan melalui operasi domain yang tervalidasi dan tercatat.

## 7. Kontrak Modul Inti

### 7.1 Pasien

- Nomor rekam medis dibuat otomatis dan aman terhadap concurrency.
- NIK exact dicegah duplikat dalam tenant bila tersedia.
- Kandidat duplikat berdasarkan telepon atau nama dan tanggal lahir ditampilkan tanpa membocorkan data sensitif.
- Pasien tidak memiliki tombol hapus.
- Alergi aktif terlihat jelas di profil dan workspace dokter.

### 7.2 Hari Ini

Halaman ini adalah command center operasional, berisi ringkasan, filter status, pencarian, waktu tunggu, dan aksi utama sesuai permission.

Dashboard analitik tidak menggantikan halaman ini.

### 7.3 Triase

Triase bersifat opsional dan compact. Isian utama: keluhan, tekanan darah, nadi, respirasi, suhu, SpO2, berat, tinggi, skala nyeri, dan catatan.

Draft dapat diperbarui. Setelah selesai, triase terkunci dan encounter bergerak ke antrean dokter. Perubahan tercatat dalam audit.

### 7.4 Workspace dokter

Satu halaman memuat:

- header pasien, nomor RM, umur, jenis kelamin, antrean, dan dokter;
- peringatan alergi aktif;
- ringkasan triase;
- ringkasan kunjungan sebelumnya;
- SOAP;
- diagnosis primary/secondary;
- tindakan;
- draft resep;
- aksi Simpan Draft dan Finalisasi.

### 7.5 Rekam medis

Status RME: `draft`, `final`, dan `amended`.

- Draft dapat disimpan berulang.
- Finalisasi adalah tindakan eksplisit dalam transaksi.
- Finalisasi memeriksa encounter, practitioner, izin, data wajib, dan primary diagnosis bila diwajibkan.
- Record final tidak dapat diedit sebagai draft.
- Koreksi memakai amendemen yang mempertahankan data original, alasan, pelaku, dan waktu.

### 7.6 Diagnosis dan tindakan

- Maksimal satu diagnosis primary aktif per encounter.
- Diagnosis secondary dapat lebih dari satu.
- Kode berasal dari katalog server, tidak di-hardcode di frontend.
- Tindakan menyimpan snapshot nama dan harga integer Rupiah agar histori tidak berubah ketika master diperbarui.

### 7.7 Resep dan farmasi

Dokter membuat draft resep di workspace yang sama. Farmasi menerima resep final dalam worklist, memproses stok secara transaksional, dan mencatat penyerahan serta pelakunya.

### 7.8 Billing dan pembayaran

- Invoice menyimpan snapshot item dan harga.
- Uang disimpan sebagai integer Rupiah, bukan float.
- Pembayaran mendukung kebijakan pembayaran parsial klinik.
- Void tidak menghapus transaksi original dan wajib memiliki alasan serta audit.

## 8. UI/UX

- Bahasa utama UI adalah Bahasa Indonesia yang singkat dan operasional.
- Desain modern, minimalis, compact, flat, tanpa shadow.
- Hierarki memakai border tipis, spacing, surface color, dan typography.
- Warna status digunakan hemat dan selalu disertai teks.
- Tombol utama per konteks dibuat jelas; aksi berbahaya tidak menjadi default.
- Form dikelompokkan sesuai pekerjaan pengguna, bukan struktur tabel.
- Desktop memakai tabel bila efektif; mobile memakai card/stack yang mudah dipindai.
- Loading, empty state, validation error, forbidden state, dan retry harus jelas.
- Focus ring, label, keyboard navigation, serta kontras wajib dijaga.

## 9. Keamanan dan Integritas

- Semua endpoint sensitif memerlukan autentikasi, clinic context, permission, dan policy yang sesuai.
- Semua input memakai allow-list dan data tervalidasi.
- Berkas sensitif disimpan privat dan diunduh melalui endpoint berotorisasi.
- Finalisasi klinis, dispensing, pembayaran, void, amendemen, dan perubahan izin diaudit.
- Audit bersifat append-only untuk operasi penting.
- Session production memakai cookie secure, httpOnly, sameSite yang sesuai, dan rotasi session pada autentikasi.
- Secret hanya berasal dari konfigurasi environment.
- Backup harus terenkripsi, diuji restore, dan memiliki retensi.
- Klaim patuh regulasi tidak dibuat hanya berdasarkan implementasi; regulasi Kemenkes dan panduan SATUSEHAT harus diverifikasi kembali sebelum go-live.

## 10. Kinerja dan Skalabilitas

- Query list memakai pagination, filter server-side, eager loading, dan urutan deterministik.
- Index dibuat berdasarkan query operasional yang nyata.
- Export besar, sinkronisasi, dan integrasi berjalan melalui queue.
- SATUSEHAT atau layanan eksternal tidak boleh menghambat penyelesaian pelayanan lokal.
- Integrasi memiliki log, retry terbatas, idempotency key, dan dead-letter/manual retry path.
- Optimasi dilakukan berdasarkan pengukuran, bukan abstraksi spekulatif.

## 11. Roadmap Development

Setiap fase harus selesai dan terverifikasi sebelum fase berikutnya. Scope baru yang tidak wajib masuk backlog, bukan disisipkan ke fase aktif.

### Milestone A — MVP Core

#### Fase 0 — Fondasi proyek

Setup Laravel/Inertia, autentikasi, layout, quality tooling, environment, dan baseline CI.

#### Fase 1 — Tenancy dan authorization

Tenant, clinic context, membership, role preset, permission tambahan, policy, dan isolation tests.

#### Fase 2 — Setup klinik dan master data

Onboarding, identitas klinik, practitioner, unit layanan, layanan/tarif, obat, pengguna, dan pengaturan workflow.

#### Fase 3 — Manajemen pasien

Daftar/cari/detail/edit pasien, nomor RM, duplicate detection, alergi, histori dasar, dan tanpa delete.

#### Fase 4 — Pendaftaran, encounter, dan antrean

Pendaftaran walk-in, sequence aman, status encounter, halaman Hari Ini, filter, pencarian, waktu tunggu, dan pembatalan beralasan.

#### Fase 5 — Pemeriksaan awal

Worklist triase, draft, validasi vital sign, penyelesaian, audit, serta transisi ke antrean dokter.

#### Fase 6 — Workspace dokter dan RME

Antrean dokter, mulai pemeriksaan, patient header, alergi, ringkasan triase/riwayat, SOAP, diagnosis, tindakan, draft resep, draft/final, final lock, amendemen, dan audit.

Definition of Done: dokter dapat menyelesaikan konsultasi normal dari satu workspace dan RME final tidak dapat berubah diam-diam.

### Milestone B — MVP Operasional Lengkap

#### Fase 7 — Resep dan farmasi

Worklist farmasi, validasi resep, penyiapan, dispensing, stock movement, pembatalan aman, dan audit.

#### Fase 8 — Billing dan pembayaran

Invoice otomatis, snapshot harga, pembayaran penuh/parsial, receipt, void, dan rekonsiliasi sederhana.

#### Fase 9 — Polishing operasional

Penyederhanaan navigasi per permission, responsive QA, loading/empty/error state, shortcut, printing dasar, dan perbaikan friction lintas-role.

### Milestone C — Growth

#### Fase 10 — Dashboard dan laporan

Ringkasan kunjungan, pendapatan, layanan, diagnosis, dokter, farmasi, filter tanggal, dan export terbatas sesuai permission.

#### Fase 11 — Audit, keamanan, dan hardening

Audit viewer, access log RME, private files, rate limit, session hardening, privacy review, backup/restore drill, observability, dan security regression tests.

### Milestone D — SaaS dan Advanced

#### Fase 12 — Subscription SaaS

Plan, quota, trial, billing SaaS, subscription gate, platform admin, tenant lifecycle, dan support workflow yang terpisah dari data klinis.

#### Fase 13 — Kesiapan SATUSEHAT

External identifiers, terminology mapping, integration configuration terenkripsi, job log, idempotency, retry, dan sandbox validation. Integrasi tetap asynchronous.

#### Fase 14 — Production readiness

Staging MySQL, migration rehearsal, performance test, vulnerability audit, monitoring, runbook, restore drill, secret rotation, legal/regulatory validation, dan go-live checklist.

## 12. Definition of Done Setiap Fase

Fase hanya boleh berstatus selesai bila:

1. acceptance criteria dan failure modes penting terimplementasi;
2. tenant isolation dan authorization diuji dari backend;
3. migration memiliki constraint/index yang relevan dan rollback yang jujur;
4. feature test terfokus lulus;
5. seluruh test suite relevan lulus;
6. PHP diformat dengan Pint;
7. PHPStan atau static analysis proyek lulus;
8. ESLint dan TypeScript check lulus untuk perubahan frontend;
9. production build lulus;
10. tampilan desktop dan mobile diverifikasi bila tooling browser tersedia;
11. tidak ada error backend/browser baru;
12. master brief dan status fase diperbarui bila keputusan produk berubah.

Lulus test/build tidak boleh diklaim sebagai browser QA bila tidak ada verifikasi browser yang nyata.

## 13. Status Implementasi

Status ini adalah ledger ringkas, bukan pengganti hasil test atau laporan perubahan.

| Fase | Status per 4 Sep 2026 | Catatan |
| --- | --- | --- |
| 0 | Selesai | Fondasi Laravel/Inertia dan quality tooling tersedia. |
| 1 | Selesai | Tenant context, role/permission, policy, dan isolation tersedia. |
| 2 | Selesai | Onboarding, klinik, pengguna, role, workflow, dan master data tersedia. |
| 3 | Selesai | Pasien, MR, duplicate review, alergi, dan histori dasar tersedia. |
| 4 | Selesai terfokus | Pendaftaran walk-in, encounter, antrean, Hari Ini, dan cancellation tersedia. |
| 5 | Selesai terfokus | Draft/final triase, vital validation, audit, dan transisi tersedia. |
| 6 | Aktif | Workspace dokter dan RME adalah fase berikutnya. |
| 7–14 | Belum dimulai | Dikerjakan berurutan setelah fase sebelumnya lolos gate. |

Verifikasi awal Fase 3–5 pada tanggal di atas: 20 test, 142 assertion, seluruhnya lulus. Full quality gate dijalankan kembali setelah Fase 6 selesai.

## 14. Protokol Eksekusi

Untuk setiap pekerjaan lanjutan:

1. baca dokumen ini sebagai sumber scope dan urutan fase;
2. periksa status repo dan perubahan yang belum di-commit;
3. baca aturan proyek serta pola sibling file;
4. konfirmasi versi package sebelum memakai API yang version-sensitive;
5. tulis atau perbarui test untuk perilaku yang berubah;
6. implementasikan perubahan terkecil yang utuh;
7. jalankan test terfokus, formatter, static analysis, lint, type check, build, lalu full relevant suite;
8. catat hasil nyata tanpa mengklaim verifikasi yang tidak dilakukan;
9. lanjut ke fase berikutnya hanya setelah Definition of Done terpenuhi.

## 15. Aturan Pengambilan Keputusan

Jika harus memilih antara menambah layar, tombol, status, dan opsi baru atau mempertahankan alur sederhana dengan backend yang tetap benar dan aman, pilih alur sederhana.

Prinsip akhir produk adalah **kesederhanaan yang profesional**: cukup mudah untuk klinik kecil, cukup kuat untuk operasional klinis yang serius, dan cukup terstruktur untuk tumbuh menjadi SaaS komersial.
