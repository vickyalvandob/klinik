import { format, isSameDay, isSameMonth, isSameYear, parseISO } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { CalendarDays } from 'lucide-react';
import { useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { useIsMobile } from '@/hooks/use-mobile';

export function DateRangePicker({
    id,
    from,
    to,
    today,
    onChange,
    disabled,
    ...props
}: {
    id: string;
    from: string;
    to: string;
    today: string;
    onChange: (range: { from: string; to: string }) => void;
    disabled?: boolean;
    'aria-invalid'?: boolean;
    'aria-describedby'?: string;
}) {
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState<DateRange>();
    const [choosingEnd, setChoosingEnd] = useState(false);
    const isMobile = useIsMobile();
    const label = formatRange(from, to);

    const commit = (start: Date, end: Date) => {
        onChange({
            from: format(start, 'yyyy-MM-dd'),
            to: format(end, 'yyyy-MM-dd'),
        });
        setOpen(false);
    };

    return (
        <Popover
            open={open}
            onOpenChange={(nextOpen) => {
                if (nextOpen) {
                    setDraft({
                        from: from ? parseISO(from) : undefined,
                        to: to ? parseISO(to) : undefined,
                    });
                    setChoosingEnd(false);
                }
                setOpen(nextOpen);
            }}
        >
            <PopoverTrigger asChild>
                <Button
                    id={id}
                    type="button"
                    variant="outline"
                    disabled={disabled}
                    className="w-full min-w-0 justify-start px-3 text-left font-normal"
                    title={label}
                    {...props}
                >
                    <CalendarDays className="text-muted-foreground shrink-0" />
                    <span className="sr-only">Rentang tanggal: </span>
                    <span className="truncate">{label}</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent
                align="end"
                collisionPadding={12}
                className="w-auto p-0"
                aria-label="Pilih rentang tanggal"
            >
                <Calendar
                    mode="range"
                    selected={draft}
                    onSelect={(_, day) => {
                        if (!choosingEnd || !draft?.from) {
                            setDraft({ from: day });
                            setChoosingEnd(true);
                            return;
                        }
                        const start = day < draft.from ? day : draft.from;
                        const end = day < draft.from ? draft.from : day;
                        commit(start, end);
                    }}
                    defaultMonth={from ? parseISO(from) : parseISO(today)}
                    numberOfMonths={isMobile ? 1 : 2}
                    today={parseISO(today)}
                    locale={localeId}
                    autoFocus
                    labels={{
                        labelNext: () => 'Bulan berikutnya',
                        labelPrevious: () => 'Bulan sebelumnya',
                    }}
                />
                <div className="flex items-center justify-between gap-3 border-t p-2">
                    <p
                        className="text-muted-foreground pl-1 text-xs"
                        role="status"
                    >
                        {choosingEnd
                            ? 'Pilih tanggal akhir'
                            : 'Pilih tanggal awal'}
                    </p>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => commit(parseISO(today), parseISO(today))}
                    >
                        Hari ini
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}

function formatRange(from: string, to: string): string {
    if (!from) return 'Pilih rentang tanggal';
    const start = parseISO(from);
    const end = to ? parseISO(to) : start;
    const date = (value: Date, pattern: string) =>
        format(value, pattern, { locale: localeId });
    if (isSameDay(start, end)) return date(start, 'dd MMM yyyy');
    if (isSameMonth(start, end))
        return `${date(start, 'dd')}–${date(end, 'dd MMM yyyy')}`;
    if (isSameYear(start, end))
        return `${date(start, 'dd MMM')} – ${date(end, 'dd MMM yyyy')}`;
    return `${date(start, 'dd MMM yyyy')} – ${date(end, 'dd MMM yyyy')}`;
}
