import { Head, Link } from '@inertiajs/react';
import { ArrowRight, Boxes } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { dashboard } from '@/routes';
import { index, overview } from '@/routes/master-data';
import { resourceIcons } from './resource-navigation';
import type { Resource } from './types';

export default function MasterDataOverview({
    resources,
}: {
    resources: Resource[];
}) {
    return (
        <>
            <Head title="Master Data" />
            <div className="flex flex-1 flex-col gap-6 p-4 md:p-6">
                <PageHeader
                    eyebrow="Pengaturan operasional"
                    title="Master Data"
                    description="Pilih kelompok data yang ingin dikelola. Seluruh perubahan berlaku untuk klinik aktif."
                />
                <section
                    aria-label="Kategori master data"
                    className="grid gap-3 lg:grid-cols-2"
                >
                    {resources.map((resource) => {
                        const Icon =
                            resourceIcons[
                                resource.key as keyof typeof resourceIcons
                            ] ?? Boxes;
                        return (
                            <Link
                                key={resource.key}
                                href={index(resource.key)}
                                className="group bg-card hover:border-primary/40 hover:bg-muted/20 focus-visible:ring-ring flex items-start gap-4 rounded-xl border p-5 transition-colors outline-none focus-visible:ring-2"
                            >
                                <div className="bg-muted text-foreground grid size-10 shrink-0 place-items-center rounded-lg">
                                    <Icon className="size-5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h2 className="font-semibold">
                                        {resource.label}
                                    </h2>
                                    <p className="text-muted-foreground mt-1 text-sm leading-6">
                                        {resource.description}
                                    </p>
                                </div>
                                <span className="text-muted-foreground group-hover:text-primary mt-2 shrink-0">
                                    <ArrowRight className="size-4" />
                                    <span className="sr-only">Buka data</span>
                                </span>
                            </Link>
                        );
                    })}
                </section>
            </div>
        </>
    );
}

MasterDataOverview.layout = {
    breadcrumbs: [
        { title: 'Ringkasan', href: dashboard() },
        { title: 'Master Data', href: overview() },
    ],
};
