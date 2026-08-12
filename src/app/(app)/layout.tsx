import { AppShell } from '@/components/layout/AppShell';
import { requireUser } from '@/lib/auth';
import { readData } from '@/lib/store';

export const dynamic = 'force-dynamic';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = requireUser();
  const data = readData();
  return <AppShell settings={data.settings} user={{name:user.name,role:user.role,expiresAt:user.expiresAt}}>{children}</AppShell>;
}
