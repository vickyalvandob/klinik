import { router, usePage } from '@inertiajs/react';
import { RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function WorklistRefresh() {
    const { component } = usePage();
    const [refreshing, setRefreshing] = useState(false);
    if (
        ![
            'dashboard',
            'registrations/index',
            'triages/index',
            'doctor-queue/index',
            'pharmacy/index',
            'billing/index',
            'patients/index',
            'queues/index',
        ].includes(component)
    )
        return null;

    return (
        <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={refreshing}
            aria-label="Muat ulang data"
            title="Muat ulang data"
            onClick={() =>
                router.reload({
                    only:
                        component === 'registrations/index'
                            ? [
                                  'encounters',
                                  'summary',
                                  'filters',
                                  'today',
                                  'can',
                              ]
                            : component === 'triages/index'
                              ? ['encounters', 'summary', 'filters', 'mode']
                              : undefined,
                    onStart: () => setRefreshing(true),
                    onFinish: () => setRefreshing(false),
                })
            }
        >
            <RefreshCw className={refreshing ? 'animate-spin' : ''} />
            <span className="hidden lg:inline">Perbarui</span>
        </Button>
    );
}
