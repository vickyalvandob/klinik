import type { Auth } from '@/types/auth';
import type {
    CurrentClinic,
    CurrentMembership,
    CurrentTenant,
} from '@/types/tenancy';

declare module 'react' {
    interface InputHTMLAttributes<T> {
        passwordrules?: string;
    }
}

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            auth: Auth;
            currentTenant: CurrentTenant | null;
            currentClinic: CurrentClinic | null;
            currentMembership: CurrentMembership | null;
            sidebarOpen: boolean;
            [key: string]: unknown;
        };
    }
}
