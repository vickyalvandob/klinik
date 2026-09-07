import {
    Activity,
    ClipboardList,
    ContactRound,
    LayoutDashboard,
    Pill,
    ReceiptText,
    Stethoscope,
    Megaphone,
} from 'lucide-react';
import { dashboard } from '@/routes';
import { index as billingIndex } from '@/routes/billing';
import { index as doctorQueueIndex } from '@/routes/doctor-queue';
import { index as patientsIndex } from '@/routes/patients';
import { index as pharmacyIndex } from '@/routes/pharmacy';
import {
    index as registrationIndex,
    create as registrationCreate,
} from '@/routes/registrations';
import { index as triagesIndex } from '@/routes/triages';
import { index as queuesIndex } from '@/routes/queues';
import type { NavItem } from '@/types';

export function operationalNavigation(permissions: string[]): NavItem[] {
    const can = (permission: string) => permissions.includes(permission);
    return [
        { title: 'Ringkasan', href: dashboard(), icon: LayoutDashboard },
        ...((can('registration.view') && can('encounter.view')) ||
        can('encounter.create')
            ? [
                  {
                      title: 'Pendaftaran',
                      href:
                          can('registration.view') && can('encounter.view')
                              ? registrationIndex()
                              : registrationCreate(),
                      icon: ClipboardList,
                  },
              ]
            : []),
        ...(can('queue.view') && can('encounter.view')
            ? [{ title: 'Antrean', href: queuesIndex(), icon: Megaphone }]
            : []),
        ...(can('triage.view') &&
        ['triage.create', 'triage.update', 'triage.complete'].some(can)
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
        ...(can('pharmacy.view')
            ? [{ title: 'Apotek', href: pharmacyIndex(), icon: Pill }]
            : []),
        ...(can('billing.view')
            ? [{ title: 'Kasir', href: billingIndex(), icon: ReceiptText }]
            : []),
        ...(can('patient.view')
            ? [{ title: 'Pasien', href: patientsIndex(), icon: ContactRound }]
            : []),
    ];
}
