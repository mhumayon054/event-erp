# Demo-Ready QA Report

This build was reviewed specifically for remote prospective-client demos and white-label venue delivery.

## Passed checks

- Static route/workflow QA (`npm run qa`)
- TypeScript/TSX syntax parse across all source files
- Relative local import resolution
- CSS brace/integrity check
- No native `<select>` controls remain in application source
- No native browser date, time or color inputs remain
- No native `window.confirm` / `window.prompt` dialogs remain
- Temporary demo credential generation and password verification runtime test
- Demo revocation and session cleanup runtime test
- Demo WhatsApp safety runtime test: demo role is forced to one-click WhatsApp link mode and cannot call Cloud API sending
- Demo permissions: Settings/Audit and sensitive configuration actions are blocked
- White-label marquee display name is used in the application header and public login screen
- Header/sidebar control sizes and custom control styling use shared design tokens/styles

## Demo safety model

Use a dedicated demo installation/workspace when sharing access with a prospective client. A demo user can test operational workflows and see records in that demo workspace, but cannot change venue/security settings or WhatsApp API configuration. Demo access can expire automatically or be revoked immediately.

## Build-environment note

A full `next build` could not be executed inside the delivery sandbox because the npm registry is not reachable from this environment and dependencies are intentionally not bundled into the ZIP. This is an environment limitation, not a passed build claim.

Before hosting, run on a machine with npm access:

```bash
npm install
npm run qa
npm run build
```

The current lightweight storage adapter is a local server-side JSON file. Host this version on a persistent Node/VPS instance. Use PostgreSQL (or another durable database) before deploying it as a stateful serverless/Vercel application.
