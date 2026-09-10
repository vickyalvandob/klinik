import { Link, useForm } from '@inertiajs/react';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useId, useState } from 'react';
import { DatePicker } from '@/components/date-picker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';

type Filters = {
    search: string;
    service_unit: string;
    date: string;
    status?: string;
    mode?: string;
};

export function WorklistFilters({
    action,
    resetUrl,
    filters,
    today,
    serviceUnits,
    statusOptions,
    only,
    dateLabel,
}: {
    action: string;
    resetUrl: string;
    filters: Filters;
    today: string;
    serviceUnits: Array<{ uuid: string; name: string }>;
    statusOptions?: Array<{ value: string; label: string }>;
    only: string[];
    dateLabel?: string;
}) {
    const id = useId();
    const form = useForm(filters);
    const [expanded, setExpanded] = useState(
        Boolean(filters.service_unit || filters.status),
    );
    const activeCount =
        Number(Boolean(form.data.service_unit)) +
        Number(Boolean(form.data.status));
    const filtered = Boolean(
        filters.search ||
        filters.service_unit ||
        filters.status ||
        (dateLabel && filters.date !== today),
    );

    return (
        <form
            aria-label="Filter daftar pasien"
            onSubmit={(event) => {
                event.preventDefault();
                form.get(action, {
                    only:
                        form.data.date !== filters.date
                            ? [...only, 'summary']
                            : only,
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                });
            }}
            className="space-y-3 border-b p-4"
        >
            <fieldset
                disabled={form.processing}
                className="flex min-w-0 flex-wrap items-center gap-2 disabled:opacity-60"
            >
                <div className="flex min-w-48 flex-1 basis-full items-center gap-2 sm:basis-48">
                    <div className="relative min-w-0 flex-1">
                        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                        <Input
                            type="search"
                            name="search"
                            aria-label="Cari pasien, nomor RM, atau antrean"
                            aria-invalid={Boolean(form.errors.search)}
                            placeholder="Cari pasien, RM, antrean…"
                            maxLength={100}
                            value={form.data.search}
                            onChange={(event) =>
                                form.setData('search', event.target.value)
                            }
                            className="pl-9"
                        />
                    </div>
                    {filtered && (
                        <Button
                            asChild
                            variant="ghost"
                            size="icon"
                            className="shrink-0"
                        >
                            <Link
                                href={resetUrl}
                                only={[...only, 'summary']}
                                preserveState
                                preserveScroll
                                replace
                                aria-label="Reset filter"
                            >
                                <X />
                            </Link>
                        </Button>
                    )}
                </div>
                {dateLabel && (
                    <div className="min-w-40 flex-1 sm:max-w-44">
                        <label className="sr-only" htmlFor={`${id}-date`}>
                            {dateLabel}
                        </label>
                        <DatePicker
                            id={`${id}-date`}
                            value={form.data.date}
                            onChange={(value) => form.setData('date', value)}
                            today={today}
                            disabled={form.processing}
                            aria-invalid={Boolean(form.errors.date)}
                        />
                    </div>
                )}
                <Button
                    type="button"
                    variant={
                        expanded || activeCount > 0 ? 'secondary' : 'outline'
                    }
                    size="icon"
                    onClick={() => setExpanded(!expanded)}
                    aria-label={
                        activeCount
                            ? `Filter tambahan, ${activeCount} aktif`
                            : 'Filter tambahan'
                    }
                    aria-expanded={expanded}
                    aria-controls={`${id}-advanced`}
                    className="relative shrink-0"
                >
                    <SlidersHorizontal />
                    {activeCount > 0 && (
                        <span className="bg-primary absolute top-1 right-1 size-1.5 rounded-full" />
                    )}
                </Button>
                <Button type="submit" variant="outline" className="shrink-0">
                    {form.processing ? <Spinner /> : <Search />}
                    Cari
                </Button>
                <div
                    id={`${id}-advanced`}
                    hidden={!expanded}
                    className="w-full"
                >
                    <div className="grid gap-2 sm:grid-cols-2">
                        <select
                            name="service_unit"
                            aria-label="Filter unit layanan"
                            value={form.data.service_unit}
                            onChange={(event) =>
                                form.setData('service_unit', event.target.value)
                            }
                            className={selectClassName}
                        >
                            <option value="">Semua unit</option>
                            {serviceUnits.map((unit) => (
                                <option key={unit.uuid} value={unit.uuid}>
                                    {unit.name}
                                </option>
                            ))}
                        </select>
                        {statusOptions && (
                            <select
                                name="status"
                                aria-label="Filter status"
                                value={form.data.status ?? ''}
                                onChange={(event) =>
                                    form.setData('status', event.target.value)
                                }
                                className={selectClassName}
                            >
                                <option value="">Semua status</option>
                                {statusOptions.map((status) => (
                                    <option
                                        key={status.value}
                                        value={status.value}
                                    >
                                        {status.label}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                </div>
            </fieldset>
            {Object.entries(form.errors).map(([field, error]) => (
                <p
                    key={field}
                    role="alert"
                    className="text-destructive text-xs"
                >
                    {error}
                </p>
            ))}
        </form>
    );
}

const selectClassName =
    'border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full min-w-0 rounded-md border px-3 text-sm outline-none focus-visible:ring-[3px]';
