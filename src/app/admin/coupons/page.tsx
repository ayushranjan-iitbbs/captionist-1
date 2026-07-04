'use client';

import { useCallback, useEffect, useState } from 'react';
import { authFetch } from '@/lib/authFetch';
import { PLANS } from '@/types';
import { Plus, Trash2, Loader2, Ticket, Power, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Coupon } from '@/lib/coupons';

const EMPTY = {
  code: '',
  discountType: 'percent' as 'percent' | 'flat',
  discountValue: 10,
  maxDiscount: '',
  minAmount: '',
  usageLimit: '',
  perUserLimit: '',
  expiresAt: '',
  appliesToPlans: [] as string[],
};

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ...EMPTY });
  const [saving, setSaving] = useState(false);
  // Map of couponId -> usage array
  const [usageMap, setUsageMap] = useState<Record<string, any[]>>({});

  const loadUsage = async (couponId: string) => {
    const res = await authFetch(`/api/admin/coupon-usage?id=${couponId}`);
    if (res.ok) {
      const data = await res.json();
      setUsageMap((prev) => ({ ...prev, [couponId]: data.usages }));
    } else {
      toast.error('Failed to load usage');
    }
  };

  const load = useCallback(async () => {
    const res = await authFetch('/api/admin/coupons');
    if (res.ok) setCoupons((await res.json()).coupons);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!form.code.trim()) return toast.error('Enter a code');
    setSaving(true);
    const res = await authFetch('/api/admin/coupons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : undefined,
        minAmount: form.minAmount ? Number(form.minAmount) : undefined,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : undefined,
        perUserLimit: form.perUserLimit ? Number(form.perUserLimit) : undefined,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).getTime() : undefined,
      }),
    });
    setSaving(false);
    if (res.ok) {
      toast.success('Coupon created');
      setForm({ ...EMPTY });
      load();
    } else {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error || 'Failed to create');
    }
  };

  const toggle = async (c: Coupon) => {
    await authFetch('/api/admin/coupons', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: c.id, active: !c.active }),
    });
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this coupon?')) return;
    await authFetch(`/api/admin/coupons?id=${id}`, { method: 'DELETE' });
    toast.success('Deleted');
    load();
  };

  const togglePlan = (planId: string) => {
    setForm((f) => ({
      ...f,
      appliesToPlans: f.appliesToPlans.includes(planId)
        ? f.appliesToPlans.filter((p) => p !== planId)
        : [...f.appliesToPlans, planId],
    }));
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold">Coupons</h1>

      {/* Create form */}
      <div className="surface p-6">
        <div className="mb-5 flex items-center gap-2">
          <Plus size={18} style={{ color: 'var(--accent)' }} />
          <h2 className="text-lg font-bold">Create coupon</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <L label="Code">
            <input className="input uppercase" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="DESI50" />
          </L>
          <L label="Type">
            <select className="input" value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value as any })}>
              <option value="percent">Percent (%)</option>
              <option value="flat">Flat (₹)</option>
            </select>
          </L>
          <L label={form.discountType === 'percent' ? 'Discount %' : 'Discount ₹'}>
            <input type="number" className="input" value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: Number(e.target.value) })} />
          </L>
          <L label="Max discount ₹ (percent only)">
            <input type="number" className="input" value={form.maxDiscount} onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })} placeholder="—" />
          </L>
          <L label="Min order ₹">
            <input type="number" className="input" value={form.minAmount} onChange={(e) => setForm({ ...form, minAmount: e.target.value })} placeholder="—" />
          </L>
          <L label="Total usage limit">
            <input type="number" className="input" value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value })} placeholder="∞" />
          </L>
          <L label="Per-user limit">
            <input type="number" className="input" value={form.perUserLimit} onChange={(e) => setForm({ ...form, perUserLimit: e.target.value })} placeholder="∞" />
          </L>
          <L label="Expires at">
            <input type="date" className="input" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
          </L>
        </div>

        <div className="mt-4">
          <span className="mb-2 block text-sm font-semibold">Applies to plans (none = all)</span>
          <div className="flex flex-wrap gap-2">
            {PLANS.filter((p) => p.id !== 'free').map((p) => (
              <button
                key={p.id}
                onClick={() => togglePlan(p.id)}
                className="rounded-full border px-4 py-1.5 text-sm font-medium transition"
                style={form.appliesToPlans.includes(p.id) ? { background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' } : { borderColor: 'var(--border)', color: 'var(--text-muted)' }}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        <button onClick={create} disabled={saving} className="btn-primary mt-5 !py-2.5 text-sm disabled:opacity-50">
          {saving ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />} Create coupon
        </button>
      </div>

      {/* List */}
      <div className="surface overflow-hidden">
        <div className="border-b p-5" style={{ borderColor: 'var(--border)' }}>
          <h2 className="font-bold">All coupons ({coupons.length})</h2>
        </div>
        {loading ? (
          <div className="grid place-items-center p-10">
            <Loader2 className="animate-spin" style={{ color: 'var(--accent)' }} size={22} />
          </div>
        ) : coupons.length === 0 ? (
          <div className="grid place-items-center p-12 text-center">
            <Ticket size={36} style={{ color: 'var(--text-muted)' }} />
            <p className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>No coupons yet.</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {coupons.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center gap-4 p-5" style={{ borderColor: 'var(--border)' }}>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-lg font-bold">{c.code}</span>
                    <span className="rounded-md px-2 py-0.5 text-xs font-semibold" style={{ background: c.active ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)', color: c.active ? '#22c55e' : '#ef4444' }}>
                      {c.active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                    {c.discountType === 'percent' ? `${c.discountValue}% off` : `₹${c.discountValue} off`}
                    {c.maxDiscount ? ` · max ₹${c.maxDiscount}` : ''}
                    {c.minAmount ? ` · min ₹${c.minAmount}` : ''}
                    {' · used '}{c.usedCount || 0}{c.usageLimit ? `/${c.usageLimit}` : ''}
                  </p>
                </div>
                <button onClick={() => toggle(c)} className="btn-ghost !px-3 !py-2 text-sm">
                  <Power size={14} /> {c.active ? 'Disable' : 'Enable'}
                </button>
                <button onClick={() => loadUsage(c.id)} className="btn-ghost !px-3 !py-2 text-sm">
                  <Eye size={14} /> View usage
                </button>
                <button onClick={() => remove(c.id)} className="grid h-9 w-9 place-items-center rounded-full" style={{ color: '#ef4444' }}>
                  <Trash2 size={16} />
                </button>
                {usageMap[c.id] && (
                  <div className="mt-2 w-full overflow-x-auto">
                    <table className="w-full text-xs border">
                      <thead>
                        <tr className="bg-gray-100">
                          <th className="p-1 text-left" style={{ color: 'var(--text-muted)' }}>User Email</th>
                          <th className="p-1 text-left" style={{ color: 'var(--text-muted)' }}>Used At</th>
                        </tr>
                      </thead>
                      <tbody>
                        {usageMap[c.id].map((u) => (
                          <tr key={u.id} className="border-t" style={{ borderColor: 'var(--border)' }}>
                            <td className="p-1">{u.email || u.uid}</td>
                            <td className="p-1">{new Date(u.usedAt).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{label}</span>
      {children}
    </label>
  );
}
