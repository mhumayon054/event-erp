import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { AppData, AuditLog, Booking, ReadinessItem, UserRecord } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'eventflow.json');
let writeQueue: Promise<void> = Promise.resolve();

function id(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
}

export function hashPassword(password: string, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

function defaultData(): AppData {
  const now = new Date().toISOString();
  const pass = hashPassword('admin123');
  return {
    settings: {
      workspaceName: 'EventFlow',
      displayName: 'Marquee Operations',
      legalName: 'Your Marquee Name',
      phone: '+92 300 0000000',
      email: 'info@example.com',
      address: 'Main Boulevard',
      city: 'Lahore',
      currency: 'PKR',
      currencySymbol: 'PKR',
      timezone: 'Asia/Karachi',
      defaultBaseRate: 3000,
      advancePercent: 20,
      holdMinutes: 120,
      ownerReportTime: '23:00',
      accent: '#2563eb',
      initials: 'EF'
    },
    halls: [
      { id: 'hall_a', name: 'Grand Hall', minCapacity: 250, maxCapacity: 500, active: true },
      { id: 'hall_b', name: 'Crystal Hall', minCapacity: 100, maxCapacity: 250, active: true }
    ],
    inquiries: [],
    bookings: [],
    payments: [],
    menuItems: [
      { id: 'menu_1', name: 'Chicken Qorma', category: 'Main Course', priceDelta: 0, active: true, season: 'All year' },
      { id: 'menu_2', name: 'Chicken Pulao', category: 'Rice', priceDelta: 0, active: true, season: 'All year' },
      { id: 'menu_3', name: 'Naan', category: 'Bread', priceDelta: 0, active: true, season: 'All year' },
      { id: 'menu_4', name: 'Fresh Salad', category: 'Sides', priceDelta: 0, active: true, season: 'All year' },
      { id: 'menu_5', name: 'Ice Cream', category: 'Dessert', priceDelta: 150, active: true, season: 'Summer' },
      { id: 'menu_6', name: 'Gajar Halwa', category: 'Dessert', priceDelta: 120, active: true, season: 'Winter' }
    ],
    vendors: [
      { id: 'vendor_1', name: 'House Decor Team', category: 'Decorator', phone: '+92 300 1111111', notes: 'In-house stage and floral setup', active: true },
      { id: 'vendor_2', name: 'Kitchen Operations', category: 'Caterer', phone: '+92 300 2222222', notes: 'Internal kitchen lead', active: true },
      { id: 'vendor_3', name: 'Sound & Lights', category: 'Sound', phone: '+92 300 3333333', notes: 'Audio, mics and event lighting', active: true }
    ],
    vendorTasks: [],
    readiness: [],
    auditLogs: [],
    users: [{
      id: 'user_owner', name: 'Owner', username: 'admin', role: 'owner',
      passwordSalt: pass.salt, passwordHash: pass.hash, mustChangePassword: true, active: true, createdAt: now
    }],
    sessions: [],
    automations: {
      enabled: true,
      bookingReceipt: true,
      paymentReminder: true,
      vendorAlert: true,
      nightlyOwnerReport: true,
      ownerPhone: '+92 300 0000000',
      whatsappMode: 'link',
      cloudApiPhoneNumberId: '',
      cloudApiToken: ''
    },
    automationLogs: [],
    meta: { version: 1, createdAt: now, updatedAt: now }
  };
}

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify(defaultData(), null, 2));
}

export function readData(): AppData {
  ensureFile();
  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  const data = JSON.parse(raw) as AppData;
  if (!data.settings.displayName) data.settings.displayName = data.settings.legalName || data.settings.workspaceName || 'Marquee Operations';
  for (const user of data.users) { if (user.active === undefined) user.active = true; }
  cleanupExpiredHolds(data);
  cleanupSessions(data);
  return data;
}

function writeDataSync(data: AppData) {
  data.meta.updatedAt = new Date().toISOString();
  const temp = `${DATA_FILE}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(data, null, 2));
  fs.renameSync(temp, DATA_FILE);
}

export async function mutateData<T>(mutator: (data: AppData) => T | Promise<T>): Promise<T> {
  let result!: T;
  writeQueue = writeQueue.catch(() => undefined).then(async () => {
    const data = readData();
    result = await mutator(data);
    writeDataSync(data);
  });
  await writeQueue;
  return result;
}

function cleanupExpiredHolds(data: AppData) {
  const now = Date.now();
  let changed = false;
  for (const booking of data.bookings) {
    if (booking.status === 'hold' && booking.holdExpiresAt && new Date(booking.holdExpiresAt).getTime() <= now) {
      booking.status = 'cancelled';
      booking.notes = `${booking.notes}${booking.notes ? '\n' : ''}Temporary hold expired automatically.`;
      changed = true;
    }
  }
  if (changed) {
    try { writeDataSync(data); } catch { /* ignore read-time cleanup write failure */ }
  }
}

function cleanupSessions(data: AppData) {
  const now = Date.now();
  data.sessions = data.sessions.filter((session) => {
    if (new Date(session.expiresAt).getTime() <= now) return false;
    const user = data.users.find((u) => u.id === session.userId);
    if (!user || user.active === false) return false;
    if (user.expiresAt && new Date(user.expiresAt).getTime() <= now) return false;
    return true;
  });
}

export function createAudit(data: AppData, actor: string, action: string, entity: string, entityId: string, message: string) {
  const log: AuditLog = { id: id('audit'), actor, action, entity, entityId, message, createdAt: new Date().toISOString() };
  data.auditLogs.unshift(log);
  data.auditLogs = data.auditLogs.slice(0, 1000);
  return log;
}

export function createReadinessForBooking(data: AppData, booking: Booking) {
  const defaults = [
    ['payment', 'Payment clearance'],
    ['menu', 'Menu finalized'],
    ['stage', 'Stage / decor confirmed'],
    ['caterer', 'Kitchen brief confirmed'],
    ['sound', 'Sound & lighting confirmed'],
    ['function_sheet', 'Final function sheet ready']
  ];
  for (const [key, label] of defaults) {
    if (!data.readiness.some((item) => item.bookingId === booking.id && item.key === key)) {
      const item: ReadinessItem = { id: id('ready'), bookingId: booking.id, key, label, done: key === 'menu', notes: '' };
      data.readiness.push(item);
    }
  }
}

export function nextCode(prefix: string, rows: { code: string }[]) {
  const year = new Date().getFullYear();
  const numbers = rows
    .filter((r) => r.code.startsWith(`${prefix}-${year}-`))
    .map((r) => Number(r.code.split('-').pop()) || 0);
  return `${prefix}-${year}-${String(Math.max(0, ...numbers) + 1).padStart(4, '0')}`;
}

export function makeId(prefix: string) { return id(prefix); }

export function verifyPassword(user: UserRecord, password: string) {
  const hash = crypto.scryptSync(password, user.passwordSalt, 64).toString('hex');
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(user.passwordHash, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function getDataFilePath() { return DATA_FILE; }
