import { OperationalFeedback } from '@/components/operational-feedback';
import { AppContent } from '@/components/app-content';
import { AppShell } from '@/components/app-shell';
import { AppSidebar } from '@/components/app-sidebar';
import { AppTopbar } from '@/components/app-sidebar-header';
import type { AppLayoutProps } from '@/types';

export default function AppSidebarLayout({
    children,
    breadcrumbs = [],
}: AppLayoutProps) {
    return (
        <AppShell variant="sidebar">
            <AppSidebar />
            <AppContent
                variant="sidebar"
                className="bg-muted/25 min-w-0 overflow-x-clip"
            >
                <AppTopbar breadcrumbs={breadcrumbs} />
                <OperationalFeedback />
                {children}
            </AppContent>
        </AppShell>
    );
}
