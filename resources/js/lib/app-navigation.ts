import {
    Building2,
    ChartNoAxesCombined,
    Database,
    KeyRound,
    Monitor,
    ShieldCheck,
    UserRound,
    UserRoundCog,
} from 'lucide-react';
import { operationalNavigation } from '@/lib/operational-navigation';
import { edit as appearanceEdit } from '@/routes/appearance';
import { index as auditIndex } from '@/routes/audit';
import { index as rolesIndex } from '@/routes/clinic-roles';
import { index as usersIndex } from '@/routes/clinic-users';
import { show as clinicShow } from '@/routes/clinics';
import { overview as masterDataOverview } from '@/routes/master-data';
import { index as platformIndex } from '@/routes/platform';
import { edit as profileEdit } from '@/routes/profile';
import { index as reportsIndex } from '@/routes/reports';
import { edit as securityEdit } from '@/routes/security';
import type { CurrentClinic, NavItem } from '@/types';

export const accountNavigation: NavItem[] = [
    { title: 'Profil Saya', href: profileEdit(), icon: UserRound },
    { title: 'Keamanan', href: securityEdit(), icon: KeyRound },
    { title: 'Tampilan', href: appearanceEdit(), icon: Monitor },
];

export function appNavigation(
    clinic: CurrentClinic | null,
    permissions: string[],
    platformAdmin = false,
): { label: string; items: NavItem[] }[] {
    const can = (permission: string) => permissions.includes(permission);
    const [summary, ...operationalItems] = operationalNavigation(permissions);
    const groups = clinic
        ? [
              { label: 'Utama', items: [summary] },
              { label: 'Pelayanan', items: operationalItems },
              {
                  label: 'Pengelolaan',
                  items: [
                      ...(can('master_data.manage')
                          ? [
                                {
                                    title: 'Master Data',
                                    href: masterDataOverview(),
                                    icon: Database,
                                },
                            ]
                          : []),
                      ...(can('clinic.manage')
                          ? [
                                {
                                    title: 'Profil Klinik',
                                    href: clinicShow(clinic.uuid),
                                    icon: Building2,
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
                  ],
              },
              {
                  label: 'Pemantauan',
                  items: [
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
                  ],
              },
          ]
        : [];

    if (platformAdmin) {
        groups.push({
            label: 'Platform',
            items: [
                {
                    title: 'Platform Admin',
                    href: platformIndex(),
                    icon: ShieldCheck,
                },
            ],
        });
    }

    return groups.filter((group) => group.items.length > 0);
}
