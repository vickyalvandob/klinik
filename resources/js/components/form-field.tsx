import type { HTMLAttributes, ReactNode } from 'react';
import InputError from '@/components/input-error';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type FormFieldProps = HTMLAttributes<HTMLDivElement> & {
    id: string;
    label: string;
    children: ReactNode;
    description?: string;
    error?: string;
    labelAction?: ReactNode;
    required?: boolean;
};

export function FormField({
    id,
    label,
    children,
    description,
    error,
    labelAction,
    required = false,
    className,
    ...props
}: FormFieldProps) {
    return (
        <div className={cn('grid gap-2', className)} {...props}>
            <div className="flex items-center gap-2">
                <Label htmlFor={id}>
                    {label}
                    {required && (
                        <span className="text-destructive" aria-hidden="true">
                            {' '}
                            *
                        </span>
                    )}
                </Label>
                {labelAction && <div className="ml-auto">{labelAction}</div>}
            </div>
            {children}
            {description && !error && (
                <p className="text-muted-foreground text-xs">{description}</p>
            )}
            <InputError id={`${id}-error`} message={error} />
        </div>
    );
}
