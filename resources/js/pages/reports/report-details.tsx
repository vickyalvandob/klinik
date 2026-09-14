import {
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    BarChart3,
    ChevronLeft,
    ChevronRight,
    Search,
    X,
} from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatCurrency, formatDate } from '@/lib/billing';
import { cn } from '@/lib/utils';
import { reports, rowUnits } from './report-config';
import type { Period, ReportSection, Row } from './report-config';

type SortKey = 'label' | 'count' | 'amount' | 'balance';
type Sort = { key: SortKey; direction: 'asc' | 'desc' };
const pageSize = 25;
const number = new Intl.NumberFormat('id-ID');

export function ReportDetails({
    rows,
    section,
    filters,
    loading,
}: {
    rows: Row[];
    section: ReportSection;
    filters: Period;
    loading: boolean;
}) {
    const [search, setSearch] = useState('');
    const [sort, setSort] = useState<Sort | null>(null);
    const [page, setPage] = useState(1);
    const selected = reports[section];
    const filtered = rows.filter((row) =>
        (section === 'visits'
            ? `${row.label} ${formatDate(row.label)}`
            : row.label
        )
            .toLocaleLowerCase('id-ID')
            .includes(search.trim().toLocaleLowerCase('id-ID')),
    );
    if (sort) {
        filtered.sort((a, b) => {
            const comparison =
                sort.key === 'label'
                    ? a.label.localeCompare(b.label, 'id-ID', { numeric: true })
                    : (a[sort.key] ?? 0) - (b[sort.key] ?? 0);
            return (
                (sort.direction === 'asc' ? comparison : -comparison) ||
                a.label.localeCompare(b.label, 'id-ID')
            );
        });
    }
    const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
    const currentPage = Math.min(page, pages);
    const visible = filtered.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize,
    );
    const totals = (items: Row[]) =>
        items.reduce(
            (total, row) => ({
                count: total.count + row.count,
                amount: total.amount + (row.amount ?? 0),
                balance: total.balance + (row.balance ?? 0),
            }),
            { count: 0, amount: 0, balance: 0 },
        );

    function changeSort(key: SortKey) {
        setSort({
            key,
            direction:
                sort?.key === key && sort.direction === 'asc' ? 'desc' : 'asc',
        });
        setPage(1);
    }

    function table(items: Row[], allItems: Row[], print = false) {
        const total = totals(allItems);
        const columns: Array<{ key: SortKey; label: string }> = [
            { key: 'label', label: selected.label },
            { key: 'count', label: selected.count },
            ...(selected.amount
                ? [{ key: 'amount' as const, label: selected.amount }]
                : []),
            ...(section === 'billing'
                ? [{ key: 'balance' as const, label: 'Sisa saat ini' }]
                : []),
        ];
        return (
            <table className="w-full text-sm">
                <caption className="sr-only">
                    {selected.title}, {formatDate(filters.from)} sampai{' '}
                    {formatDate(filters.to)}
                </caption>
                <thead className="bg-muted/40 text-muted-foreground">
                    <tr>
                        {columns.map((column) => (
                            <th
                                key={column.key}
                                scope="col"
                                className={cn(
                                    'px-4 py-3 text-xs font-medium',
                                    column.key === 'label'
                                        ? 'text-left'
                                        : 'text-right whitespace-nowrap',
                                )}
                                aria-sort={
                                    !print && sort?.key === column.key
                                        ? sort.direction === 'asc'
                                            ? 'ascending'
                                            : 'descending'
                                        : undefined
                                }
                            >
                                {print ? (
                                    column.label
                                ) : (
                                    <button
                                        type="button"
                                        className={cn(
                                            'focus-visible:ring-ring inline-flex min-h-7 items-center gap-1.5 rounded-sm text-left focus-visible:ring-2 focus-visible:outline-none',
                                            column.key !== 'label' &&
                                                'justify-end',
                                        )}
                                        disabled={loading}
                                        onClick={() => changeSort(column.key)}
                                    >
                                        {column.label}
                                        {sort?.key === column.key ? (
                                            sort.direction === 'asc' ? (
                                                <ArrowUp className="size-3" />
                                            ) : (
                                                <ArrowDown className="size-3" />
                                            )
                                        ) : (
                                            <ArrowUpDown className="size-3 opacity-50" />
                                        )}
                                    </button>
                                )}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {items.map((row, position) => (
                        <tr
                            key={`${row.label}-${position}`}
                            className="hover:bg-muted/20 print:break-inside-avoid"
                        >
                            <th
                                scope="row"
                                className="min-w-36 px-4 py-3.5 text-left font-medium break-words print:min-w-0"
                            >
                                {section === 'visits'
                                    ? formatDate(row.label)
                                    : row.label}
                            </th>
                            <td className="px-4 py-3.5 text-right tabular-nums">
                                {number.format(row.count)}
                            </td>
                            {selected.amount && (
                                <td className="px-4 py-3.5 text-right whitespace-nowrap tabular-nums">
                                    {formatCurrency(row.amount ?? 0)}
                                </td>
                            )}
                            {section === 'billing' && (
                                <td className="px-4 py-3.5 text-right font-medium whitespace-nowrap tabular-nums">
                                    {formatCurrency(row.balance ?? 0)}
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
                <tfoot className="bg-muted/30 border-t font-semibold">
                    <tr>
                        <th scope="row" className="px-4 py-3 text-left text-xs">
                            {section === 'billing'
                                ? 'Total termasuk dibatalkan'
                                : 'Total pada tabel'}
                            {!print && search.trim() && (
                                <span className="text-muted-foreground mt-1 block font-normal">
                                    Sesuai pencarian
                                </span>
                            )}
                        </th>
                        <td className="px-4 py-3 text-right tabular-nums">
                            {number.format(total.count)}
                        </td>
                        {selected.amount && (
                            <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">
                                {formatCurrency(total.amount)}
                            </td>
                        )}
                        {section === 'billing' && (
                            <td className="px-4 py-3 text-right whitespace-nowrap tabular-nums">
                                {formatCurrency(total.balance)}
                            </td>
                        )}
                    </tr>
                </tfoot>
            </table>
        );
    }

    return (
        <>
            {rows.length > 0 && (
                <div className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
                    <div className="relative w-full sm:max-w-xs">
                        <Search className="text-muted-foreground pointer-events-none absolute top-2.5 left-3 size-4" />
                        <Input
                            aria-label="Cari dalam laporan"
                            placeholder={`Cari ${selected.label.toLocaleLowerCase('id-ID')}…`}
                            value={search}
                            disabled={loading}
                            className="pr-9 pl-9"
                            onChange={(event) => {
                                setSearch(event.target.value);
                                setPage(1);
                            }}
                        />
                        {search && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute top-0.5 right-0.5 size-8"
                                aria-label="Hapus pencarian"
                                onClick={() => {
                                    setSearch('');
                                    setPage(1);
                                }}
                            >
                                <X className="size-3.5" />
                            </Button>
                        )}
                    </div>
                    <p className="text-muted-foreground text-xs" role="status">
                        {filtered.length === rows.length
                            ? `${number.format(rows.length)} ${rowUnits[section]}`
                            : `${number.format(filtered.length)} dari ${number.format(rows.length)} ${rowUnits[section]}`}
                    </p>
                </div>
            )}
            <div className={cn('print:hidden', loading && 'opacity-50')}>
                {filtered.length === 0 ? (
                    <div className="grid justify-items-center gap-2 px-5 py-14 text-center">
                        <div className="bg-muted/30 mb-2 rounded-xl border p-3">
                            <BarChart3 className="text-muted-foreground size-5" />
                        </div>
                        <h3 className="text-sm font-semibold">
                            {rows.length
                                ? 'Tidak ada hasil yang cocok'
                                : 'Belum ada data pada periode ini'}
                        </h3>
                        <p className="text-muted-foreground max-w-sm text-sm">
                            {rows.length
                                ? 'Coba kata kunci lain atau hapus pencarian.'
                                : 'Ubah periode laporan untuk melihat ringkasan aktivitas klinik.'}
                        </p>
                        {search && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSearch('')}
                            >
                                Hapus pencarian
                            </Button>
                        )}
                    </div>
                ) : (
                    <div
                        className="overflow-x-auto"
                        role="region"
                        aria-label="Tabel laporan"
                        tabIndex={0}
                    >
                        {selected.amount && (
                            <p className="text-muted-foreground border-b px-4 py-2 text-xs sm:hidden">
                                Geser tabel untuk melihat seluruh kolom.
                            </p>
                        )}
                        {table(visible, filtered)}
                    </div>
                )}
                {pages > 1 && (
                    <div className="flex flex-wrap items-center justify-between gap-2 border-t px-4 py-3">
                        <p className="text-muted-foreground text-xs">
                            Halaman {currentPage} dari {pages} · {pageSize}{' '}
                            baris per halaman
                        </p>
                        <div className="flex gap-1">
                            <Button
                                variant="outline"
                                size="icon"
                                className="size-8"
                                aria-label="Halaman sebelumnya"
                                disabled={currentPage === 1 || loading}
                                onClick={() => setPage(currentPage - 1)}
                            >
                                <ChevronLeft />
                            </Button>
                            <Button
                                variant="outline"
                                size="icon"
                                className="size-8"
                                aria-label="Halaman berikutnya"
                                disabled={currentPage === pages || loading}
                                onClick={() => setPage(currentPage + 1)}
                            >
                                <ChevronRight />
                            </Button>
                        </div>
                    </div>
                )}
            </div>
            <div className="hidden print:block">
                {rows.length ? (
                    table(rows, rows, true)
                ) : (
                    <p className="p-4 text-sm">
                        Belum ada data pada periode ini.
                    </p>
                )}
            </div>
            <div className="bg-muted/20 grid gap-1.5 border-t px-4 py-3">
                <p className="text-muted-foreground text-xs leading-relaxed">
                    {selected.note}
                </p>
                {(search.trim() || pages > 1) && (
                    <p className="text-muted-foreground text-xs print:hidden">
                        CSV dan cetak mencakup seluruh rincian laporan, tanpa
                        mengikuti pencarian atau halaman tabel.
                    </p>
                )}
            </div>
        </>
    );
}
