'use client';

import { useEffect, useState } from 'react';
import { authFetch } from '@/lib/authFetch';
import { Download, IndianRupee, TrendingDown, ShoppingCart, Loader2 } from 'lucide-react';

interface Tx {
  id: string;
  userEmail: string;
  planId: string;
  billing?: string;
  amount: number;
  discount: number;
  finalAmount: number;
  couponCode?: string | null;
  status: string;
  razorpayPaymentId?: string;
  createdAt: number;
}

interface Data {
  transactions: Tx[];
  stats: {
    totalRevenue: number;
    totalDiscount: number;
    paidCount: number;
    txCount: number;
    byPlan: Record<string, number>;
    series: { date: string; amount: number }[];
  };
}

export default function AdminRevenue() {
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    (async () => {
      const res = await authFetch('/api/admin/revenue');
      if (res.ok) setData(await res.json());
    })();
  }, []);

  const exportCsv = () => {
    if (!data) return;
    const headers = ['Date', 'Email', 'Plan', 'Billing', 'Gross', 'Discount', 'Final', 'Coupon', 'Status', 'Payment ID'];
    const rows = data.transactions.map((t) => [
      new Date(t.createdAt).toISOString(),
      t.userEmail,
      t.planId,
      t.billing || '',
      t.amount,
      t.discount,
      t.finalAmount,
      t.couponCode || '',
      t.status,
      t.razorpayPaymentId || '',
    ]);
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `captionist-revenue-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!data) {
    return (
      <div className="grid h-[50vh] place-items-center">
        <Loader2 className="animate-spin" style={{ color: 'var(--accent)' }} size={26} />
      </div>
    );
  }

  const maxSeries = Math.max(1, ...data.stats.series.map((s) => s.amount));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-extrabold">Revenue</h1>
        <button onClick={exportCsv} className="btn-primary !py-2.5 text-sm">
          <Download size={16} /> Export CSV
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Total Revenue" value={`₹${data.stats.totalRevenue.toLocaleString()}`} icon={IndianRupee} />
        <Stat label="Discounts Given" value={`₹${data.stats.totalDiscount.toLocaleString()}`} icon={TrendingDown} />
        <Stat label="Paid Orders" value={data.stats.paidCount.toLocaleString()} icon={ShoppingCart} />
      </div>

      {/* 30-day chart */}
      <div className="surface p-6">
        <h2 className="mb-5 text-lg font-bold">Last 30 days</h2>
        <div className="flex h-40 items-end gap-1">
          {data.stats.series.map((s, i) => (
            <div key={i} className="group flex flex-1 flex-col items-center justify-end">
              <div
                className="w-full rounded-t transition"
                style={{ height: `${(s.amount / maxSeries) * 100}%`, minHeight: s.amount > 0 ? 4 : 0, background: 'var(--accent)' }}
                title={`${s.date}: ₹${s.amount}`}
              />
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
          <span>{data.stats.series[0]?.date}</span>
          <span>{data.stats.series[data.stats.series.length - 1]?.date}</span>
        </div>
      </div>

      {/* Transactions table */}
      <div className="surface overflow-hidden">
        <div className="border-b p-5" style={{ borderColor: 'var(--border)' }}>
          <h2 className="font-bold">Transactions ({data.transactions.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ color: 'var(--text-muted)' }} className="text-left">
                <th className="p-4 font-semibold">Date</th>
                <th className="p-4 font-semibold">Email</th>
                <th className="p-4 font-semibold">Plan</th>
                <th className="p-4 font-semibold">Final</th>
                <th className="p-4 font-semibold">Coupon</th>
                <th className="p-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>
                    No transactions yet.
                  </td>
                </tr>
              ) : (
                data.transactions.map((t) => (
                  <tr key={t.id} className="border-t" style={{ borderColor: 'var(--border)' }}>
                    <td className="p-4">{new Date(t.createdAt).toLocaleDateString()}</td>
                    <td className="p-4">{t.userEmail}</td>
                    <td className="p-4 capitalize">{t.planId}</td>
                    <td className="p-4 font-semibold">₹{t.finalAmount}</td>
                    <td className="p-4">{t.couponCode || '—'}</td>
                    <td className="p-4">
                      <span
                        className="rounded-md px-2 py-0.5 text-xs font-semibold"
                        style={{
                          background: t.status === 'paid' ? 'rgba(34,197,94,0.15)' : t.status === 'failed' ? 'rgba(239,68,68,0.15)' : 'rgba(148,163,184,0.15)',
                          color: t.status === 'paid' ? '#22c55e' : t.status === 'failed' ? '#ef4444' : '#94a3b8',
                        }}
                      >
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div className="surface p-6">
      <div className="flex items-center justify-between">
        <span className="text-sm" style={{ color: 'var(--text-muted)' }}>{label}</span>
        <Icon size={18} style={{ color: 'var(--accent)' }} />
      </div>
      <p className="mt-3 text-3xl font-extrabold">{value}</p>
    </div>
  );
}
