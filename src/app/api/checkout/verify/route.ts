import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';
import { adminDb } from '@/lib/firebaseAdmin';
import { COLLECTIONS } from '@/lib/collections';
import { verifySignature } from '@/lib/razorpay';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, transactionId } =
      await req.json();

    const ok = verifySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
    if (!ok) {
      if (transactionId) {
        await adminDb.collection(COLLECTIONS.transactions).doc(transactionId).update({
          status: 'failed',
          razorpayPaymentId: razorpayPaymentId || null,
        });
      }
      return NextResponse.json({ error: 'Signature verification failed' }, { status: 400 });
    }

    // Load the transaction we created
    const txRef = adminDb.collection(COLLECTIONS.transactions).doc(transactionId);
    const txSnap = await txRef.get();
    if (!txSnap.exists) return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    const tx = txSnap.data() as any;
    if (tx.uid !== user.uid) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    // Mark paid
    await txRef.update({
      status: 'paid',
      razorpayPaymentId,
      razorpaySignature,
      paidAt: Date.now(),
    });

    // Upgrade the user's plan
    await adminDb.collection(COLLECTIONS.users).doc(user.uid).update({
      plan: tx.planId,
      updatedAt: Date.now(),
    });

    // Record coupon usage + increment global counter
    if (tx.couponCode) {
      const cSnap = await adminDb
        .collection(COLLECTIONS.coupons)
        .where('code', '==', tx.couponCode)
        .limit(1)
        .get();
      if (!cSnap.empty) {
        const couponId = cSnap.docs[0].id;
        await adminDb.collection(COLLECTIONS.couponUsage).add({
          couponId,
          code: tx.couponCode,
          uid: user.uid,
          transactionId,
          discount: tx.discount,
          createdAt: Date.now(),
        });
        await adminDb.collection(COLLECTIONS.coupons).doc(couponId).update({
          usedCount: FieldValue.increment(1),
        });
      }
    }

    return NextResponse.json({ success: true, plan: tx.planId });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Verification failed' }, { status: 500 });
  }
}
