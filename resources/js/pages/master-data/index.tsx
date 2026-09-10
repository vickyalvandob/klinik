import { Head, router, useForm } from '@inertiajs/react';
import {
    Database,
    MoreHorizontal,
    Pencil,
    Plus,
    Power,
    Search,
    X,
} from 'lucide-react';
import { useState } from 'react';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import { PaginationLinks } from '@/components/pagination-links';
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { dashboard } from '@/routes';
import { index, overview, toggle } from '@/routes/master-data';
import { RecordForm } from './record-form';
import { ResourceNavigation } from './resource-navigation';
import type {
    Column,
    Filters,
    MasterForm,
    Pagination,
    RecordItem,
    Resource,
} from './types';

const currency = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
});
const valueLabels: Record<string, string> = {
    doctor: 'Dokter',
    dentist: 'Dokter gigi',
    midwife: 'Bidan',
    nurse: 'Perawat',
    other: 'Lainnya',
    outpatient: 'Rawat jalan',
    laboratory: 'Laboratorium',
    radiology: 'Radiologi',
    pharmacy: 'Farmasi',
};

export default function MasterDataIndex(props: {
    resource: string;
    resources: Resource[];
    definition: {
        label: string;
        singular: string;
        description: string;
        columns: Column[];
    };
    records: Pagination;
    form: MasterForm | null;
    filters: Filters;
}) {
    return <MasterDataContent key={props.resource} {...props} />;
}

function MasterDataContent({
    resource,
    resources,
    definition,
    records,
    form,
    filters,
}: Parameters<typeof MasterDataIndex>[0]) {
    const [loadingForm, setLoadingForm] = useState(false);
    const [statusRecord, setStatusRecord] = useState<RecordItem | null>(null);
    const query = { ...filters, page: records.current_page };
    const openForm = (record?: RecordItem) => {
        if (loadingForm) return;
        router.get(
            index.url(resource),
            { ...query, ...(record ? { edit: record.uuid } : { create: 1 }) },
            {
                only: ['form'],
                preserveState: true,
                preserveScroll: true,
                onStart: () => setLoadingForm(true),
                onFinish: () => setLoadingForm(false),
            },
        );
    };
    const closeForm = () =>
        router.get(index.url(resource), query, {
            only: ['form'],
            preserveState: true,
            preserveScroll: true,
            replace: true,
        });
    const hasFilters = filters.search !== '' || filters.status !== '';
    const primaryKey = resource === 'practitioners' ? 'staff_profile' : 'name';
    const rowActions = (record: RecordItem) => (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    size="icon"
                    variant="ghost"
                    disabled={loadingForm}
                    aria-label={'Aksi ' + record.columns[primaryKey]}
                >
                    <MoreHorizontal />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => openForm(record)}>
                    <Pencil />
                    Edit {definition.singular}
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setStatusRecord(record)}>
                    <Power />
                    {record.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
    const badge = (record: RecordItem) => (
        <Badge
            variant="outline"
            className={
                record.is_active
                    ? 'border-emerald-600/20 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400'
                    : 'text-muted-foreground'
            }
        >
            <span
                className={cn(
                    'size-1.5 rounded-full',
                    record.is_active
                        ? 'bg-emerald-500'
                        : 'bg-muted-foreground/60',
                )}
            />
            {record.is_active ? 'Aktif' : 'Nonaktif'}
        </Badge>
    );
    return (
        <>
            <Head title={definition.label + ' · Master Data'} />
            <div className="flex min-w-0 flex-1 flex-col gap-5 p-4 md:p-6">
                <PageHeader
                    eyebrow="Master data"
                    title={definition.label}
                    description={definition.description}
                    actions={
                        <Button
                            onClick={() => openForm()}
                            disabled={loadingForm}
                        >
                            {loadingForm ? <Spinner /> : <Plus />}Tambah{' '}
                            {definition.singular}
                        </Button>
                    }
                />
                <ResourceNavigation resources={resources} current={resource} />
                <section
                    aria-label={'Daftar ' + definition.label.toLowerCase()}
                    className="bg-card min-w-0 overflow-hidden rounded-xl border"
                >
                    <div className="space-y-4 border-b p-4">
                        <div className="flex items-center justify-between gap-3">
                            <h2 className="text-sm font-semibold">
                                Daftar {definition.label.toLowerCase()}{' '}
                                <span className="text-muted-foreground ml-1 font-normal">
                                    ({records.total.toLocaleString('id-ID')})
                                </span>
                            </h2>
                            <span
                                role="status"
                                className="text-muted-foreground text-xs"
                            >
                                {loadingForm
                                    ? 'Membuka formulir…'
                                    : 'Klinik aktif'}
                            </span>
                        </div>
                        <ListFilters
                            key={[
                                filters.search,
                                filters.status,
                                filters.per_page,
                            ].join('|')}
                            resource={resource}
                            label={definition.label}
                            filters={filters}
                        />
                    </div>
                    {records.data.length === 0 ? (
                        <EmptyState
                            icon={Database}
                            title={
                                hasFilters
                                    ? 'Data tidak ditemukan'
                                    : 'Belum ada ' +
                                      definition.label.toLowerCase()
                            }
                            description={
                                hasFilters
                                    ? 'Coba kata kunci lain atau hapus filter untuk melihat seluruh data.'
                                    : 'Tambahkan ' +
                                      definition.singular +
                                      ' pertama untuk mulai digunakan dalam pelayanan.'
                            }
                            className="rounded-none border-0 py-14"
                        />
                    ) : (
                        <>
                            <div className="hidden md:block">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/30">
                                            {definition.columns.map(
                                                (column) => (
                                                    <TableHead
                                                        key={column.key}
                                                        className={
                                                            column.format ===
                                                            'currency'
                                                                ? 'text-right'
                                                                : undefined
                                                        }
                                                    >
                                                        {column.label}
                                                    </TableHead>
                                                ),
                                            )}
                                            <TableHead>Status</TableHead>
                                            <TableHead className="w-14">
                                                <span className="sr-only">
                                                    Aksi
                                                </span>
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {records.data.map((record) => (
                                            <TableRow key={record.uuid}>
                                                {definition.columns.map(
                                                    (column) => (
                                                        <TableCell
                                                            key={column.key}
                                                            className={cn(
                                                                'py-3',
                                                                column.format ===
                                                                    'currency' &&
                                                                    'text-right tabular-nums',
                                                                column.key ===
                                                                    'code' &&
                                                                    'text-muted-foreground text-xs',
                                                            )}
                                                        >
                                                            {column.key ===
                                                            primaryKey ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        openForm(
                                                                            record,
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        loadingForm
                                                                    }
                                                                    className="focus-visible:ring-ring max-w-80 rounded-sm text-left font-medium break-words whitespace-normal underline-offset-4 outline-none hover:underline focus-visible:ring-2"
                                                                >
                                                                    {formatValue(
                                                                        record
                                                                            .columns[
                                                                            column
                                                                                .key
                                                                        ],
                                                                        column.format,
                                                                    )}
                                                                </button>
                                                            ) : (
                                                                formatValue(
                                                                    record
                                                                        .columns[
                                                                        column
                                                                            .key
                                                                    ],
                                                                    column.format,
                                                                    column.key,
                                                                )
                                                            )}
                                                        </TableCell>
                                                    ),
                                                )}
                                                <TableCell>
                                                    {badge(record)}
                                                </TableCell>
                                                <TableCell>
                                                    {rowActions(record)}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                            <div className="divide-y md:hidden">
                                {records.data.map((record) => (
                                    <article
                                        key={record.uuid}
                                        className="space-y-3 p-4"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0 space-y-2">
                                                <button
                                                    onClick={() =>
                                                        openForm(record)
                                                    }
                                                    disabled={loadingForm}
                                                    className="focus-visible:ring-ring rounded-sm text-left text-sm font-semibold break-words outline-none focus-visible:ring-2"
                                                >
                                                    {formatValue(
                                                        record.columns[
                                                            primaryKey
                                                        ],
                                                    )}
                                                </button>
                                                <div>{badge(record)}</div>
                                            </div>
                                            {rowActions(record)}
                                        </div>
                                        <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                                            {definition.columns
                                                .filter(
                                                    (column) =>
                                                        column.key !==
                                                        primaryKey,
                                                )
                                                .map((column) => (
                                                    <div
                                                        key={column.key}
                                                        className="min-w-0"
                                                    >
                                                        <dt className="text-muted-foreground text-xs">
                                                            {column.label}
                                                        </dt>
                                                        <dd className="mt-1 text-sm break-words">
                                                            {formatValue(
                                                                record.columns[
                                                                    column.key
                                                                ],
                                                                column.format,
                                                                column.key,
                                                            )}
                                                        </dd>
                                                    </div>
                                                ))}
                                        </dl>
                                    </article>
                                ))}
                            </div>
                        </>
                    )}
                    <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                        <p className="text-muted-foreground text-xs">
                            Menampilkan {records.from ?? 0}–{records.to ?? 0}{' '}
                            dari {records.total.toLocaleString('id-ID')} data
                        </p>
                        <PaginationLinks
                            links={records.links}
                            only={['records', 'filters']}
                            preserveState
                        />
                    </div>
                </section>
            </div>
            {form && (
                <RecordForm
                    key={resource + '-' + (form.record?.uuid ?? 'create')}
                    resource={resource}
                    singular={definition.singular}
                    initial={form}
                    query={query}
                    onClose={closeForm}
                />
            )}
            {statusRecord && (
                <StatusConfirmation
                    resource={resource}
                    record={statusRecord}
                    name={String(statusRecord.columns[primaryKey])}
                    onClose={() => setStatusRecord(null)}
                />
            )}
        </>
    );
}

function ListFilters({
    resource,
    label,
    filters,
}: {
    resource: string;
    label: string;
    filters: Filters;
}) {
    const form = useForm(filters);
    return (
        <form
            onSubmit={(event) => {
                event.preventDefault();
                form.get(index.url(resource), {
                    only: ['records', 'filters'],
                    preserveState: true,
                    preserveScroll: true,
                    replace: true,
                });
            }}
            className="flex flex-col gap-2 lg:flex-row"
        >
            <div className="relative min-w-0 flex-1">
                <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input
                    aria-label={'Cari ' + label.toLowerCase()}
                    placeholder={'Cari ' + label.toLowerCase() + '…'}
                    value={form.data.search}
                    onChange={(event) =>
                        form.setData('search', event.target.value)
                    }
                    maxLength={100}
                    className="h-10 pr-10 pl-9"
                />
                {form.data.search && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute top-0 right-0 size-10"
                        aria-label="Hapus kata pencarian"
                        onClick={() => form.setData('search', '')}
                    >
                        <X className="size-3.5" />
                    </Button>
                )}
            </div>
            <div className="flex flex-wrap gap-2">
                <select
                    aria-label="Filter status"
                    value={form.data.status}
                    onChange={(event) =>
                        form.setData('status', event.target.value)
                    }
                    className="border-input bg-background focus-visible:ring-ring h-10 min-w-32 flex-1 rounded-md border px-3 text-sm outline-none focus-visible:ring-2"
                >
                    <option value="">Semua status</option>
                    <option value="active">Aktif</option>
                    <option value="inactive">Nonaktif</option>
                </select>
                <select
                    aria-label="Data per halaman"
                    value={form.data.per_page}
                    onChange={(event) =>
                        form.setData('per_page', Number(event.target.value))
                    }
                    className="border-input bg-background focus-visible:ring-ring h-10 rounded-md border px-2 text-sm outline-none focus-visible:ring-2"
                >
                    {[15, 30, 50].map((size) => (
                        <option key={size} value={size}>
                            {size} / halaman
                        </option>
                    ))}
                </select>
                <Button
                    type="submit"
                    variant="outline"
                    disabled={form.processing}
                    className="h-10"
                >
                    {form.processing && <Spinner />}Terapkan
                </Button>
                {(filters.search || filters.status) && (
                    <Button
                        type="button"
                        variant="ghost"
                        className="h-10"
                        disabled={form.processing}
                        onClick={() =>
                            router.get(
                                index.url(resource),
                                { per_page: filters.per_page },
                                {
                                    only: ['records', 'filters'],
                                    preserveState: true,
                                    preserveScroll: true,
                                    replace: true,
                                },
                            )
                        }
                    >
                        Reset
                    </Button>
                )}
            </div>
        </form>
    );
}

function StatusConfirmation({
    resource,
    record,
    name,
    onClose,
}: {
    resource: string;
    record: RecordItem;
    name: string;
    onClose: () => void;
}) {
    const form = useForm<Record<string, string>>({});
    const action = record.is_active ? 'Nonaktifkan' : 'Aktifkan';
    return (
        <AlertDialog
            open
            onOpenChange={(open) => {
                if (!open && !form.processing) onClose();
            }}
        >
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{action} data?</AlertDialogTitle>
                    <AlertDialogDescription>
                        <span className="text-foreground font-medium">
                            {name}
                        </span>
                        {record.is_active
                            ? ' akan dinonaktifkan dan tidak tersedia untuk pilihan baru. Riwayat penggunaan tetap tersimpan.'
                            : ' akan diaktifkan dan tersedia kembali untuk pelayanan.'}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                {form.errors.status && (
                    <p role="alert" className="text-destructive text-sm">
                        {form.errors.status}
                    </p>
                )}
                <AlertDialogFooter>
                    <Button
                        variant="outline"
                        disabled={form.processing}
                        onClick={onClose}
                    >
                        Batal
                    </Button>
                    <Button
                        variant={record.is_active ? 'destructive' : 'default'}
                        disabled={form.processing}
                        onClick={() =>
                            form.submit(
                                toggle({ resource, record: record.uuid }),
                                {
                                    only: ['records', 'filters'],
                                    preserveScroll: true,
                                    onSuccess: onClose,
                                },
                            )
                        }
                    >
                        {form.processing ? <Spinner /> : <Power />}
                        {action}
                    </Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

function formatValue(
    value: string | number | null | undefined,
    format?: string,
    key?: string,
) {
    if (value === null || value === undefined || value === '')
        return <span className="text-muted-foreground">—</span>;
    if (format === 'currency') return currency.format(Number(value));
    return key === 'profession' || key === 'type'
        ? (valueLabels[String(value)] ?? String(value))
        : String(value);
}

MasterDataIndex.layout = {
    breadcrumbs: [
        { title: 'Ringkasan', href: dashboard() },
        { title: 'Master Data', href: overview() },
    ],
};
