---
paths:
    - 'app/Http/Controllers/BillingController.php,app/Services/ClinicReport.php,app/Http/Controllers/ReportController.php,resources/js/pages/billing/**,resources/js/pages/reports/**,resources/js/components/payment-form.tsx'
---

# Js Components

## Separate cashier worklists from management reporting

Billing index contains invoice worklists only; payment reconciliation belongs in reports. Keep list, summary, and selected report rows in closures so partial requests skip unused queries. Reports must authorize each selected/exported category and use clinic-local day bounds converted to app.timezone, matching timestamp storage. Invoice reports filter issued_at and clearly label balances as current, not period-end snapshots. Payment forms keep the same idempotency token on failed retries and reset balance and token only after a confirmed successful response.
