---
paths:
  - 'app/Models/ClinicMembership.php,app/Models/ClinicRole.php,app/Actions/EnsureClinicRoles.php'
---

# Actions

## Keep effective role permissions clinic scoped
Global roles are immutable presets. Effective role permissions come from clinic_roles for the current clinic, while membership permissions are additive. Owner/Admin must always retain the complete permission catalog.
