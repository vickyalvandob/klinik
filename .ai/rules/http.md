---
paths:
    - 'app/Models/**,app/Http/**,routes/**'
---

# Http

## Resolve tenant context before binding

Tenant-owned models must use BelongsToTenant and fail closed without CurrentTenant. ResolveClinicContext must run before SubstituteBindings. Platform Admin is a separate control-plane flag and never bypasses clinic membership or clinical authorization.
