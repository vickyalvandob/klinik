import { Link } from '@inertiajs/react';
import { ArrowDownRight, ArrowRight, ArrowUpRight, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatDate } from '@/lib/billing';
import { index as billingIndex } from '@/routes/billing';
import { reportTotal } from './report-config';
import type { ReportSection, ReportSummary, Row } from './report-config';

const number = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 });
type Metric = { label: string; value: number; detail: string; currency?: boolean };

export function ReportOverview({ section, summary, rows }: { section: ReportSection; summary: ReportSummary; rows: Row[] }) {
    const value = (key: keyof Omit<ReportSummary, 'comparison'>) => summary[key] ?? 0;
    const count = reportTotal(section, summary);
    const ratio = (part: number, total: number) => total > 0 ? Math.min(100, part / total * 100) : 0;
    let metrics: Metric[];
    let explanation: string;
    let chartTitle: string;
    let chartUnit = 'dari seluruh ';
    let chartTotal = count;
    let chartAmount = false;

    switch (section) {
        case 'revenue':
            metrics = [
                { label: 'Uang diterima', value: value('revenue'), currency: true, detail: 'Pembayaran yang diterima dalam periode ini.' },
                { label: 'Pembayaran tercatat', value: count, detail: 'Termasuk pembayaran bertahap dan gabungan metode.' },
                { label: 'Rata-rata pembayaran', value: count ? Math.round(value('revenue') / count) : 0, currency: true, detail: 'Uang diterima dibagi jumlah pembayaran.' },
            ];
            explanation = count ? `${number.format(count)} pembayaran menghasilkan penerimaan ${formatCurrency(value('revenue'))}. Angka ini menunjukkan uang masuk, bukan laba klinik.` : 'Belum ada pembayaran yang diterima pada periode ini.';
            if (value('voided_count')) explanation += ` ${number.format(value('voided_count'))} pembayaran dibatalkan senilai ${formatCurrency(value('voided_payments'))} tidak ikut dihitung.`;
            chartTitle = 'Dari mana uang diterima?'; chartUnit += 'uang diterima'; chartTotal = value('revenue'); chartAmount = true;
            break;
        case 'billing': {
            metrics = [
                { label: 'Nilai tagihan', value: value('invoiced'), currency: true, detail: `${number.format(value('invoice_count'))} tagihan terbit, di luar yang dibatalkan.` },
                { label: 'Sudah dibayar', value: value('paid'), currency: true, detail: 'Pembayaran hingga saat ini untuk tagihan tersebut.' },
                { label: 'Belum dibayar', value: value('outstanding'), currency: true, detail: `${number.format(value('outstanding_count'))} tagihan masih memiliki sisa pembayaran.` },
            ];
            explanation = value('outstanding_count') ? `${number.format(value('outstanding_count'))} tagihan dari periode ini belum lunas, dengan sisa ${formatCurrency(value('outstanding'))}. Saldo mencerminkan kondisi sekarang, termasuk pembayaran setelah periode berakhir.` : value('invoice_count') ? 'Seluruh tagihan aktif yang terbit pada periode ini sudah lunas.' : 'Belum ada tagihan aktif yang terbit pada periode ini.';
            if (value('voided_count')) explanation += ` ${number.format(value('voided_count'))} tagihan dibatalkan ditampilkan sebagai riwayat di tabel.`;
            chartTitle = 'Pelunasan tagihan';
            break;
        }
        case 'visits': {
            const active = Math.max(0, count - value('cancelled'));
            const pending = Math.max(0, active - value('completed'));
            metrics = [
                { label: 'Kunjungan terdaftar', value: count, detail: 'Seluruh kunjungan, termasuk yang dibatalkan.' },
                { label: 'Pasien unik', value: value('patients'), detail: 'Satu pasien dihitung sekali, meski datang berulang.' },
                { label: 'Kunjungan selesai', value: value('completed'), detail: `${number.format(pending)} masih berjalan · ${number.format(value('cancelled'))} dibatalkan.` },
            ];
            explanation = count ? `${number.format(value('patients'))} pasien tercatat dalam ${number.format(count)} kunjungan. ${number.format(ratio(value('completed'), active))}% kunjungan yang tidak dibatalkan telah selesai.` : 'Belum ada kunjungan terdaftar pada periode ini.';
            chartTitle = 'Hari dengan kunjungan terbanyak'; chartUnit += 'kunjungan terdaftar';
            break;
        }
        case 'services':
            metrics = [
                { label: 'Tindakan tercatat', value: count, detail: 'Dari catatan medis yang telah diselesaikan.' },
                { label: 'Kunjungan dengan tindakan', value: value('encounters'), detail: 'Satu kunjungan dapat memiliki beberapa tindakan.' },
                { label: 'Nilai tarif tindakan', value: value('amount'), currency: true, detail: 'Tarif yang tercatat, bukan uang yang sudah diterima.' },
            ];
            explanation = count ? `${number.format(count)} tindakan tercatat pada ${number.format(value('encounters'))} kunjungan. Gunakan rincian ini untuk melihat layanan yang paling sering diberikan.` : 'Belum ada tindakan dari catatan medis yang telah diselesaikan pada periode ini.';
            chartTitle = 'Layanan paling sering diberikan'; chartUnit += 'tindakan';
            break;
        case 'diagnoses':
            metrics = [
                { label: 'Diagnosis utama', value: value('primary_count'), detail: 'Diagnosis utama dalam catatan medis selesai.' },
                { label: 'Diagnosis tambahan', value: Math.max(0, count - value('primary_count')), detail: 'Diagnosis lain yang dicatat pada kunjungan yang sama.' },
                { label: 'Kunjungan dengan diagnosis', value: value('encounters'), detail: 'Satu kunjungan dapat mencatat beberapa diagnosis.' },
            ];
            explanation = count ? `${number.format(count)} diagnosis tercatat pada ${number.format(value('encounters'))} kunjungan. Frekuensi diagnosis menghitung pencatatan, bukan jumlah pasien unik atau prevalensi penyakit.` : 'Belum ada diagnosis dari catatan medis yang telah diselesaikan pada periode ini.';
            chartTitle = 'Diagnosis paling sering tercatat'; chartUnit += 'diagnosis tercatat';
            break;
        case 'doctors':
            metrics = [
                { label: 'Kunjungan terdaftar', value: count, detail: 'Tidak termasuk kunjungan yang dibatalkan.' },
                { label: 'Dokter ditugaskan', value: value('doctors'), detail: 'Dokter yang memiliki kunjungan pada periode ini.' },
                { label: 'Kunjungan selesai', value: value('completed'), detail: `${number.format(Math.max(0, count - value('completed')))} kunjungan masih berjalan.` },
            ];
            explanation = count ? `${number.format(count)} kunjungan tercatat untuk ${number.format(value('doctors'))} dokter. Distribusi ini membantu melihat pembagian kunjungan, bukan menilai mutu pelayanan dokter.` : 'Belum ada kunjungan aktif untuk dokter pada periode ini.';
            chartTitle = 'Pembagian kunjungan dokter'; chartUnit += 'kunjungan yang tidak dibatalkan';
            break;
        case 'pharmacy':
            metrics = [
                { label: 'Resep masuk', value: count, detail: 'Resep dari kunjungan periode ini, tanpa draf.' },
                { label: 'Sudah diserahkan', value: value('dispensed'), detail: 'Obat telah diserahkan kepada pasien.' },
                { label: 'Belum diserahkan', value: value('pending'), detail: 'Resep baru dan resep yang sedang disiapkan.' },
            ];
            explanation = count ? `${number.format(value('pending'))} resep dari periode ini masih perlu diselesaikan. ${number.format(value('dispensed'))} sudah diserahkan dan ${number.format(value('cancelled'))} dibatalkan. Status menunjukkan kondisi sekarang.` : 'Belum ada resep yang diterbitkan dari kunjungan periode ini.';
            chartTitle = 'Status pelayanan resep'; chartUnit += 'resep masuk';
            break;
    }

    const top = [...rows].sort((a, b) => (chartAmount ? (b.amount ?? 0) - (a.amount ?? 0) : b.count - a.count) || a.label.localeCompare(b.label, 'id-ID')).slice(0, 5);
    const comparison = summary.comparison;
    const current = section === 'revenue' ? value('revenue') : count;
    const difference = comparison ? current - comparison.value : 0;
    const change = comparison?.value ? Math.abs(difference) / comparison.value * 100 : null;
    const coveredCount = rows.reduce((total, row) => total + row.count, 0);

    return (
        <div className="grid gap-4 border-b p-4 sm:p-5" aria-label="Ringkasan laporan">
            <dl className="grid gap-4 divide-y sm:grid-cols-3 sm:divide-x sm:divide-y-0 print:grid-cols-3">
                {metrics.map((metric, index) => <div key={metric.label} className="min-w-0 pb-4 last:pb-0 sm:pr-4 sm:pb-0">
                    <dt className="text-xs font-medium text-muted-foreground">{metric.label}</dt>
                    <dd className={index === 0 ? 'mt-2 text-2xl font-semibold tracking-tight break-words text-primary tabular-nums' : 'mt-2 text-2xl font-semibold tracking-tight break-words tabular-nums'}>{metric.currency ? formatCurrency(metric.value) : number.format(metric.value)}</dd>
                    <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{metric.detail}</p>
                </div>)}
            </dl>
            {comparison && <div className="flex flex-wrap items-start gap-x-3 gap-y-1 rounded-lg border px-3 py-2.5 text-xs" aria-label="Perbandingan periode">
                <span className="inline-flex items-center gap-1 font-medium">
                    {difference > 0 ? <ArrowUpRight className="size-3.5" /> : difference < 0 ? <ArrowDownRight className="size-3.5" /> : null}
                    {comparison.value === 0 ? (current === 0 ? 'Belum ada data pada kedua periode' : 'Periode sebelumnya belum memiliki data') : difference === 0 ? 'Sama dengan periode sebelumnya' : `${difference > 0 ? 'Naik' : 'Turun'} ${number.format(change ?? 0)}%`}
                </span>
                <span className="text-muted-foreground">{formatDate(comparison.from)} – {formatDate(comparison.to)} ({comparison.days} hari): {section === 'revenue' ? formatCurrency(comparison.value) : `${number.format(comparison.value)} kunjungan`}.</span>
                {comparison.ongoing && <span className="w-full text-muted-foreground">Periode pilihan masih berjalan atau mencakup tanggal mendatang; angka belum final.</span>}
            </div>}
            <div className="rounded-lg bg-muted/40 p-3.5">
                <h3 className="text-xs font-semibold">Yang perlu diketahui</h3>
                <p className="mt-1.5 text-sm leading-relaxed">{explanation}</p>
                {section === 'billing' && value('outstanding_count') > 0 && <Button asChild variant="link" className="mt-2 h-auto p-0 text-xs print:hidden"><Link href={billingIndex({query:{mode:'outstanding'}})}>Lihat semua tagihan belum lunas <ArrowRight className="size-3.5" /></Link></Button>}
            </div>
            {section === 'billing' ? value('invoiced') > 0 && <div className="grid gap-2">
                <div className="flex justify-between gap-3 text-xs"><h3 className="font-medium">{chartTitle}</h3><span className="tabular-nums">{number.format(ratio(value('paid'), value('invoiced')))}% dibayar</span></div>
                <div className="h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true"><div className="h-full rounded-full bg-primary/65" style={{width:`${ratio(value('paid'),value('invoiced'))}%`}} /></div>
                <p className="text-xs text-muted-foreground">Dari nilai tagihan aktif yang terbit pada periode pilihan.</p>
            </div> : top.length > 0 && <div>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-1"><h3 className="text-xs font-semibold">{chartTitle}</h3><span className="text-xs text-muted-foreground">{rows.length > 5 ? '5 teratas · ' : ''}Persentase {chartUnit}</span></div>
                <ol className="grid gap-3" aria-label={chartTitle}>
                    {top.map((row, index) => <li key={`${row.label}-${index}`} className="grid gap-1.5">
                        <div className="flex justify-between gap-3 text-xs"><span className="min-w-0 break-words">{section === 'visits' ? formatDate(row.label) : row.label}</span><span className="shrink-0 text-right tabular-nums">{chartAmount ? formatCurrency(row.amount ?? 0) : number.format(row.count)} <span className="text-muted-foreground">· {number.format(ratio(chartAmount ? row.amount ?? 0 : row.count,chartTotal))}%</span></span></div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true"><div className="h-full rounded-full bg-primary/55" style={{width:`${ratio(chartAmount ? row.amount ?? 0 : row.count,chartTotal)}%`}} /></div>
                    </li>)}
                </ol>
            </div>}
            {coveredCount < count && <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"><Info className="size-3.5 shrink-0" />Ringkasan menghitung seluruh data. Rincian dan CSV dibatasi 100 baris teratas yang mencakup {number.format(coveredCount)} dari {number.format(count)} pencatatan.</p>}
        </div>
    );
}
