---
paths:
    - 'app/Actions/**,app/Http/**,resources/js/**,routes/**'
---

# Http Js

## Use the fixed outpatient workflow and permission based navigation

Operational flow is fixed: registration -> triage -> doctor finalization with one primary diagnosis -> pharmacy when prescribed -> billing -> completed. Legacy clinic_workflow_settings rows do not control runtime transitions or permit partial payments; retain historical records. Onboarding has five visible steps and accepts legacy step 6 at completion. Dashboard is Ringkasan with aggregate counts only; visit lists and dated history belong in Pendaftaran. Shared navigation permissions must match clinic role overrides plus additive membership grants.
