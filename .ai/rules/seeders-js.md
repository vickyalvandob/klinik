---
paths:
    - 'app/Support/**,app/Http/**,database/seeders/**,resources/js/**'
---

# Seeders Js

## Separate operational module access and keep demo reseeding repeatable

Registration lists/tickets require registration.view plus encounter.view; queues and signed-monitor issuance require queue.view plus encounter.view, with encounter.update still required for calls. Keep menu visibility permission-based, including clinic overrides and additive grants. Default cashier and pharmacy roles do not browse patient or encounter lists. Demo seeding may reset only the designated demo clinic role/membership permissions; preserve other clinics, existing visit progress, financial/audit rows, stock, and sequence counters. Create new demo visits through the operational actions and restore prior tenant/clinic context.
