import { Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type PaginationLink = {
    url: string | null;
    label: string;
    active: boolean;
};

export function PaginationLinks({ links }: { links: PaginationLink[] }) {
    if (links.length <= 3) {
        return null;
    }

    return (
        <nav
            className="flex flex-wrap items-center justify-end gap-1"
            aria-label="Paginasi"
        >
            {links.map((link, index) => {
                const isPrevious = index === 0;
                const isNext = index === links.length - 1;

                return (
                    <Button
                        key={`${link.label}-${index}`}
                        asChild={link.url !== null}
                        variant={link.active ? 'default' : 'outline'}
                        size="sm"
                        disabled={link.url === null}
                    >
                        {link.url ? (
                            <Link href={link.url} preserveScroll>
                                {isPrevious ? (
                                    <ChevronLeft />
                                ) : isNext ? (
                                    <ChevronRight />
                                ) : (
                                    link.label
                                )}
                                {(isPrevious || isNext) && (
                                    <span className="sr-only">
                                        {isPrevious
                                            ? 'Sebelumnya'
                                            : 'Berikutnya'}
                                    </span>
                                )}
                            </Link>
                        ) : (
                            <span>
                                {isPrevious ? (
                                    <ChevronLeft />
                                ) : isNext ? (
                                    <ChevronRight />
                                ) : (
                                    link.label
                                )}
                            </span>
                        )}
                    </Button>
                );
            })}
        </nav>
    );
}
