import { OperationalShortcuts } from '@/components/operational-shortcuts';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { WorklistRefresh } from '@/components/worklist-refresh';
import { SidebarTrigger } from '@/components/ui/sidebar';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types';

export function AppTopbar({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    return (
        <header className="border-sidebar-border/70 bg-background sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between gap-2 border-b px-4 sm:px-6">
            <div className="flex min-w-0 items-center gap-2">
                <SidebarTrigger
                    className="-ml-1 size-10"
                    aria-label="Buka atau tutup menu"
                />
                <Breadcrumbs breadcrumbs={breadcrumbs} />
            </div>
            <div className="flex shrink-0 items-center gap-1">
                <WorklistRefresh />
                <OperationalShortcuts />
            </div>
        </header>
    );
}
