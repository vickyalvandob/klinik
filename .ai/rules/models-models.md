---
paths:
  - 'app/Actions/*Payment.php,app/Actions/*Invoice.php,app/Models/Invoice*.php,app/Models/Payment.php'
---

# Models Models

## Preserve immutable billing history
Generate one invoice per encounter when it enters waiting_payment and snapshot all item descriptions and integer Rupiah prices. Receive and void payments inside transactions with encounter then invoice lock order, retain original rows, append billing audits, and reopen completed encounters when an active payment is voided.
