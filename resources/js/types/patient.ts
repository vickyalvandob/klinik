export type PatientAllergy = {
    uuid: string;
    substance: string;
    code_system: string | null;
    code: string | null;
    reaction: string | null;
    severity: 'mild' | 'moderate' | 'severe' | null;
    status: 'active' | 'inactive';
    noted_at: string | null;
};

export type PatientSummary = {
    uuid: string;
    medical_record_number: string;
    name: string;
    birth_date: string;
    gender: 'male' | 'female';
    phone: string | null;
    masked_national_id_number: string | null;
    active_allergies_count: number;
    created_at: string | null;
};

export type PatientDetail = PatientSummary & {
    national_id_number: string | null;
    satusehat_patient_id: string | null;
    email: string | null;
    address: string | null;
    province_code: string | null;
    city_code: string | null;
    district_code: string | null;
    village_code: string | null;
    blood_type: 'A' | 'B' | 'AB' | 'O' | null;
    occupation: string | null;
    emergency_contact_name: string | null;
    emergency_contact_phone: string | null;
    allergies: PatientAllergy[];
};

export type PatientDuplicateCandidate = {
    uuid: string;
    medical_record_number: string;
    name: string;
    birth_date: string;
    gender: 'male' | 'female';
    masked_national_id_number: string | null;
    masked_phone: string | null;
    reasons: string[];
    exact_national_id: boolean;
};
