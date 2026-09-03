import type { HTMLAttributes, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

type EmptyStateProps = HTMLAttributes<HTMLElement> & {
    icon: LucideIcon;
    title: string;
    description: string;
    action?: ReactNode;
};

export function EmptyState({
    icon: Icon,
    title,
    description,
    action,
    className,
    ...props
}: EmptyStateProps) {
    return (
        <section
            aria-label={title}
            className={cn(
                'bg-card flex min-h-72 flex-col items-center justify-center rounded-lg border border-dashed px-6 py-12 text-center',
                className,
            )}
            {...props}
        >
            <div className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-full">
                <Icon className="size-6" aria-hidden="true" />
            </div>
            <h2 className="mt-4 text-base font-semibold">{title}</h2>
            <p className="text-muted-foreground mt-1 max-w-sm text-sm text-pretty">
                {description}
            </p>
            {action && <div className="mt-5">{action}</div>}
        </section>
    );
}
