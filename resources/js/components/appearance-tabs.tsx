import type { LucideIcon } from 'lucide-react';
import { Monitor, Moon, Sun } from 'lucide-react';
import type { HTMLAttributes } from 'react';
import type { Appearance } from '@/hooks/use-appearance';
import { useAppearance } from '@/hooks/use-appearance';
import { cn } from '@/lib/utils';

export default function AppearanceToggleTab({
    className = '',
    ...props
}: HTMLAttributes<HTMLDivElement>) {
    const { appearance, updateAppearance } = useAppearance();

    const tabs: { value: Appearance; icon: LucideIcon; label: string }[] = [
        { value: 'light', icon: Sun, label: 'Terang' },
        { value: 'dark', icon: Moon, label: 'Gelap' },
        { value: 'system', icon: Monitor, label: 'Sistem' },
    ];

    return (
        <div
            className={cn(
                'bg-muted/40 grid grid-cols-3 gap-1 rounded-lg border p-1',
                className,
            )}
            role="group"
            aria-label="Tema aplikasi"
            {...props}
        >
            {tabs.map(({ value, icon: Icon, label }) => (
                <button
                    key={value}
                    type="button"
                    aria-pressed={appearance === value}
                    onClick={() => updateAppearance(value)}
                    className={cn(
                        'focus-visible:ring-ring flex min-h-11 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-2 transition-colors outline-none focus-visible:ring-2 sm:px-4',
                        appearance === value
                            ? 'border-border bg-background text-foreground'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                >
                    <Icon className="size-4 shrink-0" />
                    <span className="text-sm">{label}</span>
                </button>
            ))}
        </div>
    );
}
