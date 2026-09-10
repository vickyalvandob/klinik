import { Link } from '@inertiajs/react';
import {
    Boxes,
    BriefcaseMedical,
    Building2,
    Pill,
    Stethoscope,
    Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { index } from '@/routes/master-data';
import type { Resource } from './types';

export const resourceIcons = {
    staff: Users,
    practitioners: Stethoscope,
    'service-units': Building2,
    services: BriefcaseMedical,
    medicines: Pill,
};

export function ResourceNavigation({
    resources,
    current,
}: {
    resources: Resource[];
    current: string;
}) {
    return (
        <nav
            aria-label="Kategori master data"
            className="flex gap-1 overflow-x-auto border-b pb-2"
        >
            {resources.map((resource) => {
                const Icon =
                    resourceIcons[resource.key as keyof typeof resourceIcons] ??
                    Boxes;
                return (
                    <Link
                        key={resource.key}
                        href={index(resource.key)}
                        aria-current={
                            current === resource.key ? 'page' : undefined
                        }
                        className={cn(
                            'focus-visible:ring-ring inline-flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-2',
                            current === resource.key
                                ? 'bg-primary/10 text-primary'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                        )}
                    >
                        <Icon className="size-4" />
                        {resource.label}
                    </Link>
                );
            })}
        </nav>
    );
}
