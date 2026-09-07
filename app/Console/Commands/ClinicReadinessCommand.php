<?php

namespace App\Console\Commands;

use Carbon\CarbonImmutable;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

#[Signature('clinic:readiness')]
#[Description('Check deployment security, database, scheduler and backup evidence without changing application data')]
class ClinicReadinessCommand extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $backup = Storage::disk('backups');
        $latest = $backup->exists('latest-backup.json') ? json_decode($backup->get('latest-backup.json'), true) : [];
        $drill = $backup->exists('latest-drill.json') ? json_decode($backup->get('latest-drill.json'), true) : [];
        $checks = [
            'APP_ENV production' => app()->isProduction(),
            'Debug dimatikan' => ! config('app.debug'),
            'URL HTTPS' => str_starts_with((string) config('app.url'), 'https://'),
            'Session terenkripsi dan cookie aman' => config('session.encrypt') && config('session.secure') && config('session.http_only'),
            'Riwayat browser terenkripsi' => config('inertia.history.encrypt'),
            'Database MySQL terhubung' => DB::connection()->getDriverName() === 'mysql' && DB::select('SELECT 1') !== [],
            'Tabel audit dan lampiran tersedia' => Schema::hasTable('audit_events') && Schema::hasTable('medical_record_access_logs') && Schema::hasTable('medical_record_files'),
            'Build frontend tersedia' => is_file(public_path('build/manifest.json')),
            'Scheduler aktif 5 menit terakhir' => (int) Cache::get('clinic-scheduler-heartbeat', 0) >= now()->subMinutes(5)->timestamp,
            'Backup terbaru tersedia' => isset($latest['created_at'], $latest['archive']) && $backup->exists($latest['archive'])
                && CarbonImmutable::parse($latest['created_at'])->greaterThan(now()->subHours((int) config('clinic-security.backup_max_age_hours'))),
            'Restore drill 30 hari terakhir' => isset($drill['verified_at'])
                && CarbonImmutable::parse($drill['verified_at'])->greaterThan(now()->subDays(30)),
            'Tidak ada job gagal' => DB::table('failed_jobs')->count() === 0,
        ];
        foreach ($checks as $label => $passed) {
            $this->line(($passed ? '[OK] ' : '[PERLU] ').$label);
        }

        return in_array(false, array_map(fn ($value): bool => (bool) $value, $checks), true) ? self::FAILURE : self::SUCCESS;
    }
}
