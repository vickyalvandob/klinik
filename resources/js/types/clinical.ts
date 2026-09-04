import type { Paginator } from './encounter';

export type DoctorQueueEncounter = {
    uuid: string;
    registered_at: string;
    started_at: string | null;
    chief_complaint: string;
    status: string;
    patient: {
        medical_record_number: string;
        name: string;
        birth_date: string;
        gender: 'male' | 'female';
        allergies: string[];
    };
    service_unit: string;
    queue_number: string;
    medical_record: {
        status: 'draft' | 'final' | 'amended';
        updated_at: string;
        finalized_at: string | null;
    } | null;
    can_start: boolean;
};

export type DoctorQueuePage = Paginator<DoctorQueueEncounter>;

export type DiagnosisOption = {
    uuid: string;
    code_system: string;
    code: string;
    display: string;
};

export type ServiceOption = {
    uuid: string;
    code: string;
    name: string;
    price: string;
};

export type MedicineOption = {
    uuid: string;
    code: string;
    name: string;
    generic_name: string | null;
    strength: string | null;
    dosage_form: string;
    unit: string;
};

export type ClinicalEncounter = {
    uuid: string;
    registration_number: string;
    registered_at: string;
    started_at: string | null;
    chief_complaint: string;
    status: string;
    status_label: string;
    patient: {
        uuid: string;
        medical_record_number: string;
        name: string;
        birth_date: string;
        gender: 'male' | 'female';
        blood_type: string | null;
        allergies: Array<{
            substance: string;
            reaction: string | null;
            severity: 'mild' | 'moderate' | 'severe' | null;
        }>;
    };
    service_unit: string;
    practitioner: { name: string; specialization: string | null };
    queue_number: string;
    triage: {
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
        completed_at: string | null;
    } | null;
    medical_record: {
        uuid: string;
        subjective: string | null;
        objective: string | null;
        assessment: string | null;
        plan: string | null;
        additional_notes: string | null;
        status: 'draft' | 'final' | 'amended';
        status_label: string;
        finalized_at: string | null;
        diagnoses: DiagnosisRow[];
        procedures: ProcedureRow[];
        prescription: { notes: string | null; items: PrescriptionRow[] } | null;
        amendments: Array<{
            uuid: string;
            reason: string;
            content: string;
            created_at: string;
            created_by: string;
        }>;
    } | null;
};

export type DiagnosisRow = {
    catalog_id: string;
    code_system: string;
    code: string;
    display: string;
    type: 'primary' | 'secondary';
    notes: string | null;
};

export type ProcedureRow = {
    service_id: string;
    code: string;
    name: string;
    price: number;
    notes: string | null;
};

export type PrescriptionRow = {
    medicine_id: string;
    name: string;
    strength: string | null;
    dosage_form: string | null;
    quantity: string | number;
    unit: string;
    dose_text: string | null;
    frequency_text: string | null;
    timing_text: string | null;
    duration_text: string | null;
    instruction: string;
    notes: string | null;
};

export type PreviousEncounter = {
    date: string;
    doctor: string;
    assessment: string | null;
    plan: string | null;
    diagnoses: Array<{ code: string; display: string; type: string }>;
};
