<?php

use App\Models\MedicalRecordAccessLog;
use App\Models\MedicalRecordFile;
use App\Models\Role;
use App\Services\ClinicBackup;
use App\SystemRole;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;

test('reading a record logs its actual actor and never exposes clinical content through audit', function () {
    $context = createFinalizedVisit($this);
    $this->get(route('medical-records.edit', $context['encounter']))
        ->assertOk()->assertHeader('X-Content-Type-Options', 'nosniff');
    $this->assertDatabaseHas('medical_record_access_logs', [
        'clinic_id' => $context['clinic']->id, 'medical_record_id' => $context['record']->id,
        'actor_id' => $context['user']->id, 'action' => 'view',
    ]);
    $this->get(route('audit.index', ['source' => 'access']))->assertInertia(fn (Assert $page) => $page
        ->component('audit/index')->has('logs.data', 1)->where('logs.data.0.actor', $context['user']->name)
        ->missing('logs.data.0.subjective')->missing('logs.data.0.before_values'));
    $log = MedicalRecordAccessLog::withoutGlobalScopes()->sole();
    expect(fn () => $log->update(['action' => 'tampered']))->toThrow(LogicException::class);
});

test('audit viewer excludes other clinics and requires audit permission', function () {
    $context = createFinalizedVisit($this);
    $this->get(route('medical-records.edit', $context['encounter']))->assertOk();
    $other = createFinalizedVisit($this);
    $this->get(route('audit.index', ['source' => 'access']))->assertInertia(fn (Assert $page) => $page->has('logs.data', 0));
    $other['membership']->update(['role_id' => Role::where('code', SystemRole::Cashier->value)->sole()->id]);
    $this->get(route('audit.index'))->assertForbidden();
});

test('private attachments require clinical authorization and log downloads', function () {
    Storage::fake('clinical');
    $context = createFinalizedVisit($this);
    $this->post(route('medical-record-files.store', $context['record']), [
        'file' => UploadedFile::fake()->createWithContent('hasil.pdf', "%PDF-1.4\nPrivate clinical result\n%%EOF"),
    ])->assertSessionHasNoErrors()->assertRedirect();
    $file = MedicalRecordFile::withoutGlobalScopes()->sole();
    Storage::disk('clinical')->assertExists($file->getAttribute('path'));
    $response = $this->get(route('medical-record-files.show', $file));
    $response->assertDownload('hasil.pdf')->assertHeader('X-Content-Type-Options', 'nosniff');
    $this->assertDatabaseHas('medical_record_access_logs', ['actor_id' => $context['user']->id, 'action' => 'file_download']);
    expect($file->toArray())->not->toHaveKey('path');
    $context['membership']->update(['role_id' => Role::where('code', SystemRole::Cashier->value)->sole()->id]);
    $this->get(route('medical-record-files.show', $file))->assertForbidden();
});

test('foreign owners cannot open records or files and executable uploads are rejected', function () {
    Storage::fake('clinical');
    $context = createFinalizedVisit($this);
    $this->post(route('medical-record-files.store', $context['record']), [
        'file' => UploadedFile::fake()->createWithContent('malicious.php', '<?php phpinfo();'),
    ])->assertSessionHasErrors('file');
    expect(MedicalRecordFile::withoutGlobalScopes()->count())->toBe(0);
    createFinalizedVisit($this);
    $this->get(route('medical-records.edit', $context['encounter']))->assertNotFound();
    $this->post(route('medical-record-files.store', $context['record']), [
        'file' => UploadedFile::fake()->createWithContent('result.pdf', '%PDF-1.4'),
    ])->assertNotFound();
});

test('clinical reads are throttled and authenticated responses cannot be cached', function () {
    config(['clinic-security.clinical_reads_per_minute' => 1]);
    $context = createFinalizedVisit($this);
    $response = $this->get(route('medical-records.edit', $context['encounter']));
    $response->assertOk()->assertHeader('X-Frame-Options', 'SAMEORIGIN');
    expect($response->headers->get('Cache-Control'))->toContain('no-store');
    $this->get(route('medical-records.edit', $context['encounter']))->assertTooManyRequests();
});

test('encrypted backup restores database rows and private files in an isolated drill', function () {
    Storage::fake('backups');
    Storage::fake('clinical');
    createFinalizedVisit($this);
    Storage::disk('clinical')->put('medical-records/sample/hasil.pdf', 'Private backup content');
    $backup = app(ClinicBackup::class);

    $name = $backup->create();
    $metadata = $backup->verify($name);
    $result = $backup->drill($name);

    expect(Storage::disk('backups')->get($name))->not->toContain('Private backup content')->not->toContain('Kontrol privat');
    expect($result['tables'])->toBe(count($metadata['counts']))
        ->and($result['rows'])->toBe(array_sum($metadata['counts']))->and($result['files'])->toBe(1);
    $this->assertDatabaseCount('medical_records', 1);
    Storage::disk('clinical')->assertExists('medical-records/sample/hasil.pdf');
    Storage::disk('backups')->assertExists('latest-drill.json');
});

test('backup verification rejects truncated archives and path traversal', function () {
    Storage::fake('backups');
    Storage::fake('clinical');
    $backup = app(ClinicBackup::class);
    $name = $backup->create();
    $contents = Storage::disk('backups')->get($name);
    Storage::disk('backups')->put($name, substr($contents, 0, strpos($contents, "\n") + 1));

    expect(fn () => $backup->verify($name))->toThrow(RuntimeException::class, 'Backup terpotong atau belum selesai.');
    expect(fn () => $backup->verify('../secrets.enc'))->toThrow(RuntimeException::class, 'Nama arsip backup tidak valid.');
});
