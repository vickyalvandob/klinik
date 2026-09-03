import { Form, Head, Link } from '@inertiajs/react';
import {
    ChevronRight,
    ContactRound,
    Plus,
    Search,
    ShieldAlert,
    SlidersHorizontal,
    X,
} from 'lucide-react';
import { EmptyState } from '@/components/empty-state';
import { PageHeader } from '@/components/page-header';
import {
    PaginationLinks,
    type PaginationLink,
} from '@/components/pagination-links';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { dashboard } from '@/routes';
import { create, index, show } from '@/routes/patients';
import type { PatientSummary } from '@/types';

type PatientPagination = {
    data: PatientSummary[];
    links: PaginationLink[];
    from: number | null;
    to: number | null;
    total: number;
};

export default function PatientsIndex({
    patients,
    filters,
    can,
}: {
    patients: PatientPagination;
    filters: { search: string; gender: string };
    can: { create: boolean };
}) {
    const hasFilters = filters.search !== '' || filters.gender !== '';

    return (
        <>
            <Head title="Pasien" />
            <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
                <PageHeader
                    eyebrow="Master pasien"
                    title="Pasien"
                    description="Temukan pasien berdasarkan nama, nomor RM, NIK, atau telepon sebelum membuat data baru."
                    actions={
                        can.create ? (
                            <Button asChild>
                                <Link href={create()}>
                                    <Plus /> Pasien baru
                                </Link>
                            </Button>
                        ) : undefined
                    }
                />

                <section className="bg-card rounded-xl border">
                    <div className="border-b p-4 md:p-5">
                        <Form
                            {...index.form()}
                            className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_12rem_auto]"
                        >
                            <div className="relative">
                                <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                                <Input
                                    name="search"
                                    defaultValue={filters.search}
                                    className="pl-9"
                                    placeholder="Cari nama, RM, NIK, atau telepon..."
                                    aria-label="Cari pasien"
                                />
                            </div>
                            <div className="relative">
                                <SlidersHorizontal className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                                <select
                                    name="gender"
                                    defaultValue={filters.gender}
                                    className="border-input bg-background focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border pr-3 pl-9 text-sm outline-none focus-visible:ring-[3px]"
                                    aria-label="Filter jenis kelamin"
                                >
                                    <option value="">Semua jenis kelamin</option>
                                    <option value="male">Laki-laki</option>
                                    <option value="female">Perempuan</option>
                                </select>
                            </div>
                            <div className="flex gap-2">
                                <Button type="submit" className="flex-1 lg:flex-none">
                                    Cari
                                </Button>
                                {hasFilters && (
                                    <Button asChild variant="ghost" size="icon">
                                        <Link href={index()} aria-label="Reset filter">
                                            <X />
                                        </Link>
                                    </Button>
                                )}
                            </div>
                        </Form>
                    </div>

                    {patients.data.length === 0 ? (
                        <EmptyState
                            icon={ContactRound}
                            title={
                                hasFilters
                                    ? 'Pasien tidak ditemukan'
                                    : 'Belum ada pasien'
                            }
                            description={
                                hasFilters
                                    ? 'Periksa kata kunci atau reset filter. Jika pasien belum terdaftar, buat data pasien baru.'
                                    : 'Buat data pasien pertama. Sistem akan memberikan nomor rekam medis secara otomatis.'
                            }
                            className="rounded-none border-0"
                            action={
                                can.create ? (
                                    <Button asChild variant="outline">
                                        <Link href={create()}>
                                            <Plus /> Pasien baru
                                        </Link>
                                    </Button>
                                ) : undefined
                            }
                        />
                    ) : (
                        <>
                            <div className="hidden md:block">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Pasien</TableHead>
                                            <TableHead>Nomor RM</TableHead>
                                            <TableHead>Lahir / JK</TableHead>
                                            <TableHead>Kontak</TableHead>
                                            <TableHead>Alergi aktif</TableHead>
                                            <TableHead className="w-12">
                                                <span className="sr-only">Aksi</span>
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {patients.data.map((patient) => (
                                            <TableRow key={patient.uuid}>
                                                <TableCell>
                                                    <Link
                                                        href={show(patient.uuid)}
                                                        className="hover:text-primary font-medium underline-offset-4 hover:underline"
                                                    >
                                                        {patient.name}
                                                    </Link>
                                                    {patient.masked_national_id_number && (
                                                        <p className="text-muted-foreground mt-1 text-xs">
                                                            NIK{' '}
                                                            {
                                                                patient.masked_national_id_number
                                                            }
                                                        </p>
                                                    )}
                                                </TableCell>
                                                <TableCell className="font-mono text-xs font-medium">
                                                    {patient.medical_record_number}
                                                </TableCell>
                                                <TableCell>
                                                    <p className="text-sm">
                                                        {formatDate(
                                                            patient.birth_date,
                                                        )}
                                                    </p>
                                                    <p className="text-muted-foreground mt-1 text-xs">
                                                        {genderLabel(patient.gender)}
                                                    </p>
                                                </TableCell>
                                                <TableCell>
                                                    {patient.phone ?? (
                                                        <span className="text-muted-foreground">
                                                            —
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {patient.active_allergies_count >
                                                    0 ? (
                                                        <Badge
                                                            variant="outline"
                                                            className="border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-300"
                                                        >
                                                            <ShieldAlert />
                                                            {
                                                                patient.active_allergies_count
                                                            }
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-muted-foreground text-xs">
                                                            Tidak tercatat
                                                        </span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        asChild
                                                        variant="ghost"
                                                        size="icon"
                                                    >
                                                        <Link
                                                            href={show(
                                                                patient.uuid,
                                                            )}
                                                            aria-label={`Buka ${patient.name}`}
                                                        >
                                                            <ChevronRight />
                                                        </Link>
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            <div className="divide-y md:hidden">
                                {patients.data.map((patient) => (
                                    <Link
                                        key={patient.uuid}
                                        href={show(patient.uuid)}
                                        className="hover:bg-muted/40 flex items-start justify-between gap-3 p-4 transition-colors"
                                    >
                                        <div className="min-w-0">
                                            <p className="truncate font-medium">
                                                {patient.name}
                                            </p>
                                            <p className="text-muted-foreground mt-1 font-mono text-xs">
                                                {patient.medical_record_number}
                                            </p>
                                            <p className="text-muted-foreground mt-2 text-xs">
                                                {formatDate(patient.birth_date)} ·{' '}
                                                {genderLabel(patient.gender)}
                                                {patient.phone
                                                    ? ` · ${patient.phone}`
                                                    : ''}
                                            </p>
                                            {patient.active_allergies_count > 0 && (
                                                <p className="mt-2 flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400">
                                                    <ShieldAlert className="size-3.5" />
                                                    {
                                                        patient.active_allergies_count
                                                    }{' '}
                                                    alergi aktif
                                                </p>
                                            )}
                                        </div>
                                        <ChevronRight className="text-muted-foreground mt-1 size-4 shrink-0" />
                                    </Link>
                                ))}
                            </div>

                            <div className="flex flex-col gap-3 border-t p-4 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-muted-foreground text-xs">
                                    Menampilkan {patients.from ?? 0}–
                                    {patients.to ?? 0} dari {patients.total}{' '}
                                    pasien
                                </p>
                                <PaginationLinks links={patients.links} />
                            </div>
                        </>
                    )}
                </section>
            </div>
        </>
    );
}

function formatDate(value: string) {
    return new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(new Date(`${value}T00:00:00`));
}

function genderLabel(gender: PatientSummary['gender']) {
    return gender === 'male' ? 'Laki-laki' : 'Perempuan';
}

PatientsIndex.layout = {
    breadcrumbs: [
        { title: 'Hari Ini', href: dashboard() },
        { title: 'Pasien', href: index() },
    ],
};
