import type { Paginator } from './encounter';

export type BillingMode = 'outstanding' | 'partial' | 'paid' | 'voided';

export type BillingInvoiceListItem = {
    uuid: string;
    invoice_number: string;
    status: 'issued' | 'partially_paid' | 'paid' | 'voided';
    status_label: string;
    total_amount: number;
    paid_amount: number;
    balance_due: number;
    issued_at: string;
    patient: { name: string; medical_record_number: string };
    registration_number: string;
};

export type BillingInvoicePage = Paginator<BillingInvoiceListItem>;

export type BillingReconciliation = {
    received_count: number;
    received_amount: number;
    voided_count: number;
    voided_amount: number;
    net_amount: number;
    by_method: Array<{ label: string; count: number; amount: number }>;
};

export type BillingInvoice = {
    uuid: string;
    invoice_number: string;
    status: 'issued' | 'partially_paid' | 'paid' | 'voided';
    status_label: string;
    subtotal: number;
    total_amount: number;
    paid_amount: number;
    balance_due: number;
    issued_at: string;
    voided_at: string | null;
    void_reason: string | null;
    patient: {
        name: string;
        medical_record_number: string;
        birth_date: string;
        gender: 'male' | 'female';
    };
    encounter: {
        registration_number: string;
        date: string;
        status: string;
    };
    items: Array<{
        uuid: string;
        type: 'procedure' | 'medicine';
        type_label: string;
        code: string | null;
        description: string;
        quantity: string;
        unit: string | null;
        unit_price: number;
        line_total: number;
    }>;
    payments: Array<{
        uuid: string;
        payment_number: string;
        amount: number;
        method: 'cash' | 'card' | 'bank_transfer' | 'other';
        method_label: string;
        reference_number: string | null;
        notes: string | null;
        status: 'received' | 'voided';
        status_label: string;
        received_at: string;
        received_by: string;
        voided_at: string | null;
        voided_by: string | null;
        void_reason: string | null;
        can_void: boolean;
    }>;
    audits: Array<{ action: string; actor: string; created_at: string }>;
};
