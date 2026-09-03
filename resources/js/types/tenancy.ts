export type CurrentTenant = {
    uuid: string;
    name: string;
    slug: string;
    status: 'active' | 'suspended' | 'cancelled';
};

export type CurrentClinic = {
    uuid: string;
    name: string;
    timezone: string;
};

export type CurrentMembership = {
    role: {
        code: string;
        name: string;
    };
    permissions: string[];
};
