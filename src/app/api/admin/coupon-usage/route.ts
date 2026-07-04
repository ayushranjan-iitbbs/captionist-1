import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebaseAdmin';
import { COLLECTIONS } from '@/lib/collections';

// Returns usage records for a given coupon ID: each record includes user email and usage timestamp.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const couponId = searchParams.get('id');
  if (!couponId) return NextResponse.json({ error: 'coupon id required' }, { status: 400 });

  // Fetch usage entries
  const usageSnap = await adminDb
    .collection(COLLECTIONS.couponUsage)
    .where('couponId', '==', couponId)
    .orderBy('usedAt', 'desc')
    .limit(100)
    .get();

  const usages: any[] = [];
  for (const doc of usageSnap.docs) {
    const data = doc.data();
    // Get user email if possible
    let email = '';
    try {
      const userSnap = await adminDb.collection(COLLECTIONS.users).doc(data.uid).get();
      if (userSnap.exists) email = (userSnap.data() as any).email || '';
    } catch (_) {}
    usages.push({ id: doc.id, uid: data.uid, email, usedAt: data.usedAt });
  }

  return NextResponse.json({ usages });
}
