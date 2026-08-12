import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const source = path.join(root, 'data', 'eventflow.json');
if (!fs.existsSync(source)) { console.error('No data/eventflow.json exists yet. Start the app once first.'); process.exit(1); }
const dir = path.join(root, 'backups');
fs.mkdirSync(dir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const dest = path.join(dir, `eventflow-${stamp}.json`);
fs.copyFileSync(source, dest);
console.log(`Backup created: ${dest}`);
