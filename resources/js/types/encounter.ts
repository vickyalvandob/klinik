import type { PaginationLink } from '@/components/pagination-links';

export type StatusView = {
    value: string;
    label: string;
    tone: string;
};

export type RegistrationPatient = {
    uuid: string;
    medical_record_number: string;
    name: string;
    birth_date: string;
    gender: 'male' | 'female';
    masked_national_id_number: string | null;
    masked_phone: string | null;
};

export type TodayEncounter = {
    uuid: string;
    registration_number: string;
    registered_at: string;
    chief_complaint: string;
    status: StatusView;
    patient: Pick<
        RegistrationPatient,
        'uuid' | 'medical_record_number' | 'name' | 'birth_date' | 'gender'
    >;
    service_unit: { uuid: string; name: string };
    practitioner: { uuid: string; name: string; specialization: string | null };
    queue: { uuid: string; number: string; status: string };
    can_cancel: boolean;
    can_triage: boolean;
};

export type EncounterHistory = {
    uuid: string;
    registration_number: string;
    registered_at: string;
    chief_complaint: string;
    status: StatusView;
    service_unit: string;
    practitioner: string;
    queue_number: string;
};

export type Paginator<T> = {
    data: T[];
    links: PaginationLink[];
    from: number | null;
    to: number | null;
    total: number;
};

export type TriageValues = {
    chief_complaint: string | null;
    systolic_bp: number | null;
    diastolic_bp: number | null;
    heart_rate: number | null;
    respiratory_rate: number | null;
    temperature: string | null;
    spo2: number | null;
    weight: string | null;
    height: string | null;
    pain_scale: number | null;
    notes: string | null;
    status: 'draft' | 'completed';
    completed_at: string | null;
};

export type TriageEncounter = {
    uuid: string;
    registered_at: string;
    chief_complaint: string;
    status: string;
    patient: {
        uuid: string;
        medical_record_number: string;
        name: string;
        birth_date: string;
        gender: 'male' | 'female';
        allergies: Array<{
            substance: string;
            reaction: string | null;
            severity: 'mild' | 'moderate' | 'severe' | null;
        }>;
    };
    service_unit: string;
    practitioner: string;
    queue_number: string;
    triage: TriageValues | null;
};

export type TriageQueueEncounter = {
    uuid: string;
    registered_at: string;
    chief_complaint: string;
    patient: {
        medical_record_number: string;
        name: string;
        birth_date: string;
        gender: 'male' | 'female';
        allergies: string[];
    };
    service_unit: string;
    practitioner: string;
    queue_number: string;
    triage_status: 'draft' | 'completed' | null;
    triage_updated_at: string | null;
    completed_at: string | null;
};
