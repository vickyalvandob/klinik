import { useEffect, useId, useRef, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { show as clinicalCatalog } from '@/routes/clinical-catalog';

export function ClinicalCatalogPicker<T extends { uuid: string }>({
    resource,
    placeholder,
    render,
    onSelect,
    exclude,
}: {
    resource: 'diagnoses' | 'services' | 'medicines';
    placeholder: string;
    render: (item: T) => string;
    onSelect: (item: T) => void;
    exclude: string[];
}) {
    const id = useId();
    const inputRef = useRef<HTMLInputElement>(null);
    const [query, setQuery] = useState('');
    const [items, setItems] = useState<T[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(0);
    const [completedQuery, setCompletedQuery] = useState('');
    const [retry, setRetry] = useState(0);
    const search = query.trim();
    const visibleItems = completedQuery === search
        ? items.filter((item) => !exclude.includes(item.uuid))
        : [];
    const activeIndex = Math.min(active, Math.max(0, visibleItems.length - 1));
    const select = (item: T) => {
        onSelect(item);
        setQuery('');
        setItems([]);
        setOpen(false);
        inputRef.current?.focus();
    };
    useEffect(() => {
        setItems([]);
        setError(null);
        setActive(0);
        if (!open || search.length < 2) {
            setLoading(false);
            return;
        }
        const controller = new AbortController();
        setLoading(true);
        const timer = window.setTimeout(async () => {
            try {
                const response = await fetch(
                    clinicalCatalog.url(resource, {
                        query: { search },
                    }),
                    {
                        headers: { Accept: 'application/json' },
                        signal: controller.signal,
                    },
                );
                if (!response.ok)
                    throw new Error(
                        'Pencarian belum berhasil. Periksa koneksi lalu coba lagi.',
                    );
                const data = (await response.json()) as { items: T[] };
                if (!controller.signal.aborted) {
                    setItems(data.items);
                    setCompletedQuery(search);
                }
            } catch (reason) {
                if (!controller.signal.aborted)
                    setError(
                        reason instanceof Error
                            ? reason.message
                            : 'Pencarian gagal.',
                    );
            } finally {
                if (!controller.signal.aborted) setLoading(false);
            }
        }, 300);
        return () => {
            window.clearTimeout(timer);
            controller.abort();
        };
    }, [search, resource, retry, open]);
    useEffect(() => {
        if (open)
            document
                .getElementById(`${id}-${activeIndex}`)
                ?.scrollIntoView({ block: 'nearest' });
    }, [activeIndex, id, open]);
    return (
        <div
            className="relative grid gap-2"
            onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget))
                    setOpen(false);
            }}
        >
            <div className="relative">
                <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input
                    ref={inputRef}
                    maxLength={100}
                    autoComplete="off"
                    role="combobox"
                    aria-label={placeholder}
                    aria-expanded={open && query.trim().length >= 2}
                    aria-controls={`${id}-results`}
                    aria-describedby={`${id}-hint`}
                    aria-autocomplete="list"
                    aria-activedescendant={
                        open && visibleItems.length
                            ? `${id}-${activeIndex}`
                            : undefined
                    }
                    value={query}
                    onFocus={() => setOpen(true)}
                    onChange={(event) => {
                        setQuery(event.target.value);
                        setOpen(true);
                    }}
                    placeholder={placeholder}
                    className="pr-9 pl-9"
                    onKeyDown={(event) => {
                        if (event.key === 'Escape') {
                            event.preventDefault();
                            setOpen(false);
                        } else if (
                            event.key === 'ArrowDown' ||
                            event.key === 'ArrowUp'
                        ) {
                            event.preventDefault();
                            setOpen(true);
                            setActive(
                                Math.max(
                                    0,
                                    Math.min(
                                        visibleItems.length - 1,
                                        activeIndex +
                                            (event.key === 'ArrowDown'
                                                ? 1
                                                : -1),
                                    ),
                                ),
                            );
                        } else if (event.key === 'Enter' && open) {
                            event.preventDefault();
                            if (visibleItems[activeIndex])
                                select(visibleItems[activeIndex]);
                        }
                    }}
                />
                {loading && (
                    <Spinner className="absolute top-1/2 right-3 -translate-y-1/2" />
                )}
            </div>
            {open && query.trim().length >= 2 && (
                <div className="bg-popover absolute top-full z-20 mt-1 w-full rounded-lg border p-1">
                    <div
                        id={`${id}-results`}
                        role="listbox"
                        aria-label="Hasil pencarian"
                        className="max-h-56 overflow-y-auto"
                    >
                        {visibleItems.map((item, index) => (
                            <button
                                key={item.uuid}
                                id={`${id}-${index}`}
                                role="option"
                                tabIndex={-1}
                                aria-selected={activeIndex === index}
                                type="button"
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => select(item)}
                                className={cn(
                                    'hover:bg-muted focus-visible:ring-ring flex w-full items-start gap-2 rounded-md px-3 py-2.5 text-left text-sm focus-visible:ring-2 focus-visible:outline-none',
                                    activeIndex === index && 'bg-muted',
                                )}
                            >
                                <Plus className="text-primary mt-0.5 size-4 shrink-0" />
                                <span className="min-w-0 break-words">
                                    {render(item)}
                                </span>
                            </button>
                        ))}
                    </div>
                    {(loading || error || visibleItems.length === 0) && (
                        <p
                            className={cn(
                                'text-muted-foreground p-3 text-xs',
                                error && 'text-destructive',
                            )}
                            role={error ? 'alert' : 'status'}
                        >
                            {loading
                                ? 'Mencari...'
                                : error ||
                                  'Tidak ada hasil baru. Coba kata kunci lain.'}
                        </p>
                    )}
                    {error && <Button type="button" variant="outline" size="sm" className="mb-2 ml-3" onClick={() => setRetry((value) => value + 1)}>Coba lagi</Button>}
                </div>
            )}
                <p id={`${id}-hint`} className="text-muted-foreground min-h-4 text-xs">
                    {search.length < 2 ? 'Ketik minimal 2 karakter untuk mencari.' : 'Pilih hasil untuk menambahkan. Gunakan ↑ ↓ dan Enter dengan keyboard.'}
                </p>
        </div>
    );
}
