export function money(value: number, symbol = 'PKR') {
  return `${symbol} ${Math.round(Number(value || 0)).toLocaleString('en-PK')}`;
}

export function shortDate(value: string) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-PK', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${value}T12:00:00`));
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
