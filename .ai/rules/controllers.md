---
paths:
  - app/Http/Controllers/OnboardingController.php
---

# Controllers

## Serialize clinic onboarding transitions
Onboarding steps are sequential server-side state transitions. Lock the current clinic row inside a database transaction before validating a step, creating related master data, or marking onboarding complete.
