import { Link, usePage } from '@inertiajs/react';
import {
    Activity,
    Building2,
    ClipboardList,
    ContactRound,
    Database,
    KeyRound,
    Pill,
    ReceiptText,
    Stethoscope,
    UserRoundCog,
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
import { overview as masterDataOverview } from '@/routes/master-data';
import { index as patientsIndex } from '@/routes/patients';
import { index as pharmacyIndex } from '@/routes/pharmacy';
import { index as billingIndex } from '@/routes/billing';
import { create as registrationCreate } from '@/routes/registrations';
import { index as triagesIndex } from '@/routes/triages';
import { index as doctorQueueIndex } from '@/routes/doctor-queue';
import { edit as workflowEdit } from '@/routes/workflow';
import type { NavItem } from '@/types';

export function AppSidebar() {
    const { currentClinic, currentMembership } = usePage().props;
    const permissions = currentMembership?.permissions ?? [];
    const can = (permission: string) => permissions.includes(permission);
    const operationalItems: NavItem[] = [
        {
            title: 'Dashboard',
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
        ...(can('encounter.create')
            ? [
                  {
                      title: 'Pendaftaran',
                      href: registrationCreate(),
                      icon: ClipboardList,
                  },
              ]
            : []),
        ...(can('triage.view')
            ? [
                  {
                      title: 'Pemeriksaan Awal',
                      href: triagesIndex(),
                      icon: Activity,
                  },
              ]
            : []),
        ...(can('medical_record.view')
            ? [
                  {
                      title: 'Rekam Medis',
                      href: doctorQueueIndex(),
                      icon: Stethoscope,
                  },
              ]
            : []),
        ...(can('pharmacy.view') || can('prescription.view')
            ? [
                  {
                      title: 'Apotek',
                      href: pharmacyIndex(),
                      icon: Pill,
                  },
              ]
            : []),
        ...(can('billing.view')
            ? [
                  {
                      title: 'Kasir',
                      href: billingIndex(),
                      icon: ReceiptText,
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
                            title: 'Pengaturan Alur Layanan',
                            href: workflowEdit(),
                            icon: Workflow,
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
