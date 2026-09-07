import { Link, usePage } from '@inertiajs/react';
import {
    Building2,
    Database,
    KeyRound,
    UserRoundCog,
    ChartNoAxesCombined,
    ShieldCheck,
} from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { dashboard } from '@/routes';
import { index as reportsIndex } from '@/routes/reports';
import { index as auditIndex } from '@/routes/audit';
import { index as rolesIndex } from '@/routes/clinic-roles';
import { index as usersIndex } from '@/routes/clinic-users';
import { show as showClinic } from '@/routes/clinics';
import { overview as masterDataOverview } from '@/routes/master-data';
import { operationalNavigation } from '@/lib/operational-navigation';
import type { NavItem } from '@/types';

export function AppSidebar() {
    const { currentClinic, currentMembership } = usePage().props;
    const permissions = currentMembership?.permissions ?? [];
    const can = (permission: string) => permissions.includes(permission);
    const operationalItems = operationalNavigation(permissions);
    const managementItems: NavItem[] = currentClinic
        ? [
              ...(can('clinic.manage')
                  ? [
                        {
                            title: 'Profil Klinik',
                            href: showClinic(currentClinic.uuid),
                            icon: Building2,
                        },
                    ]
                  : []),
              ...(can('master_data.manage')
                  ? [
                        {
                            title: 'Master Data',
                            href: masterDataOverview(),
                            icon: Database,
                        },
                    ]
                  : []),
              ...(can('users.manage')
                  ? [
                        {
                            title: 'Pengguna & Akses',
                            href: usersIndex(),
                            icon: UserRoundCog,
                        },
                    ]
                  : []),
              ...(can('roles.manage')
                  ? [
                        {
                            title: 'Peran & Hak Akses',
                            href: rolesIndex(),
                            icon: KeyRound,
                        },
                    ]
                  : []),
              ...(can('report.view')
                  ? [
                        {
                            title: 'Laporan',
                            href: reportsIndex(),
                            icon: ChartNoAxesCombined,
                        },
                    ]
                  : []),
              ...(can('audit.view')
                  ? [
                        {
                            title: 'Audit & Akses',
                            href: auditIndex(),
                            icon: ShieldCheck,
                        },
                    ]
                  : []),
          ]
        : [];

    return (
        <Sidebar collapsible="icon" variant="sidebar">
            <SidebarHeader className="border-sidebar-border border-b px-3 py-3">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent className="gap-5 px-1 py-4">
                <NavMain items={operationalItems} />
                {managementItems.length > 0 && (
                    <NavMain items={managementItems} label="Pengelolaan" />
                )}
            </SidebarContent>

            <SidebarFooter className="border-sidebar-border border-t p-3">
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
