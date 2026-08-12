export type InquiryStatus = 'new' | 'follow_up' | 'tentative' | 'hold' | 'confirmed' | 'lost';
export type BookingStatus = 'hold' | 'confirmed' | 'completed' | 'cancelled';
export type PaymentStatus = 'verified' | 'pending';
export type TaskStatus = 'pending' | 'confirmed' | 'done';

export interface VenueSettings {
  workspaceName: string;
  displayName: string;
  legalName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  currency: string;
  currencySymbol: string;
  timezone: string;
  defaultBaseRate: number;
  advancePercent: number;
  holdMinutes: number;
  ownerReportTime: string;
  accent: string;
  initials: string;
}

export interface Hall {
  id: string;
  name: string;
  minCapacity: number;
  maxCapacity: number;
  active: boolean;
}

export interface Inquiry {
  id: string;
  code: string;
  customerName: string;
  phone: string;
  eventDate: string;
  shift: string;
  eventType: string;
  guests: number;
  budget: number;
  source: string;
  status: InquiryStatus;
  notes: string;
  nextFollowUp: string;
  createdAt: string;
  updatedAt: string;
}

export interface BookingMenuSelection {
  itemId: string;
  name: string;
  category: string;
  priceDelta: number;
}

export interface Booking {
  id: string;
  code: string;
  inquiryId?: string;
  customerName: string;
  phone: string;
  eventDate: string;
  shift: string;
  hallId: string;
  eventType: string;
  guests: number;
  status: BookingStatus;
  holdExpiresAt?: string;
  baseRate: number;
  stageName: string;
  stageCost: number;
  otherCharges: number;
  discount: number;
  menuSelections: BookingMenuSelection[];
  perHeadRate: number;
  totalAmount: number;
  notes: string;
  specialInstructions: string;
  arrivalTime: string;
  dinnerTime: string;
  finalized: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  bookingId: string;
  amount: number;
  method: string;
  reference: string;
  status: PaymentStatus;
  paidAt: string;
  notes: string;
  createdAt: string;
}

export interface MenuItem {
  id: string;
  name: string;
  category: string;
  priceDelta: number;
  active: boolean;
  season: string;
}

export interface Vendor {
  id: string;
  name: string;
  category: string;
  phone: string;
  notes: string;
  active: boolean;
}

export interface VendorTask {
  id: string;
  bookingId: string;
  vendorId: string;
  title: string;
  instructions: string;
  dueAt: string;
  status: TaskStatus;
  createdAt: string;
}

export interface ReadinessItem {
  id: string;
  bookingId: string;
  key: string;
  label: string;
  done: boolean;
  notes: string;
}

export interface AuditLog {
  id: string;
  actor: string;
  action: string;
  entity: string;
  entityId: string;
  message: string;
  createdAt: string;
}

export interface UserRecord {
  id: string;
  name: string;
  username: string;
  role: 'owner' | 'manager' | 'demo';
  passwordSalt: string;
  passwordHash: string;
  mustChangePassword: boolean;
  active?: boolean;
  expiresAt?: string;
  accessLabel?: string;
  createdAt?: string;
}

export interface SessionRecord {
  token: string;
  userId: string;
  expiresAt: string;
}

export interface AutomationSettings {
  enabled: boolean;
  bookingReceipt: boolean;
  paymentReminder: boolean;
  vendorAlert: boolean;
  nightlyOwnerReport: boolean;
  ownerPhone: string;
  whatsappMode: 'link' | 'cloud_api';
  cloudApiPhoneNumberId: string;
  cloudApiToken: string;
}

export interface AutomationLog {
  id: string;
  type: string;
  recipient: string;
  status: 'sent' | 'prepared' | 'failed';
  message: string;
  createdAt: string;
}

export interface AppData {
  settings: VenueSettings;
  halls: Hall[];
  inquiries: Inquiry[];
  bookings: Booking[];
  payments: Payment[];
  menuItems: MenuItem[];
  vendors: Vendor[];
  vendorTasks: VendorTask[];
  readiness: ReadinessItem[];
  auditLogs: AuditLog[];
  users: UserRecord[];
  sessions: SessionRecord[];
  automations: AutomationSettings;
  automationLogs: AutomationLog[];
  meta: { version: number; createdAt: string; updatedAt: string };
}
