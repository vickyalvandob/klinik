<?php

namespace App\Console\Commands;

use App\Services\ClinicBackup;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Throwable;

#[Signature('clinic:backup:drill {archive : Encrypted archive filename}')]
#[Description('Restore into a fresh isolated database, verify row counts and files, then remove only the temporary database')]
class ClinicRestoreDrillCommand extends Command
{
    /**
     * Execute the console command.
     */
    public function handle(ClinicBackup $backup): int
    {
        try {
            $result = $backup->drill((string) $this->argument('archive'));
            $this->info(sprintf('Restore terverifikasi: %d tabel, %d baris, %d lampiran.', $result['tables'], $result['rows'], $result['files']));
            Log::info('clinic.restore_drill.completed', $result);

            return self::SUCCESS;
        } catch (Throwable $exception) {
            Log::error('clinic.restore_drill.failed', ['exception' => $exception::class]);
            $this->error('Restore drill gagal: '.$exception->getMessage());

            return self::FAILURE;
        }
    }
}
