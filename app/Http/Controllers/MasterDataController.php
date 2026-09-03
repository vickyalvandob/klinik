<?php

namespace App\Http\Controllers;

use App\Http\Requests\UpsertMasterDataRequest;
use App\Models\ClinicService;
use App\Models\Medicine;
use App\Models\Practitioner;
use App\Models\ServiceUnit;
use App\Models\StaffProfile;
use App\Support\MasterDataRegistry;
use App\Support\Tenancy\CurrentClinic;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class MasterDataController extends Controller
{
    public function __construct(private readonly CurrentClinic $currentClinic) {}

    public function index(Request $request, string $resource): Response
    {
        $this->authorizeAccess($request);
        $definition = MasterDataRegistry::get($resource);
        $modelClass = $definition['model'];
        $search = $request->string('search')->trim()->toString();
        $status = $request->string('status')->toString();

        /** @var Builder<Model> $query */
        $query = $modelClass::query()->where('clinic_id', $this->currentClinic->id());

        if ($search !== '') {
            $query->where(function (Builder $searchQuery) use ($definition, $resource, $search): void {
                foreach ($definition['search'] as $index => $column) {
                    $method = $index === 0 ? 'where' : 'orWhere';
                    $searchQuery->{$method}($column, 'like', "%{$search}%");
                }

                if ($resource === 'practitioners') {
                    $searchQuery->orWhereHas('staffProfile', fn (Builder $staffQuery) => $staffQuery->where('name', 'like', "%{$search}%"));
                }
            });
        }

        if (in_array($status, ['active', 'inactive'], true)) {
            $query->where('is_active', $status === 'active');
        }

        if ($resource === 'practitioners') {
            $query->with('staffProfile:id,name');
        }

        if ($resource === 'services') {
            $query->with('serviceUnit:id,name');
        }

        $records = $query
            ->latest('id')
            ->paginate(15)
            ->withQueryString()
            ->through(fn (Model $record): array => $this->serialize($record, $resource, $definition['fields']));

        $editing = $request->string('edit')->toString();
        $editingRecord = $editing === ''
            ? null
            : $this->serialize($this->findRecord($resource, $editing), $resource, $definition['fields']);

        return Inertia::render('master-data/index', [
            'resource' => $resource,
            'definition' => [
                'label' => $definition['label'],
                'singular' => $definition['singular'],
                'description' => $definition['description'],
                'fields' => $this->fieldsWithOptions($definition['fields'], $editingRecord),
                'columns' => $definition['columns'],
            ],
            'records' => $records,
            'editing' => $editingRecord,
            'filters' => ['search' => $search, 'status' => $status],
        ]);
    }

    public function store(UpsertMasterDataRequest $request, string $resource): RedirectResponse
    {
        $definition = MasterDataRegistry::get($resource);
        $validated = $this->normalized($request->validated());

        DB::transaction(function () use ($definition, $resource, $validated): void {
            $this->lockRelatedRecord($resource, $validated);
            $modelClass = $definition['model'];
            $record = new $modelClass;
            $record->fill($validated);
            $record->setAttribute('clinic_id', $this->currentClinic->id());
            $record->save();
        });

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => ucfirst($definition['singular']).' berhasil ditambahkan.',
        ]);

        return back();
    }

    public function update(UpsertMasterDataRequest $request, string $resource, string $record): RedirectResponse
    {
        $definition = MasterDataRegistry::get($resource);
        $masterRecord = $this->findRecord($resource, $record);
        $validated = $this->normalized($request->validated());

        DB::transaction(function () use ($masterRecord, $resource, $validated): void {
            $lockedRecord = $masterRecord::query()
                ->where('clinic_id', $this->currentClinic->id())
                ->whereKey($masterRecord->getKey())
                ->lockForUpdate()
                ->firstOrFail();
            $this->lockRelatedRecord($resource, $validated);
            $lockedRecord->fill($validated)->save();
        });

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => ucfirst($definition['singular']).' berhasil diperbarui.',
        ]);

        return to_route('master-data.index', ['resource' => $resource]);
    }

    public function toggle(Request $request, string $resource, string $record): RedirectResponse
    {
        $this->authorizeAccess($request);
        $definition = MasterDataRegistry::get($resource);
        $newStatus = DB::transaction(function () use ($resource, $record): bool {
            $masterRecord = $this->findRecord($resource, $record);
            $masterRecord = $masterRecord::query()
                ->where('clinic_id', $this->currentClinic->id())
                ->whereKey($masterRecord->getKey())
                ->lockForUpdate()
                ->firstOrFail();

            if ($masterRecord->getAttribute('is_active') === true) {
                $this->ensureCanDeactivate($masterRecord);
            }

            $newStatus = ! (bool) $masterRecord->getAttribute('is_active');
            $masterRecord->setAttribute('is_active', $newStatus);
            $masterRecord->save();

            return $newStatus;
        });

        Inertia::flash('toast', [
            'type' => 'success',
            'message' => ucfirst($definition['singular']).' berhasil '.($newStatus ? 'diaktifkan.' : 'dinonaktifkan.'),
        ]);

        return back();
    }

    private function authorizeAccess(Request $request): void
    {
        abort_unless($request->user()?->hasClinicPermission('master_data.manage') === true, 403);
    }

    private function findRecord(string $resource, string $uuid): Model
    {
        $modelClass = MasterDataRegistry::get($resource)['model'];

        return $modelClass::query()
            ->where('clinic_id', $this->currentClinic->id())
            ->where('uuid', $uuid)
            ->firstOrFail();
    }

    /**
     * @param  list<array<string, mixed>>  $fields
     * @return array<string, mixed>
     */
    private function serialize(Model $record, string $resource, array $fields): array
    {
        $values = [];

        foreach ($fields as $field) {
            $value = $record->getAttribute((string) $field['key']);
            $values[(string) $field['key']] = $value instanceof \DateTimeInterface
                ? $value->format('Y-m-d')
                : $value;
        }

        $columns = $values;

        if ($record instanceof Practitioner) {
            $columns['staff_profile'] = $record->staffProfile->name;
        }

        if ($record instanceof ClinicService) {
            $columns['service_unit'] = $record->serviceUnit->name;
        }

        return [
            'uuid' => (string) $record->getAttribute('uuid'),
            'is_active' => (bool) $record->getAttribute('is_active'),
            'values' => $values,
            'columns' => $columns,
        ];
    }

    /**
     * @param  list<array<string, mixed>>  $fields
     * @param  array<string, mixed>|null  $editingRecord
     * @return list<array<string, mixed>>
     */
    private function fieldsWithOptions(array $fields, ?array $editingRecord): array
    {
        return array_values(collect($fields)->map(function (array $field) use ($editingRecord): array {
            if (($field['option_source'] ?? null) === 'staff') {
                $editingStaffId = $editingRecord['values']['staff_profile_id'] ?? null;
                $field['options'] = StaffProfile::query()
                    ->where('clinic_id', $this->currentClinic->id())
                    ->where(function (Builder $query) use ($editingStaffId): void {
                        $query->where('is_active', true);

                        if ($editingStaffId !== null) {
                            $query->orWhereKey($editingStaffId);
                        }
                    })
                    ->where(function (Builder $query) use ($editingStaffId): void {
                        $query->whereDoesntHave('practitioner');

                        if ($editingStaffId !== null) {
                            $query->orWhereKey($editingStaffId);
                        }
                    })
                    ->orderBy('name')
                    ->pluck('name', 'id')
                    ->mapWithKeys(fn (string $label, int $id): array => [(string) $id => $label])
                    ->all();
            }

            if (($field['option_source'] ?? null) === 'service_units') {
                $editingServiceUnitId = $editingRecord['values']['service_unit_id'] ?? null;
                $field['options'] = ServiceUnit::query()
                    ->where('clinic_id', $this->currentClinic->id())
                    ->where(function (Builder $query) use ($editingServiceUnitId): void {
                        $query->where('is_active', true);

                        if ($editingServiceUnitId !== null) {
                            $query->orWhereKey($editingServiceUnitId);
                        }
                    })
                    ->orderBy('name')
                    ->pluck('name', 'id')
                    ->mapWithKeys(fn (string $label, int $id): array => [(string) $id => $label])
                    ->all();
            }

            unset($field['option_source']);

            return $field;
        })->all());
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    private function normalized(array $validated): array
    {
        foreach (['code', 'queue_prefix'] as $key) {
            if (isset($validated[$key]) && is_string($validated[$key])) {
                $validated[$key] = mb_strtoupper(trim($validated[$key]));
            }
        }

        return $validated;
    }

    /** @param array<string, mixed> $validated */
    private function lockRelatedRecord(string $resource, array $validated): void
    {
        $relation = match ($resource) {
            'practitioners' => [StaffProfile::class, $validated['staff_profile_id'] ?? null],
            'services' => [ServiceUnit::class, $validated['service_unit_id'] ?? null],
            default => null,
        };

        if ($relation === null) {
            return;
        }

        [$modelClass, $recordId] = $relation;
        $modelClass::query()
            ->where('clinic_id', $this->currentClinic->id())
            ->whereKey($recordId)
            ->lockForUpdate()
            ->firstOrFail();
    }

    private function ensureCanDeactivate(Model $record): void
    {
        if ($record instanceof StaffProfile) {
            if ($record->memberships()->where('is_active', true)->exists()) {
                throw ValidationException::withMessages([
                    'status' => 'Staf masih terhubung ke akun aktif. Nonaktifkan akses pengguna terlebih dahulu.',
                ]);
            }

            if ($record->practitioner()->where('is_active', true)->exists()) {
                throw ValidationException::withMessages([
                    'status' => 'Staf masih terhubung ke praktisi aktif. Nonaktifkan praktisi terlebih dahulu.',
                ]);
            }
        }

        if ($record instanceof ServiceUnit && $record->services()->where('is_active', true)->exists()) {
            throw ValidationException::withMessages([
                'status' => 'Unit masih memiliki layanan aktif. Nonaktifkan layanan terlebih dahulu.',
            ]);
        }

        if (! $record instanceof StaffProfile
            && ! $record instanceof Practitioner
            && ! $record instanceof ServiceUnit
            && ! $record instanceof ClinicService
            && ! $record instanceof Medicine) {
            abort(404);
        }
    }
}
