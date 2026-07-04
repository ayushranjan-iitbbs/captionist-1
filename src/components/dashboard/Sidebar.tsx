'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Clock, GraduationCap, CreditCard, Puzzle, LifeBuoy, ShieldAlert } from 'lucide-react';
import Logo from '@/components/Logo';
import { useAuth } from '@/context/AuthContext';
import { PLANS } from '@/types';

const NAV = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/dashboard/projects', label: 'Recent Projects', icon: Clock },
  { href: '/dashboard/tutorials', label: 'Tutorials', icon: GraduationCap },
  { href: '/dashboard/subscription', label: 'Manage Subscription', icon: CreditCard },
  { href: '/dashboard/plugins', label: 'Manage Plugins', icon: Puzzle },
  { href: '/dashboard/help', label: 'Help & Support', icon: LifeBuoy },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const plan = PLANS.find((p) => p.id === (user?.plan || 'free'))!;

  const storageUsedGB = (user?.usage.storageBytes || 0) / 1e9;
  const transcriptionUsedMin = (user?.usage.transcriptionSecondsUsed || 0) / 60;
  const transcriptionLeft = Math.max(0, plan.limits.transcriptionMinutes - transcriptionUsedMin);

  return (
    <aside
      className="surface m-3 flex w-64 shrink-0 flex-col p-4"
      style={{ height: 'calc(100vh - 24px)', position: 'sticky', top: 12 }}
    >
      <div className="px-2 py-3">
        <Logo className="!text-2xl" />
      </div>

      <nav className="mt-4 flex-1 space-y-1">
        {NAV.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition"
              style={
                active
                  ? { background: 'rgba(79,140,255,0.14)', color: 'var(--accent)' }
                  : { color: 'var(--text-muted)' }
              }
            >
              <Icon size={18} /> {item.label}
            </Link>
          );
        })}
      </nav>
        {/* Admin link */}
        {user?.role === 'admin' && (
          <Link
            key="/admin"
            href="/admin"
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition"
            style={pathname === '/admin' ? { background: 'rgba(79,140,255,0.14)', color: 'var(--accent)' } : { color: 'var(--text-muted)' }}
          >
            <ShieldAlert size={18} /> Admin
          </Link>
        )}

      {/* Usage card */}
      <div className="surface mt-4 p-4" style={{ background: 'var(--bg-soft)' }}>
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-bold uppercase tracking-wide overflow-hidden text-ellipsis whitespace-nowrap" style={{ maxWidth: '100%' }}>{plan.name}</span>
          <span className="rounded-md px-2 py-0.5 text-xs font-semibold" style={{ background: 'rgba(79,140,255,0.14)', color: 'var(--accent)' }}>
            MONTHLY
          </span>
        </div>
        <Meter label="Storage" value={`< ${storageUsedGB.toFixed(1)} GB / ${plan.limits.storageGB} GB`} pct={(storageUsedGB / plan.limits.storageGB) * 100} />
        <Meter label="Transcription" value={`${transcriptionLeft.toFixed(1)} mins left`} pct={(transcriptionUsedMin / plan.limits.transcriptionMinutes) * 100} />
        <Meter label="Audio Clean" value={`${user?.usage.audioCleansUsed || 0} / ${plan.limits.audioCleans}`} pct={((user?.usage.audioCleansUsed || 0) / plan.limits.audioCleans) * 100} />
        <button onClick={() => router.push('/dashboard/subscription')} className="btn-primary mt-4 w-full !py-2.5 text-sm">
          Upgrade Now
        </button>
      </div>
    </aside>
  );
}

function Meter({ label, value, pct }: { label: string; value: string; pct: number }) {
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between text-xs">
        <span className="font-semibold">{label}</span>
        <span style={{ color: 'var(--accent)' }}>{value}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--border)' }}>
        <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.max(2, pct))}%`, background: 'var(--accent)' }} />
      </div>
    </div>
  );
}
