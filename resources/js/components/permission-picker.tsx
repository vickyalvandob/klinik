import { ChevronDown, Search, ShieldCheck } from 'lucide-react';
import { useId, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export type Permission = { key: string; name: string; group: string };
export type PermissionGroups = Record<string, Permission[]>;

export function PermissionPicker({
    groups,
    value,
    onChange,
    inherited = [],
    disabled = false,
    compact = false,
}: {
    groups: PermissionGroups;
    value: string[];
    onChange: (value: string[]) => void;
    inherited?: string[];
    disabled?: boolean;
    compact?: boolean;
}) {
    const id = useId();
    const [search, setSearch] = useState('');
    const [selectedOnly, setSelectedOnly] = useState(false);
    const selected = new Set([...inherited, ...value]);
    const inheritedKeys = new Set(inherited);
    const query = search.trim().toLocaleLowerCase('id');
    const visibleGroups = Object.entries(groups)
        .map(
            ([group, permissions]) =>
                [
                    group,
                    permissions.filter(
                        (permission) =>
                            (!selectedOnly || selected.has(permission.key)) &&
                            `${group} ${permission.name}`
                                .toLocaleLowerCase('id')
                                .includes(query),
                    ),
                ] as const,
        )
        .filter(([, permissions]) => permissions.length > 0);

    function toggle(keys: string[], checked: boolean) {
        const next = new Set(value);
        keys.forEach((key) => {
            if (checked) next.add(key);
            else next.delete(key);
        });
        onChange([...next].sort());
    }

    return (
        <div className="grid min-w-0 gap-3">
            <div className="flex flex-wrap items-center gap-2">
                <div className="relative min-w-40 flex-1">
                    <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                    <Input
                        type="search"
                        aria-label="Cari hak akses"
                        placeholder="Cari hak akses atau modul…"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        className="pl-9"
                    />
                </div>
                <Button
                    type="button"
                    variant={selectedOnly ? 'secondary' : 'outline'}
                    size="sm"
                    aria-pressed={selectedOnly}
                    onClick={() => setSelectedOnly(!selectedOnly)}
                >
                    Terpilih ({selected.size})
                </Button>
            </div>
            <div
                className={cn(
                    'grid items-start gap-3',
                    !compact && 'xl:grid-cols-2',
                )}
            >
                {visibleGroups.map(([group, permissions]) => {
                    const available = permissions
                        .filter(
                            (permission) => !inheritedKeys.has(permission.key),
                        )
                        .map((permission) => permission.key);
                    const count = permissions.filter((permission) =>
                        selected.has(permission.key),
                    ).length;
                    return (
                        <details
                            key={`${group}-${Boolean(query)}-${selectedOnly}`}
                            open={Boolean(query) || selectedOnly || undefined}
                            className="group rounded-lg border"
                        >
                            <summary className="hover:bg-muted/40 focus-visible:ring-ring flex cursor-pointer list-none items-center gap-2 rounded-lg px-3 py-3 text-sm outline-none focus-visible:ring-2 [&::-webkit-details-marker]:hidden">
                                <span className="min-w-0 flex-1 font-medium">
                                    {group}
                                </span>
                                <span className="text-muted-foreground text-xs tabular-nums">
                                    {count}/{permissions.length}
                                </span>
                                <ChevronDown className="text-muted-foreground size-4 transition-transform group-open:rotate-180" />
                            </summary>
                            <div className="grid gap-1 border-t p-2">
                                {!disabled && available.length > 1 && (
                                    <label className="text-muted-foreground flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 text-xs">
                                        <Checkbox
                                            aria-label={`Pilih ${query ? 'hasil' : 'semua'} ${group}`}
                                            checked={
                                                available.every((key) =>
                                                    selected.has(key),
                                                )
                                                    ? true
                                                    : available.some((key) =>
                                                            selected.has(key),
                                                        )
                                                      ? 'indeterminate'
                                                      : false
                                            }
                                            onCheckedChange={(checked) =>
                                                toggle(
                                                    available,
                                                    checked === true,
                                                )
                                            }
                                        />
                                        Pilih{' '}
                                        {query
                                            ? 'hasil pencarian'
                                            : 'semua dalam modul'}
                                    </label>
                                )}
                                {permissions.map((permission) => (
                                    <label
                                        key={permission.key}
                                        htmlFor={`${id}-${permission.key}`}
                                        className={cn(
                                            'flex min-h-10 items-start gap-3 rounded-md px-2 py-2 text-sm',
                                            disabled ||
                                                inheritedKeys.has(
                                                    permission.key,
                                                )
                                                ? 'text-muted-foreground'
                                                : 'hover:bg-muted/50 cursor-pointer',
                                        )}
                                    >
                                        <Checkbox
                                            id={`${id}-${permission.key}`}
                                            checked={selected.has(
                                                permission.key,
                                            )}
                                            disabled={
                                                disabled ||
                                                inheritedKeys.has(
                                                    permission.key,
                                                )
                                            }
                                            onCheckedChange={(checked) =>
                                                toggle(
                                                    [permission.key],
                                                    checked === true,
                                                )
                                            }
                                            className="mt-0.5"
                                        />
                                        <span className="min-w-0 flex-1">
                                            {permission.name}
                                        </span>
                                        {inheritedKeys.has(permission.key) && (
                                            <span className="flex shrink-0 items-center gap-1 text-[10px]">
                                                <ShieldCheck className="size-3" />{' '}
                                                Dari peran
                                            </span>
                                        )}
                                    </label>
                                ))}
                            </div>
                        </details>
                    );
                })}
            </div>
            {visibleGroups.length === 0 && (
                <p
                    className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm"
                    role="status"
                >
                    Tidak ada hak akses yang cocok.
                </p>
            )}
        </div>
    );
}
