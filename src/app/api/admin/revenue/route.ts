import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/session';
import { adminDb } from '@/lib/firebaseAdmin';
import { COLLECTIONS } from '@/lib/collections';

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const snap = await adminDb
    .collection(COLLECTIONS.transactions)
    .orderBy('createdAt', 'desc')
    .limit(500)
    .get();

  const transactions = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));

  const paid = transactions.filter((t) => t.status === 'paid');
  const totalRevenue = paid.reduce((s, t) => s + (t.finalAmount || 0), 0);
  const totalDiscount = paid.reduce((s, t) => s + (t.discount || 0), 0);

  // Revenue by plan
  const byPlan: Record<string, number> = {};
  for (const t of paid) byPlan[t.planId] = (byPlan[t.planId] || 0) + (t.finalAmount || 0);

  // Last 30 days revenue series
  const now = Date.now();
  const day = 86400000;
  const series: { date: string; amount: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const start = now - i * day;
    const label = new Date(start).toISOString().slice(5, 10);
    const amount = paid
      .filter((t) => (t.paidAt || t.createdAt) >= start - day / 2 && (t.paidAt || t.createdAt) < start + day / 2)
      .reduce((s, t) => s + (t.finalAmount || 0), 0);
    series.push({ date: label, amount });
  }

  return NextResponse.json({
    transactions,
    stats: {
      totalRevenue,
      totalDiscount,
      paidCount: paid.length,
      txCount: transactions.length,
      byPlan,
      series,
    },
  });
}
