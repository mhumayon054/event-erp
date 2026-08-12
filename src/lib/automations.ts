import { mutateData } from './store';
import { deliverMessage, paymentReminderMessage } from './whatsapp';
import { money } from './format';

function zonedNow(timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value || '';
  return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${get('hour')}:${get('minute')}` };
}

function addDays(dateKey: string, days: number) {
  const [y,m,d] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + days));
  return date.toISOString().slice(0, 10);
}

export async function runScheduledAutomations() {
  return mutateData(async (data) => {
    const local = zonedNow(data.settings.timezone || 'Asia/Karachi');
    const todayKey = local.date;
    const reminderDate = addDays(todayKey, 3);
    const results: Array<{ type: string; booking?: string; status: string }> = [];
    if (!data.automations.enabled) return { results, skipped: 'Automations disabled' };

    if (data.automations.paymentReminder) {
      for (const booking of data.bookings.filter((b) => b.status === 'confirmed' && b.eventDate === reminderDate)) {
        const paid = data.payments.filter((p) => p.bookingId === booking.id && p.status === 'verified').reduce((s, p) => s + p.amount, 0);
        if (paid >= booking.totalAmount) continue;
        const duplicate = data.automationLogs.some((l) => l.type === 'payment_reminder' && l.recipient === booking.phone && l.createdAt.slice(0, 10) === new Date().toISOString().slice(0, 10) && l.message.includes(booking.eventDate));
        if (duplicate) continue;
        const sent = await deliverMessage(data, 'payment_reminder', booking.phone, paymentReminderMessage(data, booking.id));
        results.push({ type: 'payment_reminder', booking: booking.code, status: sent.status });
      }
    }

    const reportDue = local.time.slice(0, 2) === (data.settings.ownerReportTime || '23:00').slice(0, 2);
    if (reportDue && data.automations.nightlyOwnerReport && data.automations.ownerPhone) {
      const reportType = 'nightly_owner_report';
      const duplicate = data.automationLogs.some((l) => l.type === reportType && l.message.includes(todayKey));
      if (!duplicate) {
        const todaysPayments = data.payments.filter((p) => p.status === 'verified' && p.paidAt === todayKey).reduce((s, p) => s + p.amount, 0);
        const todaysBookings = data.bookings.filter((b) => b.createdAt.slice(0, 10) === new Date().toISOString().slice(0, 10) && b.status === 'confirmed').length;
        const followUps = data.inquiries.filter((i) => ['new', 'follow_up', 'tentative'].includes(i.status)).length;
        const outstanding = data.bookings.filter((b) => b.status === 'confirmed').reduce((sum, booking) => {
          const paid = data.payments.filter((p) => p.bookingId === booking.id && p.status === 'verified').reduce((s, p) => s + p.amount, 0);
          return sum + Math.max(0, booking.totalAmount - paid);
        }, 0);
        const tomorrow = addDays(todayKey, 1);
        const tomorrowEvents = data.bookings.filter((b) => b.status === 'confirmed' && b.eventDate === tomorrow).length;
        const message = `${data.settings.legalName} — Daily Report\n${todayKey}\n\nConfirmed bookings today: ${todaysBookings}\nCollection today: ${money(todaysPayments, data.settings.currencySymbol)}\nActive follow-ups: ${followUps}\nOutstanding balances: ${money(outstanding, data.settings.currencySymbol)}\nEvents tomorrow: ${tomorrowEvents}`;
        const sent = await deliverMessage(data, reportType, data.automations.ownerPhone, message);
        results.push({ type: reportType, status: sent.status });
      }
    }
    return { results, localTime: `${todayKey} ${local.time}` };
  });
}
