import { Link, usePage } from '@inertiajs/react';
import {
    Building2,
    ClipboardList,
    ContactRound,
    KeyRound,
    Pill,
    Settings2,
    Stethoscope,
    UserRoundCog,
    Users,
    Workflow,
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
import { index as rolesIndex } from '@/routes/clinic-roles';
import { index as usersIndex } from '@/routes/clinic-users';
import { show as showClinic } from '@/routes/clinics';
import { index as masterDataIndex } from '@/routes/master-data';
import { index as patientsIndex } from '@/routes/patients';
import { edit as workflowEdit } from '@/routes/workflow';
import type { NavItem } from '@/types';

export function AppSidebar() {
    const { currentClinic, currentMembership } = usePage().props;
    const permissions = currentMembership?.permissions ?? [];
    const can = (permission: string) => permissions.includes(permission);
    const operationalItems: NavItem[] = [
        {
            title: 'Hari Ini',
            href: dashboard(),
            icon: ClipboardList,
        },
        ...(can('patient.view')
            ? [
                  {
                      title: 'Pasien',
                      href: patientsIndex(),
                      icon: ContactRound,
                  },
              ]
            : []),
    ];
    const managementItems: NavItem[] = currentClinic
        ? [
              ...(can('clinic.manage')
                  ? [
                        {
                            title: 'Profil Klinik',
                            href: showClinic(currentClinic.uuid),
                            icon: Building2,
                        },
                        {
                            title: 'Alur Layanan',
                            href: workflowEdit(),
                            icon: Workflow,
                        },
                    ]
                  : []),
              ...(can('master_data.manage')
                  ? [
                        {
                            title: 'Staf',
                            href: masterDataIndex('staff'),
                            icon: Users,
                        },
                        {
                            title: 'Praktisi',
                            href: masterDataIndex('practitioners'),
                            icon: Stethoscope,
                        },
                        {
                            title: 'Unit Layanan',
                            href: masterDataIndex('service-units'),
                            icon: Settings2,
                        },
                        {
                            title: 'Layanan',
                            href: masterDataIndex('services'),
                            icon: ClipboardList,
                        },
                        {
                            title: 'Obat',
                            href: masterDataIndex('medicines'),
                            icon: Pill,
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
                            title: 'Peran & Izin',
                            href: rolesIndex(),
                            icon: KeyRound,
                        },
                    ]
                  : []),
          ]
        : [];

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
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

            <SidebarContent>
                <NavMain items={operationalItems} />
                {managementItems.length > 0 && (
                    <NavMain items={managementItems} label="Pengelolaan" />
                )}
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
