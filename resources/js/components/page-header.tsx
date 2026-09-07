import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

type PageHeaderProps = HTMLAttributes<HTMLElement> & {
    title: string;
    description?: string;
    eyebrow?: string;
    actions?: ReactNode;
};

export function PageHeader({
    title,
    description,
    eyebrow,
    actions,
    className,
    ...props
}: PageHeaderProps) {
    return (
        <header
            className={cn(
                'flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between',
                className,
            )}
            {...props}
        >
            <div className="min-w-0">
                {eyebrow && (
                    <p className="text-muted-foreground mb-1.5 text-xs">
                        {eyebrow}
                    </p>
                )}
                <h1 className="text-xl font-semibold tracking-tight text-balance sm:text-[1.625rem]">
                    {title}
                </h1>
                {description && (
                    <p className="text-muted-foreground mt-1 max-w-2xl text-sm leading-relaxed text-pretty">
                        {description}
                    </p>
                )}
            </div>

            {actions && (
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {actions}
                </div>
            )}
        </header>
    );
}
