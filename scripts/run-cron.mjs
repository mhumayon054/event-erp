const base = process.env.EVENTFLOW_URL || 'http://127.0.0.1:3000';
const secret = process.env.CRON_SECRET;
if (!secret) { console.error('CRON_SECRET is required.'); process.exit(1); }
const response = await fetch(`${base}/api/cron/run`, { headers: { Authorization: `Bearer ${secret}` } });
const body = await response.text();
if (!response.ok) { console.error(body); process.exit(1); }
console.log(body);
