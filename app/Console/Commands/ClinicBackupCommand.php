<?php

namespace App\Console\Commands;

use App\Services\ClinicBackup;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Throwable;

#[Signature('clinic:backup {--verify= : Verify an existing encrypted archive} {--prune : Apply configured retention after a successful backup}')]
#[Description('Create or verify an encrypted database and clinical-file backup')]
class ClinicBackupCommand extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(ClinicBackup $backup): int
    {
        try {
            if ($this->option('verify')) {
                $backup->verify((string) $this->option('verify'));
                $this->info('Integritas backup terverifikasi.');

                return self::SUCCESS;
            }
            $name = Cache::lock('clinic-backup', 1800)->get(fn (): string => $backup->create());
            if (! is_string($name)) {
                $this->error('Backup lain masih berjalan.');

                return self::FAILURE;
            }
            $this->info('Backup terenkripsi: '.$name);
            if ($this->option('prune')) {
                $disk = Storage::disk('backups');
                $cutoff = now()->subDays(max(1, (int) config('clinic-security.backup_retention_days')))->timestamp;
                foreach ($disk->files() as $file) {
                    if ($file !== $name && preg_match('/^clinic-[a-zA-Z0-9-]+\.enc$/D', $file)
                        && $disk->lastModified($file) < $cutoff) {
                        $disk->delete($file);
                    }
                }
            }
            Log::info('clinic.backup.completed', ['archive' => $name]);

            return self::SUCCESS;
        } catch (Throwable $exception) {
            Log::error('clinic.backup.failed', ['exception' => $exception::class]);
            $this->error('Backup gagal: '.$exception->getMessage());

            return self::FAILURE;
        }
    }
}
