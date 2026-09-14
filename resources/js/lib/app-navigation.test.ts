import { expect, test } from 'vite-plus/test';
import { appNavigation } from './app-navigation';

const clinic = { uuid: 'clinic-a', name: 'Klinik A', timezone: 'Asia/Jakarta' };

test('cashier menu groups contain only financial work and reporting', () => {
    expect(
        appNavigation(clinic, ['billing.view', 'report.view']).map((group) => ({
            label: group.label,
            titles: group.items.map((item) => item.title),
        })),
    ).toEqual([
        { label: 'Utama', titles: ['Ringkasan'] },
        { label: 'Pelayanan', titles: ['Kasir'] },
        { label: 'Pemantauan', titles: ['Laporan'] },
    ]);
});

test('management links use the active clinic and independent permission grants', () => {
    const items = appNavigation(clinic, [
        'clinic.manage',
        'users.manage',
    ]).flatMap((group) => group.items);

    expect(items.map((item) => item.title)).toEqual([
        'Ringkasan',
        'Profil Klinik',
        'Pengguna & Akses',
    ]);
    expect(
        items.find((item) => item.title === 'Profil Klinik')?.href,
    ).toMatchObject({ url: '/clinics/clinic-a' });
});

test('missing clinic context never exposes operational or management menus', () => {
    expect(appNavigation(null, ['clinic.manage', 'billing.view'])).toEqual([]);
});

test('platform access does not imply clinic menu permissions', () => {
    expect(
        appNavigation(null, [], true)
            .flatMap((group) => group.items)
            .map((item) => item.title),
    ).toEqual(['Platform Admin']);
});
