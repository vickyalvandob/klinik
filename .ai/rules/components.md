---
paths:
    - 'resources/js/pages/registrations/**,resources/js/components/registration-form.tsx'
---

# Components

## Keep registration focused on the visit table

Pendaftaran opens with the visit list and a compact summary. Open registration through Daftarkan pasien: a right-hand panel beside the table at desktop widths and a Sheet on smaller screens, never a form above the table. Keep form state when closing/reopening or resizing, preserve patient search keyboard/error states and permission checks, and put secondary visit actions in the row menu.
