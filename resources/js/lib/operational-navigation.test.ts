import { expect, test } from 'vite-plus/test';
import { operationalNavigation } from './operational-navigation';

test.each([
    ['cashier', ['billing.view', 'report.view'], ['Ringkasan', 'Kasir']],
    [
        'pharmacy',
        ['prescription.view', 'pharmacy.view'],
        ['Ringkasan', 'Apotek'],
    ],
    [
        'front office',
        [
            'encounter.view',
            'encounter.create',
            'registration.view',
            'queue.view',
            'patient.view',
        ],
        ['Ringkasan', 'Pendaftaran', 'Antrean', 'Pasien'],
    ],
    [
        'nurse',
        [
            'encounter.view',
            'queue.view',
            'triage.view',
            'triage.complete',
            'patient.view',
        ],
        ['Ringkasan', 'Antrean', 'Pemeriksaan Awal', 'Pasien'],
    ],
    [
        'doctor',
        [
            'encounter.view',
            'queue.view',
            'triage.view',
            'medical_record.view',
            'prescription.view',
            'patient.view',
        ],
        ['Ringkasan', 'Antrean', 'Rekam Medis', 'Pasien'],
    ],
] as const)(
    '%s navigation shows the relevant work areas',
    (_role, permissions, expected) => {
        expect(
            operationalNavigation([...permissions]).map((item) => item.title),
        ).toEqual(expected);
    },
);

test('encounter visibility does not grant registration or queue navigation', () => {
    expect(
        operationalNavigation(['encounter.view', 'billing.view']).map(
            (item) => item.title,
        ),
    ).toEqual(['Ringkasan', 'Kasir']);
});

test('additional registration access selects the allowed destination', () => {
    const createOnly = operationalNavigation([
        'encounter.create',
        'encounter.view',
    ]);
    const readOnly = operationalNavigation([
        'registration.view',
        'encounter.view',
    ]);
    expect(
        createOnly.find((item) => item.title === 'Pendaftaran')?.href,
    ).toMatchObject({ url: '/registrations/create' });
    expect(
        readOnly.find((item) => item.title === 'Pendaftaran')?.href,
    ).toMatchObject({ url: '/registrations' });
});
