<?php

namespace App\Http\Requests;

use App\Models\ClinicMembership;
use App\Models\Permission;
use App\Models\Role;
use App\Models\StaffProfile;
use App\Models\User;
use App\Support\Tenancy\CurrentClinic;
use App\SystemRole;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class StoreClinicUserRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        if (is_string($this->input('email'))) {
            $this->merge(['email' => Str::lower(trim($this->string('email')->toString()))]);
        }
    }

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
        $canManageRoles = $this->user()?->hasClinicPermission('roles.manage') === true;

        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique(User::class)],
            'password' => ['required', 'confirmed', Password::defaults()],
            'role_id' => ['required', 'integer', Rule::exists(Role::class, 'id')->whereIn('code', array_column(SystemRole::cases(), 'value'))],
            'staff_profile_id' => [
                'nullable', 'integer',
                Rule::exists(StaffProfile::class, 'id')->where('clinic_id', $clinicId),
                Rule::unique(ClinicMembership::class)->where('clinic_id', $clinicId),
            ],
            'permissions' => [$canManageRoles ? 'sometimes' : 'prohibited', 'array'],
            'permissions.*' => ['string', Rule::exists(Permission::class, 'key')],
        ];
    }

    /** @return array<string, string> */
    public function attributes(): array
    {
        return [
            'role_id' => 'peran',
            'staff_profile_id' => 'profil staf',
            'permissions' => 'izin tambahan',
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'name.required' => 'Masukkan nama lengkap pengguna.',
            'email.required' => 'Masukkan email untuk login.',
            'email.email' => 'Masukkan alamat email yang valid.',
            'email.unique' => 'Email ini sudah digunakan. Gunakan email lain.',
            'password.required' => 'Masukkan kata sandi untuk akun baru.',
            'password.confirmed' => 'Konfirmasi kata sandi belum sama.',
            'role_id.required' => 'Pilih peran pengguna terlebih dahulu.',
            'role_id.exists' => 'Peran tidak tersedia. Muat ulang halaman dan pilih kembali.',
            'staff_profile_id.unique' => 'Profil staf ini sudah terhubung dengan pengguna lain.',
            'staff_profile_id.exists' => 'Profil staf tidak tersedia di klinik ini.',
            'permissions.prohibited' => 'Hanya pengelola peran yang dapat mengubah izin tambahan.',
            'permissions.*.exists' => 'Izin tambahan tidak dikenali. Muat ulang halaman dan pilih kembali.',
        ];
    }
}
