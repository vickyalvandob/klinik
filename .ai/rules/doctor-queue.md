---
paths:
    - 'app/Http/Controllers/DoctorQueueController.php,app/Policies/MedicalRecordPolicy.php,resources/js/pages/doctor-queue/**'
---

# Doctor Queue

## Owner observes clinic records without impersonating doctors

Owner/Admin may view the clinic-wide triage and medical-record worklists. Starting, saving, finalizing, or amending clinical records still requires the assigned active practitioner; owner oversight must remain read-only unless the account is actually linked as that practitioner.
