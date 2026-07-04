import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/session';
import { adminDb } from '@/lib/firebaseAdmin';
import { COLLECTIONS } from '@/lib/collections';

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const [usersSnap, projectsSnap, couponsSnap, txSnap] = await Promise.all([
    adminDb.collection(COLLECTIONS.users).count().get().catch(() => null),
    adminDb.collection(COLLECTIONS.projects).count().get().catch(() => null),
    adminDb.collection(COLLECTIONS.coupons).count().get().catch(() => null),
    adminDb.collection(COLLECTIONS.transactions).where('status', '==', 'paid').get().catch(() => null),
  ]);

  // Plan distribution (best-effort, small datasets)
  const planDist: Record<string, number> = {};
  try {
    const allUsers = await adminDb.collection(COLLECTIONS.users).select('plan').get();
    for (const d of allUsers.docs) {
      const plan = (d.data() as any).plan || 'free';
      planDist[plan] = (planDist[plan] || 0) + 1;
    }
  } catch {
    /* ignore */
  }

  const revenue = txSnap ? txSnap.docs.reduce((s, d) => s + ((d.data() as any).finalAmount || 0), 0) : 0;

  return NextResponse.json({
    users: usersSnap?.data().count ?? 0,
    projects: projectsSnap?.data().count ?? 0,
    coupons: couponsSnap?.data().count ?? 0,
    paidTransactions: txSnap?.size ?? 0,
    revenue,
    planDist,
  });
}
