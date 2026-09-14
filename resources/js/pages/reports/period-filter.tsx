import { CalendarDays, Check, ChevronDown, LoaderCircle } from 'lucide-react';
import { useState } from 'react';
import { FormField } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { formatDate } from '@/lib/billing';
import type { Period } from './report-config';

export function PeriodFilter({
    filters,
    periods,
    loading,
    errors,
    onApply,
}: {
    filters: Period;
    periods: Array<Period & { label: string }>;
    loading: boolean;
    errors: Record<string, string>;
    onApply: (period: Period, onSuccess: () => void) => void;
}) {
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState(filters);
    const active = periods.find(
        (period) => period.from === filters.from && period.to === filters.to,
    );
    const range =
        filters.from === filters.to
            ? formatDate(filters.from)
            : `${formatDate(filters.from)} – ${formatDate(filters.to)}`;

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    className="h-auto min-h-10 w-full justify-between gap-3 px-3 py-2 sm:w-auto"
                    disabled={loading}
                >
                    <CalendarDays className="text-muted-foreground shrink-0" />
                    <span className="min-w-0 text-left">
                        <span className="text-muted-foreground block text-xs">
                            {active?.label ?? 'Periode khusus'}
                        </span>
                        <span className="block text-xs font-medium sm:text-sm">
                            {range}
                        </span>
                    </span>
                    <ChevronDown className="text-muted-foreground shrink-0" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                align="start"
                className="w-[min(24rem,calc(100vw-2rem))] p-0"
                aria-label="Pilih periode laporan"
            >
                <div className="grid grid-cols-2 gap-1 border-b p-2">
                    {periods.map((period) => (
                        <Button
                            key={period.label}
                            variant={
                                active?.label === period.label
                                    ? 'secondary'
                                    : 'ghost'
                            }
                            size="sm"
                            className="justify-between text-xs"
                            disabled={loading}
                            onClick={() => {
                                setDraft(period);
                                onApply(period, () => setOpen(false));
                            }}
                        >
                            {period.label}
                            {active?.label === period.label && (
                                <Check className="size-3.5" />
                            )}
                        </Button>
                    ))}
                </div>
                <form
                    className="grid gap-4 p-4"
                    onSubmit={(event) => {
                        event.preventDefault();
                        onApply(draft, () => setOpen(false));
                    }}
                >
                    <div>
                        <h2 className="text-sm font-semibold">
                            Periode khusus
                        </h2>
                        <p className="text-muted-foreground mt-1 text-xs">
                            Pilih rentang tanggal, maksimal 366 hari.
                        </p>
                    </div>
                    <div className="grid gap-3 min-[380px]:grid-cols-2">
                        <FormField
                            id="from"
                            label="Tanggal awal"
                            error={errors.from}
                        >
                            <Input
                                id="from"
                                type="date"
                                value={draft.from}
                                required
                                disabled={loading}
                                aria-invalid={Boolean(errors.from)}
                                aria-describedby={
                                    errors.from ? 'from-error' : undefined
                                }
                                onChange={(event) =>
                                    setDraft({
                                        ...draft,
                                        from: event.target.value,
                                    })
                                }
                            />
                        </FormField>
                        <FormField
                            id="to"
                            label="Tanggal akhir"
                            error={errors.to}
                        >
                            <Input
                                id="to"
                                type="date"
                                value={draft.to}
                                required
                                disabled={loading}
                                min={draft.from}
                                aria-invalid={Boolean(errors.to)}
                                aria-describedby={
                                    errors.to ? 'to-error' : undefined
                                }
                                onChange={(event) =>
                                    setDraft({
                                        ...draft,
                                        to: event.target.value,
                                    })
                                }
                            />
                        </FormField>
                    </div>
                    <Button type="submit" disabled={loading}>
                        {loading && <LoaderCircle className="animate-spin" />}
                        Terapkan periode
                    </Button>
                </form>
            </PopoverContent>
        </Popover>
    );
}
