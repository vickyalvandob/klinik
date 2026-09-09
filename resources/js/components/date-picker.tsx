import { format, parseISO } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import { CalendarDays } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';

export function DatePicker({
    id,
    value,
    onChange,
    today,
    min,
    disabled,
    ...props
}: {
    id: string;
    value: string;
    onChange: (value: string) => void;
    today: string;
    min?: string;
    disabled?: boolean;
    'aria-invalid'?: boolean;
    'aria-describedby'?: string;
}) {
    const [open, setOpen] = useState(false);
    const selected = value ? parseISO(value) : undefined;
    const selectDate = (date: Date) => {
        onChange(format(date, 'yyyy-MM-dd'));
        setOpen(false);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    id={id}
                    type="button"
                    variant="outline"
                    disabled={disabled}
                    className="w-full justify-start px-3 text-left font-normal"
                    {...props}
                >
                    <CalendarDays className="text-muted-foreground" />
                    {selected
                        ? format(selected, 'dd MMM yyyy', { locale: localeId })
                        : 'Pilih tanggal'}
                </Button>
            </PopoverTrigger>
            <PopoverContent
                align="start"
                collisionPadding={12}
                className="w-auto p-0"
                aria-label="Pilih tanggal"
            >
                <Calendar
                    mode="single"
                    required
                    selected={selected}
                    onSelect={selectDate}
                    defaultMonth={selected ?? parseISO(today)}
                    today={parseISO(today)}
                    locale={localeId}
                    disabled={min ? { before: parseISO(min) } : undefined}
                    autoFocus
                    labels={{
                        labelNext: () => 'Bulan berikutnya',
                        labelPrevious: () => 'Bulan sebelumnya',
                    }}
                />
                <div className="border-t p-2">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        disabled={Boolean(min && today < min)}
                        onClick={() => selectDate(parseISO(today))}
                    >
                        Hari ini
                    </Button>
                </div>
            </PopoverContent>
        </Popover>
    );
}
