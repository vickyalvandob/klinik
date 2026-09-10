import type { PaginationLink } from '@/components/pagination-links';

export type Resource = { key: string; label: string; description: string };
export type Field = {
    key: string;
    label: string;
    type: string;
    required: boolean;
    placeholder?: string;
    options?: Record<string, string>;
    min?: number;
    step?: number;
};
export type Column = { key: string; label: string; format?: string };
export type RecordItem = {
    uuid: string;
    is_active: boolean;
    columns: Record<string, string | number | null>;
};
export type MasterForm = {
    record: {
        uuid: string;
        is_active: boolean;
        values: Record<string, string | number | null>;
    } | null;
    fields: Field[];
};
export type Filters = { search: string; status: string; per_page: number };
export type ListQuery = Filters & { page: number };
export type Pagination = {
    data: RecordItem[];
    links: PaginationLink[];
    from: number | null;
    to: number | null;
    total: number;
    current_page: number;
};
