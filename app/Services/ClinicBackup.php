<?php

namespace App\Services;

use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use PDO;
use RuntimeException;

class ClinicBackup
{
    public function create(): string
    {
        $work = $this->workspace();
        $disk = Storage::disk('backups');
        $name = 'clinic-'.now()->format('Ymd-His').'-'.Str::uuid().'.enc';
        $pending = $name.'.pending';
        $output = null;
        try {
            $driver = DB::connection()->getDriverName();
            $counts = $this->dump($work.'/database.sql', $driver);
            $disk->put($pending, '');
            $output = fopen($disk->path($pending), 'wb');
            if ($output === false) {
                throw new RuntimeException('Tidak dapat menulis backup.');
            }
            $sequence = 0;
            $archiveId = (string) Str::uuid();
            $write = function (array $record) use ($output, &$sequence, $archiveId): void {
                $encrypted = Crypt::encryptString(json_encode([
                    'archive_id' => $archiveId, 'sequence' => $sequence++, ...$record,
                ], JSON_THROW_ON_ERROR));
                if (fwrite($output, $encrypted."\n") !== strlen($encrypted) + 1) {
                    throw new RuntimeException('Backup tidak dapat ditulis lengkap.');
                }
            };
            $write(['type' => 'header', 'version' => 1, 'driver' => $driver, 'counts' => $counts, 'created_at' => now()->toIso8601String()]);
            $files = ['database.sql' => $work.'/database.sql'];
            foreach (Storage::disk('clinical')->allFiles() as $path) {
                $files['clinical/'.$path] = Storage::disk('clinical')->path($path);
            }
            foreach ($files as $relative => $path) {
                $write(['type' => 'file', 'path' => $relative]);
                $input = fopen($path, 'rb');
                if ($input === false) {
                    throw new RuntimeException('Berkas sumber backup tidak dapat dibaca.');
                }
                $hash = hash_init('sha256');
                try {
                    while (! feof($input)) {
                        $chunk = fread($input, 524288);
                        if ($chunk === false) {
                            throw new RuntimeException('Pembacaan backup gagal.');
                        }
                        hash_update($hash, $chunk);
                        $write(['type' => 'chunk', 'data' => base64_encode($chunk)]);
                    }
                } finally {
                    fclose($input);
                }
                $write(['type' => 'end_file', 'sha256' => hash_final($hash)]);
            }
            $write(['type' => 'complete', 'files' => count($files)]);
            fclose($output);
            $output = null;
            $disk->move($pending, $name);
            $this->verify($name);
            $disk->put('latest-backup.json', json_encode(['archive' => $name, 'created_at' => now()->toIso8601String()], JSON_THROW_ON_ERROR));

            return $name;
        } finally {
            if (is_resource($output)) {
                fclose($output);
            }
            $disk->delete($pending);
            File::deleteDirectory($work);
        }
    }

    /** @return array<string, mixed> */
    public function verify(string $name, ?string $destination = null): array
    {
        if (basename($name) !== $name || ! preg_match('/^clinic-[a-zA-Z0-9-]+\.enc$/D', $name)) {
            throw new RuntimeException('Nama arsip backup tidak valid.');
        }
        $input = Storage::disk('backups')->readStream($name);
        $sequence = 0;
        $archiveId = null;
        $header = [];
        $hash = null;
        $output = null;
        $complete = false;
        $paths = [];
        try {
            while (($line = fgets($input, 2000000)) !== false) {
                $row = json_decode(Crypt::decryptString(trim($line)), true, flags: JSON_THROW_ON_ERROR);
                $archiveId ??= $row['archive_id'];
                if ($complete || $row['sequence'] !== $sequence++ || $row['archive_id'] !== $archiveId) {
                    throw new RuntimeException('Urutan backup tidak valid.');
                }
                switch ($row['type']) {
                    case 'header':
                        if ($sequence !== 1 || $row['version'] !== 1) {
                            throw new RuntimeException('Versi backup tidak didukung.');
                        }
                        $header = $row;
                        break;
                    case 'file':
                        $path = $row['path'];
                        if ($header === [] || $hash !== null || isset($paths[$path])
                            || ! preg_match('#^(database\.sql|clinical/[a-zA-Z0-9_./-]+)$#D', $path)
                            || str_contains($path, '..')) {
                            throw new RuntimeException('Jalur berkas backup tidak valid.');
                        }
                        $paths[$path] = true;
                        $hash = hash_init('sha256');
                        if ($destination !== null) {
                            File::ensureDirectoryExists(dirname($destination.'/'.$path), 0700);
                            $output = fopen($destination.'/'.$path, 'xb');
                        }
                        break;
                    case 'chunk':
                        $data = base64_decode($row['data'], true);
                        if ($hash === null || $data === false) {
                            throw new RuntimeException('Isi backup tidak valid.');
                        }
                        hash_update($hash, $data);
                        if (is_resource($output) && fwrite($output, $data) !== strlen($data)) {
                            throw new RuntimeException('Ekstraksi backup gagal.');
                        }
                        break;
                    case 'end_file':
                        if ($hash === null || ! hash_equals($row['sha256'], hash_final($hash))) {
                            throw new RuntimeException('Checksum backup tidak cocok.');
                        }
                        $hash = null;
                        if (is_resource($output)) {
                            fclose($output);
                            $output = null;
                        }
                        break;
                    case 'complete':
                        $complete = $hash === null && isset($paths['database.sql']) && count($paths) === $row['files'];
                        break;
                    default:
                        throw new RuntimeException('Struktur backup tidak valid.');
                }
            }
            if (! $complete) {
                throw new RuntimeException('Backup terpotong atau belum selesai.');
            }

            return [...$header, 'files' => count($paths) - 1];
        } finally {
            fclose($input);
            if (is_resource($output)) {
                fclose($output);
            }
        }
    }

    /** @return array<string, mixed> */
    public function drill(string $name): array
    {
        $work = $this->workspace();
        $target = null;
        $targetCreated = false;
        $pdo = null;
        try {
            $metadata = $this->verify($name, $work);
            if ($metadata['driver'] === 'sqlite') {
                $pdo = new PDO('sqlite:'.$work.'/restored.sqlite');
                $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                $pdo->exec(File::get($work.'/database.sql'));
                $integrity = $pdo->query('PRAGMA integrity_check');
                $foreignKeys = $pdo->query('PRAGMA foreign_key_check');
                if ($integrity === false || $foreignKeys === false || $integrity->fetchColumn() !== 'ok'
                    || $foreignKeys->fetch() !== false) {
                    throw new RuntimeException('Integritas database hasil restore gagal.');
                }
            } elseif ($metadata['driver'] === 'mysql' && DB::connection()->getDriverName() === 'mysql') {
                $target = 'clinic_drill_'.str_replace('-', '', (string) Str::uuid());
                DB::statement('CREATE DATABASE `'.$target.'`');
                $targetCreated = true;
                $config = DB::connection()->getConfig();
                $input = fopen($work.'/database.sql', 'rb');
                if ($input === false) {
                    throw new RuntimeException('SQL backup tidak dapat dibaca.');
                }
                try {
                    $result = Process::timeout(600)->env(['MYSQL_PWD' => (string) $config['password']])->input($input)
                        ->run([$this->binary('mysql'), ...$this->connectionArguments(), '--database='.$target]);
                    if (! $result->successful()) {
                        throw new RuntimeException('Restore MySQL gagal. Periksa izin akun database dan kompatibilitas server.');
                    }
                } finally {
                    fclose($input);
                }
                config(['database.connections.clinic_restore_drill' => [...$config, 'database' => $target]]);
                DB::purge('clinic_restore_drill');
                $pdo = DB::connection('clinic_restore_drill')->getPdo();
            } else {
                throw new RuntimeException('Driver backup tidak cocok dengan lingkungan restore.');
            }
            foreach ($metadata['counts'] as $table => $expected) {
                if (! preg_match('/^[a-zA-Z0-9_]+$/D', $table)) {
                    throw new RuntimeException('Nama tabel backup tidak valid.');
                }
                $statement = $pdo->query('SELECT COUNT(*) FROM `'.$table.'`');
                if ($statement === false) {
                    throw new RuntimeException('Tabel hasil restore tidak dapat dibaca.');
                }
                $actual = (int) $statement->fetchColumn();
                if ($actual !== $expected) {
                    throw new RuntimeException('Jumlah baris hasil restore tidak cocok: '.$table);
                }
            }
            $result = ['archive' => $name, 'verified_at' => now()->toIso8601String(),
                'tables' => count($metadata['counts']), 'rows' => array_sum($metadata['counts']), 'files' => $metadata['files']];
            Storage::disk('backups')->put('latest-drill.json', json_encode($result, JSON_THROW_ON_ERROR));

            return $result;
        } finally {
            $pdo = null;
            DB::purge('clinic_restore_drill');
            if ($targetCreated && $target !== null && preg_match('/^clinic_drill_[a-f0-9]{32}$/D', $target)
                && $target !== DB::connection()->getDatabaseName()) {
                DB::statement('DROP DATABASE `'.$target.'`');
            }
            File::deleteDirectory($work);
        }
    }

    /** @return array<string, int> */
    private function dump(string $path, string $driver): array
    {
        if ($driver === 'mysql') {
            $config = DB::connection()->getConfig();
            $result = Process::timeout(600)->env(['MYSQL_PWD' => (string) $config['password']])->run([
                $this->binary('mysqldump'), ...$this->connectionArguments(), '--single-transaction', '--skip-lock-tables',
                '--hex-blob', '--no-tablespaces', '--skip-extended-insert', '--set-gtid-purged=OFF',
                '--routines', '--events', '--triggers', '--result-file='.$path, $config['database'],
            ]);
            if (! $result->successful()) {
                throw new RuntimeException('Backup MySQL gagal. Periksa executable mysqldump dan izin database.');
            }
            $counts = [];
            $input = fopen($path, 'rb');
            if ($input === false) {
                throw new RuntimeException('SQL backup tidak dapat dibaca.');
            }
            try {
                while (($line = fgets($input)) !== false) {
                    if (preg_match('/^CREATE TABLE `([^`]+)`/', $line, $matches)) {
                        $counts[$matches[1]] = 0;
                    } elseif (preg_match('/^INSERT INTO `([^`]+)` VALUES/', $line, $matches)) {
                        $counts[$matches[1]]++;
                    }
                }
            } finally {
                fclose($input);
            }

            return $counts;
        }
        if ($driver !== 'sqlite') {
            throw new RuntimeException('Backup mendukung MySQL dan SQLite.');
        }

        return DB::transaction(function () use ($path): array {
            $output = fopen($path, 'wb');
            if ($output === false) {
                throw new RuntimeException('SQL backup tidak dapat ditulis.');
            }
            $counts = [];
            try {
                fwrite($output, "PRAGMA foreign_keys=OFF;\n");
                $schemas = DB::select("SELECT name, type, sql FROM sqlite_master WHERE sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY CASE type WHEN 'table' THEN 0 ELSE 1 END, name");
                foreach ($schemas as $schema) {
                    fwrite($output, $schema->sql.";\n");
                    if ($schema->type !== 'table') {
                        continue;
                    }
                    $counts[$schema->name] = 0;
                    foreach (DB::table($schema->name)->orderByRaw('1')->lazy(200) as $row) {
                        $values = array_map(fn ($value): string => $value === null ? 'NULL' : (is_numeric($value) && ! is_string($value)
                            ? (string) $value : "CAST(X'".bin2hex((string) $value)."' AS TEXT)"), (array) $row);
                        fwrite($output, 'INSERT INTO "'.str_replace('"', '""', $schema->name).'" VALUES ('.implode(',', $values).");\n");
                        $counts[$schema->name]++;
                    }
                }
                fwrite($output, "PRAGMA foreign_keys=ON;\n");
            } finally {
                fclose($output);
            }

            return $counts;
        });
    }

    /** @return list<string> */
    private function connectionArguments(): array
    {
        $config = DB::connection()->getConfig();

        return ['--host='.$config['host'], '--port='.$config['port'], '--user='.$config['username'], '--default-character-set=utf8mb4'];
    }

    private function binary(string $name): string
    {
        return (string) config('clinic-security.'.$name.'_binary', $name);
    }

    private function workspace(): string
    {
        $path = storage_path('app/private/backup-work/'.Str::uuid());
        File::ensureDirectoryExists($path, 0700);

        return $path;
    }
}
