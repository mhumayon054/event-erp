# Vercel Demo Deployment — EventFlow

This build supports two storage modes automatically:

- **Local/VPS:** if no cloud Redis variables exist, data is stored in `data/eventflow.json`.
- **Vercel/serverless:** if Upstash Redis REST variables exist, all workspace data is stored persistently in Redis instead of the Vercel filesystem.

## Recommended remote-demo setup

1. Keep the source repository **private** on GitHub.
2. Import that private repository into Vercel.
3. In the Vercel project, open **Marketplace / Storage** and connect **Upstash for Redis**.
4. Make sure the integration is connected to this EventFlow project. The required REST environment variables are injected by the integration.
5. Redeploy the project after connecting storage.
6. Open the Vercel production URL and sign in:
   - Username: `admin`
   - Password: `admin123`
7. Immediately go to **Settings → Account Security** and change the owner password.
8. Go to **Settings → Venue Identity** and enter the prospect's marquee name if you want a personalized demo.
9. Go to **Settings → Workspace Data → Refresh Demo Records**. This regenerates fresh sample bookings, inquiries, payments, readiness and vendor tasks using current/future dates.
10. Go to **Settings → Temporary Demo Access**, enter the client's label, choose 24 hours / 3 days / 7 days / 14 days, and create access.
11. Use **Copy Full Access Message** and send the Vercel URL + temporary username/password to the prospect.
12. When required, click **Revoke**. Otherwise access expires automatically at the stored expiry time.

## What the prospect sees in the demo

The seeded workspace contains realistic sample records for:

- New, follow-up, tentative and lost inquiries
- Upcoming confirmed bookings
- A temporary booking hold
- Completed historical events
- Partial and full payment records
- Outstanding balances
- Menu selections and stage packages
- Vendor tasks for decor, kitchen and sound
- Different Event Readiness percentages
- Function-sheet-ready event details
- Audit-history examples
- WhatsApp automation log examples

The sample dates are generated relative to the day the demo records are refreshed, so the workspace does not look stale.

## Important

Do **not** deploy the app on Vercel without persistent storage. Vercel Functions do not provide a durable writable application filesystem. This build detects Upstash Redis automatically and uses it when the REST environment variables are present.

For a live paying marquee later, use a separate data key/database or a separate deployment per venue. The current product is intentionally single-tenant.
