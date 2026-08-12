# EventFlow — Marquee Operations System

A lightweight, single-tenant operations workspace for marquees, banquet halls and event venues. It is designed around real daily marquee workflows: inquiries, date/shift booking, capacity rules, menu pricing, advances, balances, vendor tasks, event-readiness checklists, function sheets, quotations/receipts, audit history and trigger-based WhatsApp messaging.

## Quick start

Requirements: Node.js 20+ and npm.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

First-run login:

- Username: `admin`
- Password: `admin123`

Change the password from **Settings → Account Security** before production use.

## White-label setup for a new marquee

Open **Settings** and configure:

- Marquee display name and venue/legal invoice name
- Initials and accent color
- Phone, email, address and city
- Currency
- Default per-head rate
- Suggested advance percentage
- Temporary booking-hold duration
- Timezone and owner report time
- Hall sections with min/max capacity

No source-code change is required for normal venue configuration.

## Main modules

- Dashboard / owner command center
- Booking calendar with Confirmed / Hold / Completed states
- Booking creation with hall-capacity validation and conflict prevention
- Inquiry follow-up pipeline
- Menu catalog and per-head add-on pricing
- Advance/installment payment ledger
- Quotes and payment receipt PDF generation
- Booking edit history via audit log
- Event-readiness checklist and finalization lock
- Vendors and event-specific task instructions
- Final Function Sheet with PDF export
- WhatsApp booking receipts, vendor alerts and payment reminders
- Owner reports and 6-month collection view
- Full audit history
- White-label settings and password security
- Temporary demo accounts with expiry and one-click revocation
- Fully custom in-app dropdown, date, time and color controls


## Temporary demo access

Owner accounts can create time-limited demo credentials from **Settings → Temporary Demo Access**. Choose a client/marquee label and 24 hours, 3 days, 7 days or 14 days. The generated password is shown once. Demo accounts can test operational workflows but cannot open venue/security settings or change WhatsApp API configuration. Access automatically expires and can be revoked immediately by the owner. For prospective clients, use a dedicated demo installation/workspace because a demo user can view the operational records stored in the workspace they are invited to.

The public login page does not expose the default owner credentials.

## Data storage

This build intentionally uses a small server-side JSON data store at:

`data/eventflow.json`

Writes are serialized and saved atomically (temporary file + rename). This keeps the deployment extremely lightweight and makes each marquee installation portable.

Recommended deployment model for this version: **one Node/VPS instance per marquee**. Do not run multiple horizontally-scaled app instances against the same local JSON file. If you later want one central multi-tenant SaaS, migrate the storage layer to PostgreSQL while keeping the UI/workflow layer.

**Important:** do not use the local JSON storage build as a stateful Vercel/serverless deployment. Serverless filesystems are not durable application databases. For a remote demo, use a small Node/VPS instance with this build, or migrate the storage adapter to PostgreSQL before deploying on a serverless platform.

## Backups

Create a timestamped backup:

```bash
npm run backup
```

Backups are written to `backups/`.

For production, schedule this command daily and also copy the backup folder to an external storage location.

## WhatsApp modes

### 1. WhatsApp Link mode

No API credentials required. EventFlow opens WhatsApp with the exact message pre-filled for one-click sending. This mode is ideal for demos and initial client deployments.

### 2. Meta WhatsApp Cloud API mode

Configure Phone Number ID and access token in **WhatsApp Automation**. Direct API sending is implemented server-side. Production outbound reminders may require Meta-approved message templates depending on the WhatsApp conversation window and account configuration.

## Scheduled reminders / nightly owner report

Copy `.env.example` to `.env.local` and set a strong secret:

```env
CRON_SECRET=replace-with-a-long-random-secret
EVENTFLOW_URL=http://127.0.0.1:3000
```

With the production server running, execute:

```bash
npm run cron:run
```

On Linux/VPS, schedule it hourly with cron. Example:

```cron
0 * * * * cd /var/www/eventflow && /usr/bin/npm run cron:run >> /var/log/eventflow-cron.log 2>&1
```

The runner:

- prepares/sends payment reminders for events exactly 3 days away when a balance is outstanding;
- sends/prepares one owner daily report during the configured owner-report hour;
- prevents duplicate daily messages through the automation log.

## Production run

```bash
npm install
npm run build
npm start
```

A process manager such as PM2/systemd is recommended on a VPS.

## QA

Static project QA:

```bash
npm run qa
```

Before delivery to a real venue, also run:

1. `npm run build`
2. Create a hold and verify the same hall/date/shift cannot be booked again.
3. Create a confirmed booking with an advance and verify the receipt shows the correct advance/balance.
4. Edit guests/menu/stage and confirm the Audit History records the change.
5. Record another payment and verify the balance updates.
6. Assign a vendor task and test the WhatsApp workflow.
7. Complete the readiness checklist, finalize the event, and export the Function Sheet PDF.
8. Generate a quotation and payment receipt PDF.
9. Test desktop sidebar collapse plus tablet/mobile layout.
10. Change marquee display name/accent in Settings and verify header + login rebrand.
11. Create a 24-hour demo account, sign in with it, verify Settings is hidden, then revoke it and confirm login is rejected.
12. Verify all dropdown/date/time controls use the custom EventFlow UI rather than native browser menus.

## Important architecture note

This project is intentionally **single-tenant and lightweight**, matching the plan of deploying/configuring it separately for each marquee and charging setup + monthly managed support. For a future centralized SaaS with many marquees inside one deployment, the next architecture step should be PostgreSQL + tenant IDs + object storage + centrally managed WhatsApp credentials.
