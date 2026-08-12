export function money(value: number, symbol = 'PKR') {
  return `${symbol} ${Math.round(Number(value || 0)).toLocaleString('en-PK')}`;
}

export function shortDate(value: string) {
  if (!value) return '—';
  // Accept both date-only values (YYYY-MM-DD) and full date-time values.
  // Appending a time to an already-timed value creates an invalid date, so
  // only add a safe midday time for plain ISO date strings.
  const raw = String(value).trim();
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(raw);
  const date = new Date(dateOnly ? `${raw}T12:00:00` : raw);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

export function dateTime(value: string) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-PK', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

export function phoneDigits(phone: string) {
  return phone.replace(/[^0-9]/g, '');
}

export function readinessPercent(total: number, done: number) {
  return total ? Math.round((done / total) * 100) : 0;
}
