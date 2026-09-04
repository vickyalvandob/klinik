import { Form, Head, Link } from '@inertiajs/react';
import { Database, Pencil, Plus, Power, Save, Search, X } from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { FormField } from '@/components/form-field';
import { PageHeader } from '@/components/page-header';
import {
    PaginationLinks,
    type PaginationLink,
} from '@/components/pagination-links';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { dashboard } from '@/routes';
import { index, overview, store, toggle, update } from '@/routes/master-data';

type Field = {
    key: string;
    label: string;
    type: string;
    required: boolean;
    placeholder?: string;
    options?: Record<string, string>;
    min?: number;
    step?: number;
};
type Column = { key: string; label: string; format?: string };
type RecordItem = {
    uuid: string;
    is_active: boolean;
    values: Record<string, string | number | null>;
    columns: Record<string, string | number | null>;
};
type Pagination = {
    data: RecordItem[];
    links: PaginationLink[];
    from: number | null;
    to: number | null;
    total: number;
};

export default function MasterDataIndex({
    resource,
    definition,
    records,
    editing,
    filters,
}: {
    resource: string;
    definition: {
        label: string;
        singular: string;
        description: string;
        fields: Field[];
        columns: Column[];
    };
    records: Pagination;
    editing: RecordItem | null;
    filters: { search: string; status: string };
}) {
    const formRoute = editing
        ? update.form({ resource, record: editing.uuid })
        : store.form(resource);

    return (
        <>
            <Head title={definition.label} />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    eyebrow="Master data"
                    title={definition.label}
                    description={definition.description}
                    actions={
                        !editing ? (
                            <Button asChild>
                                <Link
                                    href={index(resource, {
                                        query: { create: 1 },
                                    })}
                                >
                                    <Plus /> Tambah {definition.singular}
                                </Link>
                            </Button>
                        ) : undefined
                    }
                />

                <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_24rem]">
                    <Card className="min-w-0">
                        <CardContent className="grid gap-4 p-4">
                            <Form
                                {...index.form(resource)}
                                className="grid gap-2 sm:grid-cols-[1fr_10rem_auto]"
                            >
                                <div className="relative">
                                    <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                                    <Input
                                        name="search"
                                        defaultValue={filters.search}
                                        className="pl-9"
                                        placeholder={`Cari ${definition.label.toLowerCase()}...`}
                                    />
                                </div>
                                <select
                                    name="status"
                                    defaultValue={filters.status}
                                    className="border-input bg-background h-9 rounded-md border px-3 text-sm"
                                >
                                    <option value="">Semua status</option>
                                    <option value="active">Aktif</option>
                                    <option value="inactive">Nonaktif</option>
                                </select>
                                <Button type="submit" variant="outline">
                                    Terapkan
                                </Button>
                            </Form>

                            {records.data.length === 0 ? (
                                <EmptyState
                                    icon={Database}
                                    title={`Belum ada ${definition.label.toLowerCase()}`}
                                    description="Tambahkan data pertama agar dapat dipakai dalam alur operasional."
                                    className="border-0"
                                />
                            ) : (
                                <>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                {definition.columns.map(
                                                    (column) => (
                                                        <TableHead
                                                            key={column.key}
                                                        >
                                                            {column.label}
                                                        </TableHead>
                                                    ),
                                                )}
                                                <TableHead>Status</TableHead>
                                                <TableHead className="text-right">
                                                    Aksi
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
                                                            >
                                                                {formatValue(
                                                                    record
                                                                        .columns[
                                                                        column
                                                                            .key
                                                                    ],
                                                                    column.format,
                                                                )}
                                                            </TableCell>
                                                        ),
                                                    )}
                                                    <TableCell>
                                                        <Badge
                                                            variant={
                                                                record.is_active
                                                                    ? 'default'
                                                                    : 'secondary'
                                                            }
                                                        >
                                                            {record.is_active
                                                                ? 'Aktif'
                                                                : 'Nonaktif'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex justify-end gap-1">
                                                            <Button
                                                                asChild
                                                                size="sm"
                                                                variant="ghost"
                                                            >
                                                                <Link
                                                                    href={index(
                                                                        resource,
                                                                        {
                                                                            query: {
                                                                                edit: record.uuid,
                                                                                search:
                                                                                    filters.search ||
                                                                                    undefined,
                                                                                status:
                                                                                    filters.status ||
                                                                                    undefined,
                                                                            },
                                                                        },
                                                                    )}
                                                                >
                                                                    <Pencil />
                                                                    <span className="sr-only">
                                                                        Edit
                                                                    </span>
                                                                </Link>
                                                            </Button>
                                                            <Form
                                                                {...toggle.form(
                                                                    {
                                                                        resource,
                                                                        record: record.uuid,
                                                                    },
                                                                )}
                                                            >
                                                                <Button
                                                                    type="submit"
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    title={
                                                                        record.is_active
                                                                            ? 'Nonaktifkan'
                                                                            : 'Aktifkan'
                                                                    }
                                                                >
                                                                    <Power
                                                                        className={
                                                                            record.is_active
                                                                                ? 'text-destructive'
                                                                                : 'text-primary'
                                                                        }
                                                                    />
                                                                    <span className="sr-only">
                                                                        {record.is_active
                                                                            ? 'Nonaktifkan'
                                                                            : 'Aktifkan'}
                                                                    </span>
                                                                </Button>
                                                            </Form>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                    <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                                        <p className="text-muted-foreground text-xs">
                                            Menampilkan {records.from ?? 0}–
                                            {records.to ?? 0} dari{' '}
                                            {records.total}
                                        </p>
                                        <PaginationLinks
                                            links={records.links}
                                        />
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    <Card id="master-form">
                        <CardHeader>
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <CardTitle className="text-base">
                                        {editing
                                            ? `Edit ${definition.singular}`
                                            : `Tambah ${definition.singular}`}
                                    </CardTitle>
                                    <p className="text-muted-foreground mt-1 text-xs">
                                        Kolom bertanda * wajib diisi.
                                    </p>
                                </div>
                                {editing && (
                                    <Button asChild size="sm" variant="ghost">
                                        <Link href={index(resource)}>
                                            <X />
                                            <span className="sr-only">
                                                Batal edit
                                            </span>
                                        </Link>
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Form
                                key={editing?.uuid ?? 'create'}
                                {...formRoute}
                                className="grid gap-4"
                                disableWhileProcessing
                            >
                                {({ errors, processing }) => (
                                    <>
                                        {definition.fields.map((field) => (
                                            <DynamicField
                                                key={field.key}
                                                field={field}
                                                value={
                                                    editing?.values[field.key]
                                                }
                                                error={errors[field.key]}
                                            />
                                        ))}
                                        <Button
                                            type="submit"
                                            disabled={processing}
                                        >
                                            {processing ? (
                                                <Spinner />
                                            ) : (
                                                <Save />
                                            )}{' '}
                                            {editing
                                                ? 'Simpan Perubahan'
                                                : 'Tambah Data'}
                                        </Button>
                                    </>
                                )}
                            </Form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}

function DynamicField({
    field,
    value,
    error,
}: {
    field: Field;
    value?: string | number | null;
    error?: string;
}) {
    const defaultValue =
        value === null || value === undefined ? '' : String(value);
    return (
        <FormField
            id={field.key}
            label={field.label}
            error={error}
            required={field.required}
        >
            {field.type === 'textarea' ? (
                <textarea
                    id={field.key}
                    name={field.key}
                    defaultValue={defaultValue}
                    rows={3}
                    className="border-input bg-background rounded-md border px-3 py-2 text-sm"
                />
            ) : field.type === 'select' ? (
                <select
                    id={field.key}
                    name={field.key}
                    defaultValue={defaultValue}
                    className="border-input bg-background h-9 rounded-md border px-3 text-sm"
                >
                    <option value="" disabled={field.required}>
                        Pilih {field.label.toLowerCase()}
                    </option>
                    {Object.entries(field.options ?? {}).map(
                        ([optionValue, label]) => (
                            <option key={optionValue} value={optionValue}>
                                {label}
                            </option>
                        ),
                    )}
                </select>
            ) : (
                <Input
                    id={field.key}
                    name={field.key}
                    type={field.type}
                    defaultValue={defaultValue}
                    placeholder={field.placeholder}
                    min={field.min}
                    step={field.step}
                />
            )}
        </FormField>
    );
}

function formatValue(
    value: string | number | null | undefined,
    format?: string,
) {
    if (value === null || value === undefined || value === '')
        return <span className="text-muted-foreground">—</span>;
    if (format === 'currency')
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            maximumFractionDigits: 0,
        }).format(Number(value));
    const labels: Record<string, string> = {
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
    return labels[String(value)] ?? String(value);
}

MasterDataIndex.layout = {
    breadcrumbs: [
        { title: 'Dashboard', href: dashboard() },
        { title: 'Master Data', href: overview() },
    ],
};
