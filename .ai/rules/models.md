---
paths:
    - 'app/Actions/*Prescription.php,app/Models/MedicineStock.php,app/Models/StockMovement.php,app/Models/PrescriptionAudit.php'
---

# Models

## Serialize pharmacy stock and retain audit history

Prescription processing, dispensing, cancellation, and stock adjustments use transactions and lockForUpdate. Dispensing validates all stock before any decrement; stock movements and prescription audits are append-only, and prescriptions are cancelled by status plus reason rather than deleted.
