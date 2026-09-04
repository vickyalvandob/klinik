import { Head, Link } from '@inertiajs/react';
import {
    ArrowRight,
    Boxes,
    BriefcaseMedical,
    Building2,
    Pill,
    Stethoscope,
    Users,
} from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { dashboard } from '@/routes';
import { index, overview } from '@/routes/master-data';

const icons = {
    staff: Users,
    practitioners: Stethoscope,
    'service-units': Building2,
    services: BriefcaseMedical,
    medicines: Pill,
};

export default function MasterDataOverview({
    resources,
}: {
    resources: Array<{ key: string; label: string; description: string }>;
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
                <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {resources.map((resource) => {
                        const Icon =
                            icons[resource.key as keyof typeof icons] ?? Boxes;
                        return (
                            <Link
                                key={resource.key}
                                href={index(resource.key)}
                                className="bg-card hover:border-primary/50 focus-visible:ring-ring grid min-h-40 gap-4 rounded-xl border p-5 transition-colors outline-none focus-visible:ring-2"
                            >
                                <div className="bg-muted text-foreground grid size-10 place-items-center rounded-lg">
                                    <Icon className="size-5" />
                                </div>
                                <div>
                                    <h2 className="font-semibold">
                                        {resource.label}
                                    </h2>
                                    <p className="text-muted-foreground mt-1 text-sm leading-6">
                                        {resource.description}
                                    </p>
                                </div>
                                <span className="text-primary mt-auto inline-flex items-center gap-2 text-sm font-medium">
                                    Buka data <ArrowRight className="size-4" />
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
        { title: 'Dashboard', href: dashboard() },
        { title: 'Master Data', href: overview() },
    ],
};
