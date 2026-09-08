---
paths:
    - 'app/Http/Controllers/PharmacyController.php,resources/js/pages/pharmacy/**'
---

# Pharmacy

## Keep pharmacy worklists bounded and stock readiness consistent

Active prescription worklists prioritize oldest prescribed_at with stable id ordering. History filters use dispensed_at/cancelled_at and clinic-local start/end boundaries converted to app timezone. Keep list and summary props in closures so partial filter/pagination requests skip unused queries. Stock readiness must aggregate duplicate medicine items as dispensing does; terminal prescriptions must not show current-stock shortages as historical failures. Stock adjustment UI follows the adjustStock policy.
