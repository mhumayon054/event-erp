import type { AppData } from './types';
import { makeId } from './store';
import { money } from './format';

function waLink(phone: string, message: string) {
  const digits = phone.replace(/[^0-9]/g, '');
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function bookingReceiptMessage(data: AppData, bookingId: string) {
  const booking = data.bookings.find((b) => b.id === bookingId);
  if (!booking) return '';
  const paid = data.payments.filter((p) => p.bookingId === bookingId && p.status === 'verified').reduce((sum, p) => sum + p.amount, 0);
  const hall = data.halls.find((h) => h.id === booking.hallId)?.name || 'Hall';
  return `Dear ${booking.customerName}, your booking is confirmed.\n\n${booking.eventDate} • ${booking.shift}\n${hall}\nGuests: ${booking.guests}\nTotal: ${money(booking.totalAmount, data.settings.currencySymbol)}\nAdvance Received: ${money(paid, data.settings.currencySymbol)}\nBalance: ${money(Math.max(0, booking.totalAmount - paid), data.settings.currencySymbol)}\n\nThank you for choosing ${data.settings.legalName}.`;
}

export function paymentReminderMessage(data: AppData, bookingId: string) {
  const booking = data.bookings.find((b) => b.id === bookingId);
  if (!booking) return '';
  const paid = data.payments.filter((p) => p.bookingId === bookingId && p.status === 'verified').reduce((sum, p) => sum + p.amount, 0);
  return `Dear ${booking.customerName}, a friendly reminder from ${data.settings.legalName}. Your remaining balance for the event on ${booking.eventDate} is ${money(Math.max(0, booking.totalAmount - paid), data.settings.currencySymbol)}. Thank you.`;
}

export function vendorTaskMessage(data: AppData, taskId: string) {
  const task = data.vendorTasks.find((t) => t.id === taskId);
  if (!task) return '';
  const booking = data.bookings.find((b) => b.id === task.bookingId);
  if (!booking) return '';
  return `${data.settings.legalName} — Event Task\n${booking.eventDate} • ${booking.shift}\n${booking.customerName} • ${booking.guests} guests\n\n${task.title}\n${task.instructions}\n\nPlease confirm receipt.`;
}

export async function deliverMessage(data: AppData, type: string, recipient: string, message: string, options: { forceLink?: boolean } = {}) {
  const log = { id: makeId('wa'), type, recipient, status: 'prepared' as const, message, createdAt: new Date().toISOString() };
  if (!data.automations.enabled || !recipient || !message) {
    data.automationLogs.unshift(log);
    return { status: 'prepared', link: recipient ? waLink(recipient, message) : '' };
  }

  if (!options.forceLink && data.automations.whatsappMode === 'cloud_api' && data.automations.cloudApiPhoneNumberId && data.automations.cloudApiToken) {
    try {
      const response = await fetch(`https://graph.facebook.com/v22.0/${data.automations.cloudApiPhoneNumberId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.automations.cloudApiToken}` },
        body: JSON.stringify({ messaging_product: 'whatsapp', to: recipient.replace(/[^0-9]/g, ''), type: 'text', text: { body: message } })
      });
      if (!response.ok) throw new Error(`WhatsApp API ${response.status}`);
      data.automationLogs.unshift({ ...log, status: 'sent' });
      return { status: 'sent', link: '' };
    } catch {
      data.automationLogs.unshift({ ...log, status: 'failed' });
      return { status: 'failed', link: waLink(recipient, message) };
    }
  }

  data.automationLogs.unshift(log);
  return { status: 'prepared', link: waLink(recipient, message) };
}
