import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type { AppData, AuditLog, Booking, BookingMenuSelection, Inquiry, Payment, ReadinessItem, UserRecord, VendorTask } from './types';

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'eventflow.json');
const REDIS_STATE_KEY = process.env.EVENTFLOW_STATE_KEY || 'eventflow:state:v1';
const REDIS_VERSION_KEY = `${REDIS_STATE_KEY}:version`;
const REDIS_LOCK_KEY = `${REDIS_STATE_KEY}:lock`;
let writeQueue: Promise<void> = Promise.resolve();

function redisConfig() {
  const url = (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || '').replace(/\/$/, '');
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || '';
  return url && token ? { url, token } : null;
}

async function redisCommand<T = unknown>(command: Array<string | number>) {
  const config = redisConfig();
  if (!config) throw new Error('Cloud data store is not configured.');
  const response = await fetch(config.url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(command),
    cache: 'no-store'
  });
  const payload = await response.json().catch(() => ({})) as { result?: T; error?: string };
  if (!response.ok || payload.error) throw new Error(payload.error || `Cloud data store request failed (${response.status}).`);
  return payload.result as T;
}

function id(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`;
}

export function hashPassword(password: string, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

function dateKey(base: Date, plusDays: number) {
  return new Date(base.getTime() + plusDays * 86400000).toISOString().slice(0, 10);
}

function baseData(): AppData {
  const now = new Date().toISOString();
  const pass = hashPassword('admin123');
  return {
    settings: {
      workspaceName: 'EventFlow',
      displayName: 'Your Marquee Name',
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
      { id: 'menu_6', name: 'Gajar Halwa', category: 'Dessert', priceDelta: 120, active: true, season: 'Winter' },
      { id: 'menu_7', name: 'Mint Margarita', category: 'Beverage', priceDelta: 90, active: true, season: 'All year' },
      { id: 'menu_8', name: 'BBQ Platter', category: 'Add-on', priceDelta: 350, active: true, season: 'All year' }
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
    meta: { version: 2, createdAt: now, updatedAt: now }
  };
}

function bookingFromDemo(data: AppData, input: {
  customerName: string; phone: string; eventDate: string; shift?: string; hallId: string; eventType: string;
  guests: number; status: Booking['status']; stageName: string; stageCost: number; extras?: string[]; discount?: number;
  notes?: string; specialInstructions?: string; finalized?: boolean; holdExpiresAt?: string;
}) {
  const selectedIds = ['menu_1', 'menu_2', 'menu_3', 'menu_4', ...(input.extras || [])];
  const selections: BookingMenuSelection[] = selectedIds
    .map((menuId) => data.menuItems.find((m) => m.id === menuId))
    .filter(Boolean)
    .map((m) => ({ itemId: m!.id, name: m!.name, category: m!.category, priceDelta: m!.priceDelta }));
  const baseRate = data.settings.defaultBaseRate;
  const perHeadRate = baseRate + selections.reduce((sum, item) => sum + item.priceDelta, 0);
  const discount = input.discount || 0;
  const createdAt = new Date().toISOString();
  const booking: Booking = {
    id: id('book'),
    code: nextCode('BK', data.bookings),
    customerName: input.customerName,
    phone: input.phone,
    eventDate: input.eventDate,
    shift: input.shift || 'Evening',
    hallId: input.hallId,
    eventType: input.eventType,
    guests: input.guests,
    status: input.status,
    holdExpiresAt: input.holdExpiresAt,
    baseRate,
    stageName: input.stageName,
    stageCost: input.stageCost,
    otherCharges: 0,
    discount,
    menuSelections: selections,
    perHeadRate,
    totalAmount: Math.max(0, input.guests * perHeadRate + input.stageCost - discount),
    notes: input.notes || '',
    specialInstructions: input.specialInstructions || 'VIP family table near stage. Keep service aisle clear.',
    arrivalTime: '18:30',
    dinnerTime: '21:00',
    finalized: input.finalized || false,
    createdAt,
    updatedAt: createdAt
  };
  data.bookings.push(booking);
  createReadinessForBooking(data, booking);
  return booking;
}

function addPayment(data: AppData, booking: Booking, amount: number, method: string, reference: string, paidAt: string, notes: string) {
  const payment: Payment = {
    id: id('pay'), bookingId: booking.id, amount, method, reference,
    status: 'verified', paidAt, notes, createdAt: new Date().toISOString()
  };
  data.payments.push(payment);
  return payment;
}

function setReadiness(data: AppData, bookingId: string, doneKeys: string[]) {
  for (const item of data.readiness.filter((r) => r.bookingId === bookingId)) item.done = doneKeys.includes(item.key);
}

export function seedOperationalDemoData(data: AppData, actor = 'System') {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const activeHalls = data.halls.filter((h) => h.active);
  const hallA = activeHalls[0] || data.halls[0];
  if (!hallA) throw new Error('Add at least one hall before loading demo data.');
  const hallB = activeHalls[1] || hallA;

  data.inquiries = [];
  data.bookings = [];
  data.payments = [];
  data.vendorTasks = [];
  data.readiness = [];
  data.automationLogs = [];
  data.auditLogs = [];

  const inquiryRows: Array<Omit<Inquiry, 'id' | 'code' | 'createdAt' | 'updatedAt'>> = [
    { customerName: 'Hamza Khan', phone: '+92 300 5551234', eventDate: dateKey(now, 18), shift: 'Evening', eventType: 'Walima', guests: 320, budget: 1150000, source: 'WhatsApp', status: 'follow_up', notes: 'Family will confirm stage package after tonight.', nextFollowUp: dateKey(now, 1) },
    { customerName: 'Ayesha Malik', phone: '+92 321 7772233', eventDate: dateKey(now, 24), shift: 'Night', eventType: 'Wedding', guests: 450, budget: 1700000, source: 'Walk-in', status: 'tentative', notes: 'Strong lead. Waiting for elder approval and advance.', nextFollowUp: dateKey(now, 2) },
    { customerName: 'Bilal Ahmed', phone: '+92 333 4219081', eventDate: dateKey(now, 11), shift: 'Morning', eventType: 'Engagement', guests: 180, budget: 650000, source: 'Facebook', status: 'new', notes: 'Asked for menu and Crystal Hall availability.', nextFollowUp: today },
    { customerName: 'Sana Tariq', phone: '+92 304 8885160', eventDate: dateKey(now, 31), shift: 'Evening', eventType: 'Mehndi', guests: 260, budget: 980000, source: 'Referral', status: 'follow_up', notes: 'Quotation sent. Wants decor photos before deciding.', nextFollowUp: dateKey(now, 3) },
    { customerName: 'Zain Ali', phone: '+92 312 6100031', eventDate: dateKey(now, 16), shift: 'Evening', eventType: 'Walima', guests: 300, budget: 900000, source: 'Walk-in', status: 'lost', notes: 'Selected another venue because preferred date was unavailable.', nextFollowUp: '' }
  ];
  for (const row of inquiryRows) {
    const createdAt = new Date().toISOString();
    data.inquiries.push({ id: id('inq'), code: nextCode('INQ', data.inquiries), ...row, createdAt, updatedAt: createdAt });
  }

  const b1 = bookingFromDemo(data, { customerName: 'Umer Farooq', phone: '+92 310 1450645', eventDate: dateKey(now, 2), hallId: hallA.id, eventType: 'Wedding', guests: Math.min(420, hallA.maxCapacity), status: 'confirmed', stageName: 'Classic Ivory', stageCost: 90000, extras: ['menu_5'], finalized: true, specialInstructions: 'Bride family arrival 6:45 PM. Reserve 2 VIP tables near stage.' });
  const b2 = bookingFromDemo(data, { customerName: 'Usman Shah', phone: '+92 302 3334455', eventDate: dateKey(now, 5), hallId: hallB.id, eventType: 'Walima', guests: Math.min(210, hallB.maxCapacity), status: 'confirmed', stageName: 'Emerald Floral', stageCost: 65000, extras: ['menu_7'], specialInstructions: 'Groom family tea service at 7:00 PM. Dinner 9:15 PM.' });
  const b3 = bookingFromDemo(data, { customerName: 'Saad Qureshi', phone: '+92 322 9001122', eventDate: dateKey(now, 9), hallId: hallA.id, eventType: 'Wedding', guests: Math.min(360, hallA.maxCapacity), status: 'hold', stageName: 'Champagne Gold', stageCost: 80000, extras: ['menu_5'], holdExpiresAt: new Date(now.getTime() + 7 * 24 * 3600000).toISOString(), notes: 'Temporary hold while family confirms advance.' });
  const b4 = bookingFromDemo(data, { customerName: 'Hassan Raza', phone: '+92 301 8080505', eventDate: dateKey(now, 14), hallId: hallA.id, eventType: 'Walima', guests: Math.min(470, hallA.maxCapacity), status: 'confirmed', stageName: 'Royal White', stageCost: 110000, extras: ['menu_7', 'menu_8'], discount: 25000, specialInstructions: 'Separate family entrance. Additional water service at guest tables.' });
  const b5 = bookingFromDemo(data, { customerName: 'Maha & Daniyal', phone: '+92 305 6602200', eventDate: dateKey(now, -11), hallId: hallB.id, eventType: 'Engagement', guests: Math.min(190, hallB.maxCapacity), status: 'completed', stageName: 'Pastel Garden', stageCost: 70000, extras: ['menu_5'], finalized: true, specialInstructions: 'Completed demo event.' });
  const b6 = bookingFromDemo(data, { customerName: 'Fahad Iqbal', phone: '+92 300 4547070', eventDate: dateKey(now, -38), hallId: hallA.id, eventType: 'Wedding', guests: Math.min(390, hallA.maxCapacity), status: 'completed', stageName: 'Classic Gold', stageCost: 85000, extras: ['menu_7'], finalized: true, specialInstructions: 'Completed demo event.' });

  addPayment(data, b1, Math.min(850000, b1.totalAmount), 'Bank Transfer', 'TXN-84521', today, 'Advance + second installment received');
  addPayment(data, b2, Math.min(250000, b2.totalAmount), 'Cash', 'REC-10022', today, 'Advance received');
  addPayment(data, b4, Math.min(400000, b4.totalAmount), 'Bank Transfer', 'TXN-84544', dateKey(now, -1), 'Advance received');
  addPayment(data, b5, b5.totalAmount, 'Bank Transfer', 'TXN-82091', dateKey(now, -12), 'Full and final settlement');
  addPayment(data, b6, b6.totalAmount, 'Cash', 'REC-98221', dateKey(now, -39), 'Full and final settlement');

  setReadiness(data, b1.id, ['payment', 'menu', 'stage', 'caterer', 'sound', 'function_sheet']);
  setReadiness(data, b2.id, ['menu', 'stage', 'caterer']);
  setReadiness(data, b4.id, ['menu', 'stage']);
  setReadiness(data, b5.id, ['payment', 'menu', 'stage', 'caterer', 'sound', 'function_sheet']);
  setReadiness(data, b6.id, ['payment', 'menu', 'stage', 'caterer', 'sound', 'function_sheet']);

  const taskRows: Array<Omit<VendorTask, 'id' | 'createdAt'>> = [
    { bookingId: b1.id, vendorId: 'vendor_1', title: 'Stage & floral setup', instructions: 'Classic Ivory stage. Complete setup by 5:30 PM.', dueAt: `${b1.eventDate}T17:30`, status: 'confirmed' },
    { bookingId: b1.id, vendorId: 'vendor_2', title: 'Kitchen production', instructions: `Prepare final menu for ${b1.guests} guests. Dinner service at 9:00 PM.`, dueAt: `${b1.eventDate}T20:30`, status: 'confirmed' },
    { bookingId: b1.id, vendorId: 'vendor_3', title: 'Sound & lighting', instructions: '2 wireless microphones, entrance lighting and stage wash.', dueAt: `${b1.eventDate}T18:00`, status: 'done' },
    { bookingId: b2.id, vendorId: 'vendor_1', title: 'Emerald decor setup', instructions: 'Emerald Floral stage. Keep photo wall near entrance.', dueAt: `${b2.eventDate}T17:00`, status: 'pending' },
    { bookingId: b2.id, vendorId: 'vendor_2', title: 'Kitchen brief', instructions: `Final headcount ${b2.guests}. Tea at 7:00 PM, dinner at 9:15 PM.`, dueAt: `${b2.eventDate}T19:00`, status: 'confirmed' }
  ];
  for (const row of taskRows) data.vendorTasks.push({ id: id('task'), createdAt: new Date().toISOString(), ...row });

  data.automationLogs.push(
    { id: id('auto'), type: 'booking_receipt', recipient: b1.phone, status: 'prepared', message: `${b1.code} booking confirmation prepared for ${b1.customerName}.`, createdAt: new Date(now.getTime() - 2 * 3600000).toISOString() },
    { id: id('auto'), type: 'payment_reminder', recipient: b2.phone, status: 'prepared', message: `${b2.code} outstanding balance reminder prepared.`, createdAt: new Date(now.getTime() - 3600000).toISOString() }
  );

  createAudit(data, actor, 'Loaded', 'Demo workspace', 'operations', 'Demo records refreshed for bookings, inquiries, payments, vendors and readiness.');
  createAudit(data, 'Manager', 'Updated', 'Booking', b2.id, `${b2.code} menu and stage details confirmed.`);
  createAudit(data, 'Manager', 'Recorded', 'Payment', b1.id, `${b1.code} payment received and balance updated.`);
  createAudit(data, 'Owner', 'Finalized', 'Booking', b1.id, `${b1.code} event instructions finalized.`);

  return { bookings: data.bookings.length, inquiries: data.inquiries.length, payments: data.payments.length, tasks: data.vendorTasks.length };
}

function defaultData(): AppData {
  const data = baseData();
  seedOperationalDemoData(data, 'System');
  return data;
}

function ensureFile() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify(defaultData(), null, 2));
}

function normalizeData(data: AppData) {
  if (!data.settings.displayName) data.settings.displayName = data.settings.legalName || data.settings.workspaceName || 'Marquee Operations';
  for (const user of data.users) if (user.active === undefined) user.active = true;
  cleanupExpiredHolds(data);
  cleanupSessions(data);
  return data;
}

async function ensureRemoteState() {
  let raw = await redisCommand<string | null>(['GET', REDIS_STATE_KEY]);
  if (raw) return raw;
  const seeded = JSON.stringify(defaultData());
  await redisCommand(['SETNX', REDIS_STATE_KEY, seeded]);
  await redisCommand(['SETNX', REDIS_VERSION_KEY, '1']);
  raw = await redisCommand<string | null>(['GET', REDIS_STATE_KEY]);
  if (!raw) throw new Error('Cloud data store could not initialize EventFlow state.');
  return raw;
}

async function acquireRemoteLock() {
  const token = crypto.randomBytes(18).toString('hex');
  for (let attempt = 0; attempt < 100; attempt += 1) {
    const result = await redisCommand<string | null>(['SET', REDIS_LOCK_KEY, token, 'NX', 'PX', '30000']);
    if (result === 'OK') return token;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('The workspace is busy. Please retry in a moment.');
}

async function releaseRemoteLock(token: string) {
  const script = "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) else return 0 end";
  try { await redisCommand(['EVAL', script, '1', REDIS_LOCK_KEY, token]); } catch { /* lock expires automatically */ }
}

export async function readData(): Promise<AppData> {
  if (redisConfig()) {
    const raw = await ensureRemoteState();
    return normalizeData(JSON.parse(raw) as AppData);
  }
  ensureFile();
  const raw = fs.readFileSync(DATA_FILE, 'utf8');
  return normalizeData(JSON.parse(raw) as AppData);
}

function writeDataSync(data: AppData) {
  data.meta.updatedAt = new Date().toISOString();
  const temp = `${DATA_FILE}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(data, null, 2));
  fs.renameSync(temp, DATA_FILE);
}

export async function mutateData<T>(mutator: (data: AppData) => T | Promise<T>): Promise<T> {
  if (redisConfig()) {
    const lockToken = await acquireRemoteLock();
    try {
      const raw = await ensureRemoteState();
      const data = normalizeData(JSON.parse(raw) as AppData);
      const result = await mutator(data);
      data.meta.updatedAt = new Date().toISOString();
      await redisCommand(['SET', REDIS_STATE_KEY, JSON.stringify(data)]);
      await redisCommand(['INCR', REDIS_VERSION_KEY]);
      return result;
    } finally {
      await releaseRemoteLock(lockToken);
    }
  }

  let result!: T;
  writeQueue = writeQueue.catch(() => undefined).then(async () => {
    const data = await readData();
    result = await mutator(data);
    writeDataSync(data);
  });
  await writeQueue;
  return result;
}

function cleanupExpiredHolds(data: AppData) {
  const now = Date.now();
  for (const booking of data.bookings) {
    if (booking.status === 'hold' && booking.holdExpiresAt && new Date(booking.holdExpiresAt).getTime() <= now) {
      booking.status = 'cancelled';
      booking.notes = `${booking.notes}${booking.notes ? '\n' : ''}Temporary hold expired automatically.`;
    }
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
export function usingCloudStore() { return Boolean(redisConfig()); }
