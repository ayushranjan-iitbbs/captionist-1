'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Logo from '@/components/Logo';
import ThemeToggle from '@/components/ThemeToggle';
import { LayoutDashboard, Ticket, IndianRupee, Film, Type, ArrowLeft, Loader2, ShieldAlert, Video } from 'lucide-react';

const NAV = [
  { href: '/admin', label: 'Overview', icon: LayoutDashboard },
  { href: '/admin/coupons', label: 'Coupons', icon: Ticket },
  { href: '/admin/revenue', label: 'Revenue', icon: IndianRupee },
  { href: '/admin/content', label: 'Content', icon: Film },
  { href: '/admin/fonts', label: 'Fonts & Styles', icon: Type },
  { href: '/admin/videos', label: 'Videos', icon: Video },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user) router.replace('/sign-in');
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="animate-spin" style={{ color: 'var(--accent)' }} size={30} />
      </div>
    );
  }

  if (user.role !== 'admin') {
    return (
      <div className="grid min-h-screen place-items-center p-6 text-center">
        <div className="surface max-w-md p-10">
          <ShieldAlert size={40} className="mx-auto" style={{ color: '#ef4444' }} />
          <h1 className="mt-4 text-xl font-bold">Admin access only</h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
            Your account doesn’t have admin privileges. Add your email to <code>ADMIN_EMAILS</code> or your phone to <code>ADMIN_PHONES</code> and sign in again.
          </p>
          <Link href="/dashboard" className="btn-primary mt-6">Back to dashboard</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <aside className="surface m-3 flex w-60 shrink-0 flex-col p-4" style={{ height: 'calc(100vh - 24px)', position: 'sticky', top: 12 }}>
        <div className="flex items-center justify-between px-2 py-2">
          <Logo className="!text-xl" />
        </div>
        <span className="mt-1 px-2 text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--accent)' }}>Admin</span>

        <nav className="mt-5 flex-1 space-y-1">
          {NAV.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition"
                style={active ? { background: 'rgba(79,140,255,0.14)', color: 'var(--accent)' } : { color: 'var(--text-muted)' }}
              >
                <Icon size={18} /> {item.label}
              </Link>
            );
          })}
        </nav>

        <Link href="/dashboard" className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft size={18} /> Exit admin
        </Link>
      </aside>

      <div className="flex flex-1 flex-col">
        <div className="flex items-center justify-end gap-3 p-5">
          <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{user.email}{user.phone ? ` | ${user.phone}` : ''}</span>
          <ThemeToggle />
        </div>
        <main className="flex-1 px-5 pb-8">{children}</main>
      </div>
    </div>
  );
}
