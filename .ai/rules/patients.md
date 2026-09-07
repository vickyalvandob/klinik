---
paths:
    - 'app/Http/Controllers/PatientController.php,resources/js/pages/patients/**'
---

# Patients

## Keep patient visit history clinic scoped and permission gated

Patient master records are tenant scoped. On patient detail, visit history and summary require EncounterPolicy::viewAny and must filter both current clinic and patient; return null for unauthorized full and partial Inertia requests. Expose medical-record and invoice links only when their own policies allow access. Open clinical content through the existing audited medical-record endpoint; do not embed SOAP or diagnoses in administrative patient history.
