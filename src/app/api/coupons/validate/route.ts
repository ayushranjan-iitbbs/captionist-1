import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';
import { adminDb } from '@/lib/firebaseAdmin';
import { COLLECTIONS } from '@/lib/collections';
import { validateCoupon, type Coupon } from '@/lib/coupons';

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { code, amount, planId } = await req.json();
  if (!code || typeof amount !== 'number') {
    return NextResponse.json({ valid: false, reason: 'Invalid request', discount: 0, finalAmount: amount || 0 });
  }

  // Fetch coupon by code (stored uppercase)
  const snap = await adminDb
    .collection(COLLECTIONS.coupons)
    .where('code', '==', String(code).trim().toUpperCase())
    .limit(1)
    .get();

  const coupon = snap.empty ? null : ({ id: snap.docs[0].id, ...snap.docs[0].data() } as Coupon);

  // Per-user usage count
  let userUsed = 0;
  if (coupon) {
    const usageSnap = await adminDb
      .collection(COLLECTIONS.couponUsage)
      .where('couponId', '==', coupon.id)
      .where('uid', '==', user.uid)
      .get();
    userUsed = usageSnap.size;
  }

  const result = validateCoupon(coupon, amount, planId, userUsed);
  return NextResponse.json({ ...result, code: coupon?.code });
}
