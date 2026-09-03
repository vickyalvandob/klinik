<?php

namespace App\Support;

use App\Models\ClinicService;
use App\Models\Medicine;
use App\Models\Practitioner;
use App\Models\ServiceUnit;
use App\Models\StaffProfile;
use App\Support\Tenancy\CurrentClinic;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Validation\Rule;

/**
 * @phpstan-type MasterField array{key: string, label: string, type: string, required: bool, placeholder?: string, options?: array<string, string>, option_source?: string, min?: int|float, step?: int|float}
 * @phpstan-type MasterColumn array{key: string, label: string, format?: string}
 * @phpstan-type MasterDefinition array{model: class-string<Model>, label: string, singular: string, description: string, fields: list<MasterField>, columns: list<MasterColumn>, search: list<string>}
 */
final class MasterDataRegistry
{
    /** @return array<string, MasterDefinition> */
    public static function all(): array
    {
        return [
            'staff' => [
                'model' => StaffProfile::class,
                'label' => 'Staf',
                'singular' => 'staf',
                'description' => 'Data pegawai klinik, termasuk staf yang belum memiliki akun login.',
                'search' => ['name', 'employee_number', 'email', 'position'],
                'columns' => [
                    ['key' => 'employee_number', 'label' => 'No. pegawai'],
                    ['key' => 'name', 'label' => 'Nama'],
                    ['key' => 'position', 'label' => 'Jabatan'],
                    ['key' => 'phone', 'label' => 'Telepon'],
                ],
                'fields' => [
                    ['key' => 'employee_number', 'label' => 'Nomor pegawai', 'type' => 'text', 'required' => false, 'placeholder' => 'STF-001'],
                    ['key' => 'name', 'label' => 'Nama lengkap', 'type' => 'text', 'required' => true],
                    ['key' => 'email', 'label' => 'Email', 'type' => 'email', 'required' => false],
                    ['key' => 'phone', 'label' => 'Telepon', 'type' => 'text', 'required' => false],
                    ['key' => 'position', 'label' => 'Jabatan', 'type' => 'text', 'required' => false],
                    ['key' => 'employment_type', 'label' => 'Status kerja', 'type' => 'select', 'required' => true, 'options' => [
                        'permanent' => 'Tetap', 'contract' => 'Kontrak', 'part_time' => 'Paruh waktu', 'intern' => 'Magang',
                    ]],
                    ['key' => 'joined_on', 'label' => 'Tanggal bergabung', 'type' => 'date', 'required' => false],
                ],
            ],
            'practitioners' => [
                'model' => Practitioner::class,
                'label' => 'Praktisi',
                'singular' => 'praktisi',
                'description' => 'Tenaga medis yang dapat ditugaskan dalam pelayanan klinik.',
                'search' => ['license_number', 'specialization'],
                'columns' => [
                    ['key' => 'staff_profile', 'label' => 'Nama praktisi'],
                    ['key' => 'profession', 'label' => 'Profesi'],
                    ['key' => 'specialization', 'label' => 'Spesialisasi'],
                    ['key' => 'license_number', 'label' => 'Nomor STR'],
                ],
                'fields' => [
                    ['key' => 'staff_profile_id', 'label' => 'Profil staf', 'type' => 'select', 'required' => true, 'option_source' => 'staff'],
                    ['key' => 'profession', 'label' => 'Profesi', 'type' => 'select', 'required' => true, 'options' => [
                        'doctor' => 'Dokter', 'dentist' => 'Dokter gigi', 'midwife' => 'Bidan', 'nurse' => 'Perawat', 'other' => 'Lainnya',
                    ]],
                    ['key' => 'specialization', 'label' => 'Spesialisasi', 'type' => 'text', 'required' => false, 'placeholder' => 'Dokter umum'],
                    ['key' => 'license_number', 'label' => 'Nomor STR', 'type' => 'text', 'required' => true],
                    ['key' => 'practice_license_number', 'label' => 'Nomor SIP', 'type' => 'text', 'required' => false],
                    ['key' => 'schedule_notes', 'label' => 'Catatan jadwal', 'type' => 'textarea', 'required' => false],
                ],
            ],
            'service-units' => [
                'model' => ServiceUnit::class,
                'label' => 'Unit Layanan',
                'singular' => 'unit layanan',
                'description' => 'Poli atau unit tempat pelayanan diberikan dan antrean dikelompokkan.',
                'search' => ['code', 'name', 'queue_prefix'],
                'columns' => [
                    ['key' => 'code', 'label' => 'Kode'],
                    ['key' => 'name', 'label' => 'Nama unit'],
                    ['key' => 'type', 'label' => 'Jenis'],
                    ['key' => 'queue_prefix', 'label' => 'Prefix antrean'],
                ],
                'fields' => [
                    ['key' => 'code', 'label' => 'Kode unit', 'type' => 'text', 'required' => true, 'placeholder' => 'PU'],
                    ['key' => 'name', 'label' => 'Nama unit', 'type' => 'text', 'required' => true, 'placeholder' => 'Poli Umum'],
                    ['key' => 'type', 'label' => 'Jenis unit', 'type' => 'select', 'required' => true, 'options' => [
                        'outpatient' => 'Rawat jalan', 'laboratory' => 'Laboratorium', 'radiology' => 'Radiologi', 'pharmacy' => 'Farmasi', 'other' => 'Lainnya',
                    ]],
                    ['key' => 'queue_prefix', 'label' => 'Prefix antrean', 'type' => 'text', 'required' => true, 'placeholder' => 'A'],
                    ['key' => 'description', 'label' => 'Deskripsi', 'type' => 'textarea', 'required' => false],
                ],
            ],
            'services' => [
                'model' => ClinicService::class,
                'label' => 'Layanan',
                'singular' => 'layanan',
                'description' => 'Daftar tindakan atau layanan yang dapat dipilih saat kunjungan.',
                'search' => ['code', 'name'],
                'columns' => [
                    ['key' => 'code', 'label' => 'Kode'],
                    ['key' => 'name', 'label' => 'Nama layanan'],
                    ['key' => 'service_unit', 'label' => 'Unit'],
                    ['key' => 'price', 'label' => 'Tarif', 'format' => 'currency'],
                ],
                'fields' => [
                    ['key' => 'service_unit_id', 'label' => 'Unit layanan', 'type' => 'select', 'required' => true, 'option_source' => 'service_units'],
                    ['key' => 'code', 'label' => 'Kode layanan', 'type' => 'text', 'required' => true, 'placeholder' => 'KONS-UMUM'],
                    ['key' => 'name', 'label' => 'Nama layanan', 'type' => 'text', 'required' => true],
                    ['key' => 'description', 'label' => 'Deskripsi', 'type' => 'textarea', 'required' => false],
                    ['key' => 'price', 'label' => 'Tarif', 'type' => 'number', 'required' => true, 'min' => 0, 'step' => 500],
                    ['key' => 'duration_minutes', 'label' => 'Durasi (menit)', 'type' => 'number', 'required' => true, 'min' => 5, 'step' => 5],
                ],
            ],
            'medicines' => [
                'model' => Medicine::class,
                'label' => 'Obat',
                'singular' => 'obat',
                'description' => 'Katalog obat untuk resep, farmasi, dan pengendalian stok pada fase berikutnya.',
                'search' => ['code', 'name', 'generic_name', 'category'],
                'columns' => [
                    ['key' => 'code', 'label' => 'Kode'],
                    ['key' => 'name', 'label' => 'Nama obat'],
                    ['key' => 'strength', 'label' => 'Kekuatan'],
                    ['key' => 'unit', 'label' => 'Satuan'],
                    ['key' => 'selling_price', 'label' => 'Harga jual', 'format' => 'currency'],
                ],
                'fields' => [
                    ['key' => 'code', 'label' => 'Kode obat', 'type' => 'text', 'required' => true, 'placeholder' => 'OBT-001'],
                    ['key' => 'name', 'label' => 'Nama obat', 'type' => 'text', 'required' => true],
                    ['key' => 'generic_name', 'label' => 'Nama generik', 'type' => 'text', 'required' => false],
                    ['key' => 'category', 'label' => 'Kategori', 'type' => 'text', 'required' => false],
                    ['key' => 'dosage_form', 'label' => 'Bentuk sediaan', 'type' => 'text', 'required' => true, 'placeholder' => 'Tablet'],
                    ['key' => 'strength', 'label' => 'Kekuatan', 'type' => 'text', 'required' => false, 'placeholder' => '500 mg'],
                    ['key' => 'unit', 'label' => 'Satuan', 'type' => 'text', 'required' => true, 'placeholder' => 'tablet'],
                    ['key' => 'purchase_price', 'label' => 'Harga beli', 'type' => 'number', 'required' => true, 'min' => 0, 'step' => 100],
                    ['key' => 'selling_price', 'label' => 'Harga jual', 'type' => 'number', 'required' => true, 'min' => 0, 'step' => 100],
                    ['key' => 'minimum_stock', 'label' => 'Stok minimum', 'type' => 'number', 'required' => true, 'min' => 0, 'step' => 1],
                ],
            ],
        ];
    }

    /** @return MasterDefinition */
    public static function get(string $resource): array
    {
        $definition = self::all()[$resource] ?? null;
        abort_if($definition === null, 404);

        return $definition;
    }

    /** @return array<string, list<mixed>> */
    public static function rules(string $resource, CurrentClinic $currentClinic, ?Model $record = null): array
    {
        $clinicId = $currentClinic->id();

        return match ($resource) {
            'staff' => [
                'employee_number' => ['nullable', 'string', 'max:64', Rule::unique(StaffProfile::class)->where('clinic_id', $clinicId)->ignore($record)],
                'name' => ['required', 'string', 'max:255'],
                'email' => ['nullable', 'email', 'max:255'],
                'phone' => ['nullable', 'string', 'max:32'],
                'position' => ['nullable', 'string', 'max:255'],
                'employment_type' => ['required', Rule::in(['permanent', 'contract', 'part_time', 'intern'])],
                'joined_on' => ['nullable', 'date'],
            ],
            'practitioners' => [
                'staff_profile_id' => [
                    'required', 'integer',
                    Rule::exists(StaffProfile::class, 'id')->where('clinic_id', $clinicId),
                    Rule::unique(Practitioner::class)->where('clinic_id', $clinicId)->ignore($record),
                ],
                'profession' => ['required', Rule::in(['doctor', 'dentist', 'midwife', 'nurse', 'other'])],
                'specialization' => ['nullable', 'string', 'max:255'],
                'license_number' => ['required', 'string', 'max:100', Rule::unique(Practitioner::class)->where('clinic_id', $clinicId)->ignore($record)],
                'practice_license_number' => ['nullable', 'string', 'max:100'],
                'schedule_notes' => ['nullable', 'string', 'max:2000'],
            ],
            'service-units' => [
                'code' => ['required', 'string', 'max:32', Rule::unique(ServiceUnit::class)->where('clinic_id', $clinicId)->ignore($record)],
                'name' => ['required', 'string', 'max:255'],
                'type' => ['required', Rule::in(['outpatient', 'laboratory', 'radiology', 'pharmacy', 'other'])],
                'queue_prefix' => ['required', 'alpha_num:ascii', 'max:10'],
                'description' => ['nullable', 'string', 'max:2000'],
            ],
            'services' => [
                'service_unit_id' => ['required', 'integer', Rule::exists(ServiceUnit::class, 'id')->where('clinic_id', $clinicId)],
                'code' => ['required', 'string', 'max:32', Rule::unique(ClinicService::class)->where('clinic_id', $clinicId)->ignore($record)],
                'name' => ['required', 'string', 'max:255'],
                'description' => ['nullable', 'string', 'max:2000'],
                'price' => ['required', 'numeric', 'min:0', 'max:999999999999.99'],
                'duration_minutes' => ['required', 'integer', 'min:5', 'max:480'],
            ],
            'medicines' => [
                'code' => ['required', 'string', 'max:32', Rule::unique(Medicine::class)->where('clinic_id', $clinicId)->ignore($record)],
                'name' => ['required', 'string', 'max:255'],
                'generic_name' => ['nullable', 'string', 'max:255'],
                'category' => ['nullable', 'string', 'max:255'],
                'dosage_form' => ['required', 'string', 'max:64'],
                'strength' => ['nullable', 'string', 'max:64'],
                'unit' => ['required', 'string', 'max:32'],
                'purchase_price' => ['required', 'numeric', 'min:0', 'max:999999999999.99'],
                'selling_price' => ['required', 'numeric', 'gte:purchase_price', 'max:999999999999.99'],
                'minimum_stock' => ['required', 'integer', 'min:0', 'max:999999999'],
            ],
            default => abort(404),
        };
    }
}
