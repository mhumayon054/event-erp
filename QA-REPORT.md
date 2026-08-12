# EventFlow v1.5 Demo Cloud — QA Report

## Completed checks

- Static project QA script: **PASS**
- TypeScript/TSX parser pass across all source files: **PASS (42 files, 0 syntax errors)**
- Local storage runtime initialization: **PASS**
- Automatic demo seed: **PASS**
  - 6 bookings
  - 5 inquiries
  - 5 verified payment records
  - 5 vendor tasks
  - mixed readiness states, completed events and an active booking hold
- Temporary demo account creation: **PASS**
- Generated demo-password verification: **PASS**
- Manual demo-account revoke: **PASS**
- Refresh Demo Records workflow/store function: **PASS**
- Demo access expiry is enforced by both login validation and authenticated session lookup.
- Custom controls QA remains enabled for dropdown/date/time/color controls.
- Collapsed sidebar stability fixes from v1.4 are preserved.

## Vercel/serverless storage

This build no longer relies on the Vercel filesystem when cloud storage variables are present. It supports Upstash Redis REST storage through either:

- `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`, or
- `KV_REST_API_URL` + `KV_REST_API_TOKEN`.

Writes are serialized with a short Redis distributed lock so separate serverless function instances do not overwrite each other during normal demo usage.

The external Upstash endpoint cannot be provisioned/tested from this isolated build environment because no user-owned Vercel/Upstash account is connected here. The REST implementation follows the provider's documented command-array API and Bearer-token authentication. Perform the final live deployment smoke test after connecting the Vercel Marketplace storage integration.

## Final live smoke test after Vercel deploy

1. Open the production URL and verify login.
2. Change the owner password from `admin123`.
3. Rename the venue in Settings and reload; verify header/login branding.
4. Click **Refresh Demo Records**; verify sample data repopulates with current/future dates.
5. Create a 24-hour temporary demo account.
6. Open an incognito window and sign in with the demo credentials.
7. Verify Settings/Audit/security controls are restricted for the demo role.
8. Create/edit a booking and refresh the page; verify the change persists (cloud-store check).
9. Revoke the demo account from the owner session; verify the demo session loses access.
10. Generate a quotation / receipt / function-sheet PDF and test the WhatsApp prepared-link workflow.
