const quantityFormatter = new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 2,
});

export function formatQuantity(value: string | number) {
    return quantityFormatter.format(Number(value));
}

export function pharmacyDateFormatter(timeZone: string) {
    const formatter = new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone,
    });
    return (value: string | null) =>
        value ? formatter.format(new Date(value)) : '—';
}
