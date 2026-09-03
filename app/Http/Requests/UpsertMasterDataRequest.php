<?php

namespace App\Http\Requests;

use App\Support\MasterDataRegistry;
use App\Support\Tenancy\CurrentClinic;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Http\FormRequest;

class UpsertMasterDataRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->hasClinicPermission('master_data.manage') === true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return MasterDataRegistry::rules(
            (string) $this->route('resource'),
            app(CurrentClinic::class),
            $this->record(),
        );
    }

    /** @return array<string, string> */
    public function attributes(): array
    {
        return [
            'employee_number' => 'nomor pegawai',
            'staff_profile_id' => 'profil staf',
            'license_number' => 'nomor STR',
            'practice_license_number' => 'nomor SIP',
            'service_unit_id' => 'unit layanan',
            'queue_prefix' => 'prefix antrean',
            'duration_minutes' => 'durasi layanan',
            'purchase_price' => 'harga beli',
            'selling_price' => 'harga jual',
            'minimum_stock' => 'stok minimum',
        ];
    }

    private function record(): ?Model
    {
        $uuid = $this->route('record');

        if (! is_string($uuid)) {
            return null;
        }

        $modelClass = MasterDataRegistry::get((string) $this->route('resource'))['model'];

        return $modelClass::query()
            ->where('clinic_id', app(CurrentClinic::class)->id())
            ->where('uuid', $uuid)
            ->firstOrFail();
    }
}
