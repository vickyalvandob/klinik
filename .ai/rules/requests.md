---
paths:
    - 'app/Http/Controllers/ClinicUserController.php,app/Http/Requests/UpdateClinicUserRequest.php'
---

# Requests

## Preserve additional grants when the editor cannot manage roles

Only sync membership permissions when the actor has roles.manage and the validated permissions key is present. An omitted key preserves existing grants; an authorized explicit [] clears them. Laravel prohibited validation accepts empty arrays, so checking the presence of the key alone does not protect existing grants.
