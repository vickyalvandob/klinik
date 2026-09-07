import { Form, Head } from '@inertiajs/react';
import { PageHeader } from '@/components/page-header';
import { FormField } from '@/components/form-field';
import { PaginationLinks } from '@/components/pagination-links';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { index } from '@/routes/audit';

type Log = { uuid: string; action: string; actor: string; created_at: string };
export default function Audit({
    logs,
    filters,
}: {
    logs: {
        data: Log[];
        links: Array<{ url: string | null; label: string; active: boolean }>;
        total: number;
    };
    filters: { source: string; from: string; to: string };
}) {
    return (
        <>
            <Head title="Audit & Akses" />
            <div className="flex flex-1 flex-col gap-5 p-4 md:p-6">
                <PageHeader
                    title="Audit & Akses"
                    description="Jejak aktivitas, perubahan layanan, dan pembacaan rekam medis. Catatan audit tidak dapat diubah."
                />
                <Form
                    {...index.form()}
                    className="bg-card flex flex-wrap items-end gap-3 rounded-xl border p-4"
                >
                    {({ errors, processing }) => (
                        <>
                            <FormField
                                id="source"
                                label="Jenis catatan"
                                error={errors.source}
                            >
                                <select
                                    id="source"
                                    name="source"
                                    defaultValue={filters.source}
                                    className="border-input bg-background h-9 rounded-md border px-3 text-sm"
                                >
                                    <option value="activity">
                                        Aktivitas aplikasi
                                    </option>
                                    <option value="access">
                                        Akses RME & lampiran
                                    </option>
                                    <option value="clinical">
                                        Perubahan RME
                                    </option>
                                    <option value="triage">
                                        Pemeriksaan awal
                                    </option>
                                    <option value="billing">
                                        Tagihan & pembayaran
                                    </option>
                                    <option value="pharmacy">Farmasi</option>
                                </select>
                            </FormField>
                            <FormField
                                id="from"
                                label="Dari"
                                error={errors.from}
                            >
                                <Input
                                    type="date"
                                    id="from"
                                    name="from"
                                    defaultValue={filters.from}
                                />
                            </FormField>
                            <FormField id="to" label="Sampai" error={errors.to}>
                                <Input
                                    type="date"
                                    id="to"
                                    name="to"
                                    defaultValue={filters.to}
                                />
                            </FormField>
                            <Button type="submit" disabled={processing}>
                                Tampilkan
                            </Button>
                        </>
                    )}
                </Form>
                <section className="bg-card overflow-hidden rounded-xl border">
                    <div className="border-b p-4 text-sm font-medium">
                        {logs.total.toLocaleString('id-ID')} catatan
                    </div>
                    {logs.data.length === 0 ? (
                        <p className="text-muted-foreground p-5 text-sm">
                            Belum ada catatan pada filter ini.
                        </p>
                    ) : (
                        <div className="divide-y">
                            {logs.data.map((log) => (
                                <article
                                    key={log.uuid}
                                    className="grid gap-2 p-4 sm:grid-cols-[12rem_minmax(0,1fr)_12rem]"
                                >
                                    <time className="text-muted-foreground text-xs">
                                        {new Intl.DateTimeFormat('id-ID', {
                                            dateStyle: 'medium',
                                            timeStyle: 'short',
                                        }).format(new Date(log.created_at))}
                                    </time>
                                    <div>
                                        <p className="text-sm font-medium break-words">
                                            {log.action}
                                        </p>
                                        <p className="text-muted-foreground mt-1 text-xs break-all">
                                            {log.uuid}
                                        </p>
                                    </div>
                                    <p className="text-sm">{log.actor}</p>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
                <PaginationLinks links={logs.links} />
            </div>
        </>
    );
}
Audit.layout = { breadcrumbs: [{ title: 'Audit & Akses', href: index() }] };
