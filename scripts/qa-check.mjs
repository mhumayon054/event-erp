import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const required = [
  'src/app/(app)/page.tsx','src/app/(app)/bookings/page.tsx','src/app/(app)/calendar/page.tsx','src/app/(app)/inquiries/page.tsx','src/app/(app)/menu/page.tsx','src/app/(app)/payments/page.tsx','src/app/(app)/operations/page.tsx','src/app/(app)/vendors/page.tsx','src/app/(app)/function-sheets/page.tsx','src/app/(app)/documents/page.tsx','src/app/(app)/automations/page.tsx','src/app/(app)/reports/page.tsx','src/app/(app)/audit/page.tsx','src/app/(app)/settings/page.tsx','src/app/api/app/route.ts','src/app/api/public-config/route.ts','src/lib/store.ts','src/components/ui/Select.tsx','src/components/ui/DatePicker.tsx','src/components/ui/TimePicker.tsx','src/components/ui/ColorPicker.tsx','src/app/globals.css'
];
let fail = false;
for (const file of required) {
  if (!fs.existsSync(path.join(root,file))) { console.error(`Missing: ${file}`); fail = true; }
}
const css = fs.readFileSync(path.join(root,'src/app/globals.css'),'utf8');
for (const token of ['transition:width .24s','@media(max-width:980px)','modal-backdrop','calendar-grid','pipeline-grid','operation-card','select-popover','date-popover','panel-body','demo-access-grid']) {
  if (!css.includes(token)) { console.error(`CSS QA missing: ${token}`); fail = true; }
}
const sidebar = fs.readFileSync(path.join(root,'src/components/layout/Sidebar.tsx'),'utf8');
for (const route of ['/bookings','/calendar','/inquiries','/payments','/operations','/vendors','/automations','/settings']) {
  if (!sidebar.includes(route)) { console.error(`Sidebar route missing: ${route}`); fail = true; }
}
const api = fs.readFileSync(path.join(root,'src/app/api/app/route.ts'),'utf8');
for (const action of ['createBooking','recordPayment','toggleReadiness','createVendorTask','changePassword','createDemoAccess','revokeDemoAccess']) {
  if (!api.includes(`action === '${action}'`)) { console.error(`API action missing: ${action}`); fail = true; }
}
const uiRoots=['src/app/(app)','src/app/login'];
for(const uiRoot of uiRoots){
  const start=path.join(root,uiRoot); if(!fs.existsSync(start))continue;
  const stack=[start];
  while(stack.length){
    const current=stack.pop();
    for(const item of fs.readdirSync(current,{withFileTypes:true})){
      const p=path.join(current,item.name);
      if(item.isDirectory())stack.push(p);
      else if(/\.tsx?$/.test(item.name)){
        const source=fs.readFileSync(p,'utf8');
        const forbidden=[/<select\b/,/<datalist\b/,/type=["']date["']/i,/type=["']time["']/i,/type=["']color["']/i];
        for(const rx of forbidden){if(rx.test(source)){console.error(`Native browser control found in ${path.relative(root,p)}: ${rx}`);fail=true;}}
      }
    }
  }
}
if (fail) process.exit(1);
console.log('EventFlow static QA passed: routes, workflows, demo access, responsive UI and custom controls are present.');
