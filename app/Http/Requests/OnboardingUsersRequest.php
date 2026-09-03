<?php

namespace App\Http\Requests;

use App\Models\Role;
use App\Models\User;
use App\SystemRole;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class OnboardingUsersRequest extends FormRequest
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
        $isSkipped = $this->boolean('skip');

        return [
            'skip' => ['required', 'boolean'],
            'name' => [Rule::requiredIf(! $isSkipped), 'nullable', 'string', 'max:255'],
            'email' => [Rule::requiredIf(! $isSkipped), 'nullable', 'email', 'max:255', Rule::unique(User::class)],
            'password' => [Rule::requiredIf(! $isSkipped), 'nullable', 'confirmed', Password::defaults()],
            'role_id' => [Rule::requiredIf(! $isSkipped), 'nullable', 'integer', Rule::exists(Role::class, 'id')->whereIn('code', array_column(SystemRole::cases(), 'value'))],
        ];
    }
}
