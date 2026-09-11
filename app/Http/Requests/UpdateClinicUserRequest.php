<?php

namespace App\Http\Requests;

use App\Models\ClinicMembership;
use App\Models\Permission;
use App\Models\Role;
use App\Models\StaffProfile;
use App\Support\Tenancy\CurrentClinic;
use App\SystemRole;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateClinicUserRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->hasClinicPermission('users.manage') === true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $clinicId = app(CurrentClinic::class)->id();
        $membership = $this->route('membership');
        $canManageRoles = $this->user()?->hasClinicPermission('roles.manage') === true;

        return [
            'role_id' => ['required', 'integer', Rule::exists(Role::class, 'id')->whereIn('code', array_column(SystemRole::cases(), 'value'))],
            'staff_profile_id' => [
                'nullable', 'integer',
                Rule::exists(StaffProfile::class, 'id')->where('clinic_id', $clinicId),
                Rule::unique(ClinicMembership::class)->where('clinic_id', $clinicId)->ignore($membership),
            ],
            'is_active' => ['required', 'boolean'],
            'permissions' => [$canManageRoles ? 'sometimes' : 'prohibited', 'array'],
            'permissions.*' => ['string', Rule::exists(Permission::class, 'key')],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'role_id.required' => 'Pilih peran pengguna terlebih dahulu.',
            'role_id.exists' => 'Peran tidak tersedia. Muat ulang halaman dan pilih kembali.',
            'staff_profile_id.unique' => 'Profil staf ini sudah terhubung dengan pengguna lain.',
            'staff_profile_id.exists' => 'Profil staf tidak tersedia di klinik ini.',
            'is_active.required' => 'Pilih status akses pengguna.',
            'is_active.boolean' => 'Status akses pengguna tidak valid.',
            'permissions.prohibited' => 'Hanya pengelola peran yang dapat mengubah izin tambahan.',
            'permissions.*.exists' => 'Izin tambahan tidak dikenali. Muat ulang halaman dan pilih kembali.',
        ];
    }
}
