---
paths:
    - 'app/Actions/**,app/Policies/**,app/Support/**,app/Http/**,resources/js/**'
---

# Support Http Js

## Owner clinical access and flexible payments

User decision 2026-09-06 supersedes prior read-only owner and full-payment-only rules: active Owner/Admin may start, save, finalize and amend clinical records in the current clinic without a practitioner link. Preserve the assigned practitioner and record the actual user as actor. Support partial payments and atomic mixed-method payments independently of legacy workflow settings. No UI or runtime configuration for service flow; keep legacy stored rows only for compatibility.
