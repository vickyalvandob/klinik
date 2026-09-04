import type { Paginator } from './encounter';

export type PharmacyMode = 'new' | 'processing' | 'history' | 'stock';

export type PharmacyPrescriptionListItem = {
    uuid: string;
    status: 'prescribed' | 'processing' | 'dispensed' | 'cancelled';
    status_label: string;
    prescribed_at: string | null;
    processing_started_at: string | null;
    dispensed_at: string | null;
    items_count: number;
    patient: { name: string; medical_record_number: string };
    doctor: string;
    registration_number: string;
};

export type MedicineStockItem = {
    uuid: string;
    code: string;
    name: string;
    generic_name: string | null;
    strength: string | null;
    unit: string;
    minimum_stock: number;
    quantity: string;
    last_movement_at: string | null;
    is_active: boolean;
};

export type PharmacyPrescriptionPage = Paginator<PharmacyPrescriptionListItem>;
export type MedicineStockPage = Paginator<MedicineStockItem>;

export type PharmacyPrescription = {
    uuid: string;
    status: 'prescribed' | 'processing' | 'dispensed' | 'cancelled';
    status_label: string;
    prescribed_at: string | null;
    processing_started_at: string | null;
    dispensed_at: string | null;
    cancelled_at: string | null;
    cancellation_reason: string | null;
    notes: string | null;
    encounter: { registration_number: string; status: string };
    patient: {
        name: string;
        medical_record_number: string;
        birth_date: string;
        gender: 'male' | 'female';
    };
    doctor: { name: string; specialization: string | null };
    items: Array<{
        uuid: string;
        name: string;
        strength: string | null;
        dosage_form: string | null;
        quantity: string;
        unit: string;
        instruction: string;
        dose_text: string | null;
        frequency_text: string | null;
        timing_text: string | null;
        duration_text: string | null;
        stock: string;
    }>;
    audits: Array<{ action: string; actor: string; created_at: string }>;
};
