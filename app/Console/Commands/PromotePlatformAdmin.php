<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

#[Signature('platform:promote-admin {email : Email akun yang sudah ada}')]
#[Description('Promote an existing user to Platform Admin without creating credentials')]
class PromotePlatformAdmin extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $email = Str::lower(trim((string) $this->argument('email')));
        $user = User::query()->where('email', $email)->first();

        if ($user === null) {
            $this->error('Akun tidak ditemukan. Buat akun pengguna terlebih dahulu.');

            return self::FAILURE;
        }

        $user->forceFill([
            'is_platform_admin' => true,
            'is_active' => true,
        ])->save();

        $this->info("{$user->email} sekarang memiliki akses Platform Admin.");

        return self::SUCCESS;
    }
}
