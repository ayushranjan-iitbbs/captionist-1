'use client';

import { useEffect, useState } from 'react';
import { authFetch } from '@/lib/authFetch';
import { Users, FolderOpen, Ticket, IndianRupee, Loader2 } from 'lucide-react';
import { PLANS } from '@/types';

interface Stats {
  users: number;
  projects: number;
  coupons: number;
  paidTransactions: number;
  revenue: number;
  planDist: Record<string, number>;
}

export default function AdminOverview() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    (async () => {
      const res = await authFetch('/api/admin/stats');
      if (res.ok) setStats(await res.json());
    })();
  }, []);

  if (!stats) {
    return (
      <div className="grid h-[50vh] place-items-center">
        <Loader2 className="animate-spin" style={{ color: 'var(--accent)' }} size={26} />
      </div>
    );
  }

  const cards = [
    { label: 'Total Users', value: stats.users.toLocaleString(), icon: Users },
    { label: 'Projects', value: stats.projects.toLocaleString(), icon: FolderOpen },
    { label: 'Paid Orders', value: stats.paidTransactions.toLocaleString(), icon: Ticket },
    { label: 'Revenue', value: `₹${stats.revenue.toLocaleString()}`, icon: IndianRupee },
  ];

  const totalUsers = Object.values(stats.planDist).reduce((a, b) => a + b, 0) || 1;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold">Overview</h1>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="surface p-6">
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{c.label}</span>
                <Icon size={18} style={{ color: 'var(--accent)' }} />
              </div>
              <p className="mt-3 text-3xl font-extrabold">{c.value}</p>
            </div>
          );
        })}
      </div>

      <div className="surface p-6">
        <h2 className="mb-5 text-lg font-bold">Users by plan</h2>
        <div className="space-y-4">
          {PLANS.map((p) => {
            const count = stats.planDist[p.id] || 0;
            const pct = (count / totalUsers) * 100;
            return (
              <div key={p.id}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span className="font-semibold">{p.name}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{count} users</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full" style={{ background: 'var(--border)' }}>
                  <div className="h-full rounded-full" style={{ width: `${Math.max(2, pct)}%`, background: 'var(--accent)' }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
