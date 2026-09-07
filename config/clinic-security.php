<?php

return [
    'slow_request_ms' => (int) env('CLINIC_SLOW_REQUEST_MS', 2000),
    'export_per_minute' => (int) env('CLINIC_EXPORT_PER_MINUTE', 5),
    'clinical_reads_per_minute' => (int) env('CLINIC_READS_PER_MINUTE', 120),
    'payments_per_minute' => (int) env('CLINIC_PAYMENTS_PER_MINUTE', 30),
    'backup_retention_days' => (int) env('CLINIC_BACKUP_RETENTION_DAYS', 30),
    'backup_max_age_hours' => (int) env('CLINIC_BACKUP_MAX_AGE_HOURS', 26),
    'mysqldump_binary' => env('CLINIC_MYSQLDUMP_BINARY', 'mysqldump'),
    'mysql_binary' => env('CLINIC_MYSQL_BINARY', 'mysql'),
];
