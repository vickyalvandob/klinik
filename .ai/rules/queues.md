---
paths:
    - 'app/Actions/CallQueue.php,app/Services/QueueBoard.php,app/Http/Controllers/Queue*.php,app/Http/Middleware/HandleInertiaRequests.php,resources/js/pages/queues/**'
---

# Queues

## Keep queue calls separate from clinical transitions and public monitor data private

Queue calls require current clinic encounter.view and encounter.update permissions, transaction locks, and a request key. Calling or recalling never advances clinical status; completing triage resets the queue to Waiting for the doctor. The public monitor requires an expiring signed URL; every read explicitly scopes tenant and clinic, and no auth, membership, patient identity, or clinical props may be shared with it. Monitor queries keep full waiting counts while limiting upcoming numbers per unit.
