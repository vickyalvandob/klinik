const currencyFormatter = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
});
const quantityFormatter = new Intl.NumberFormat('id-ID', {
    maximumFractionDigits: 3,
});
const dateFormatter = new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' });
const dateTimeFormatter = new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
});

export const formatCurrency = (value: number) =>
    currencyFormatter.format(value);
export const formatQuantity = (value: string) =>
    quantityFormatter.format(Number(value));
export const formatDate = (value: string) =>
    dateFormatter.format(new Date(value + 'T00:00:00'));
export const formatDateTime = (value: string) =>
    dateTimeFormatter.format(new Date(value));
export const invoiceTone = (status: string) =>
    status === 'paid'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300'
        : status === 'issued' || status === 'partially_paid'
          ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300'
          : 'text-muted-foreground';
