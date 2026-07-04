import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';
import { adminDb } from '@/lib/firebaseAdmin';
import { COLLECTIONS } from '@/lib/collections';
import { createOrder } from '@/lib/razorpay';
import { validateCoupon, type Coupon } from '@/lib/coupons';
import { PLANS, type PlanId } from '@/types';

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { planId, billing, couponCode } = (await req.json()) as {
      planId: PlanId;
      billing: 'monthly' | 'yearly';
      couponCode?: string;
    };

    const plan = PLANS.find((p) => p.id === planId);
    if (!plan || plan.id === 'free') {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    // Yearly is billed as 12 * effective monthly
    const months = billing === 'yearly' ? 12 : 1;
    const unit = billing === 'yearly' ? plan.priceYearly : plan.priceMonthly;
    const gross = unit * months;

    // Re-validate coupon server-side (never trust client discount)
    let discount = 0;
    let appliedCode: string | undefined;
    if (couponCode) {
      const snap = await adminDb
        .collection(COLLECTIONS.coupons)
        .where('code', '==', couponCode.trim().toUpperCase())
        .limit(1)
        .get();
      const coupon = snap.empty ? null : ({ id: snap.docs[0].id, ...snap.docs[0].data() } as Coupon);

      let userUsed = 0;
      if (coupon) {
        const usageSnap = await adminDb
          .collection(COLLECTIONS.couponUsage)
          .where('couponId', '==', coupon.id)
          .where('uid', '==', user.uid)
          .get();
        userUsed = usageSnap.size;
      }
      const v = validateCoupon(coupon, gross, planId, userUsed);
      if (v.valid) {
        discount = v.discount;
        appliedCode = coupon?.code;
      }
    }

    const finalAmount = Math.max(1, Math.round((gross - discount) * 100) / 100);

    // Create Razorpay order
    const order = await createOrder(finalAmount, `cap_${Date.now()}`, {
      uid: user.uid,
      planId,
      billing,
    });

    // Persist transaction (created)
    const txRef = adminDb.collection(COLLECTIONS.transactions).doc();
    await txRef.set({
      uid: user.uid,
      userEmail: user.email,
      planId,
      billing,
      amount: gross,
      discount,
      finalAmount,
      couponCode: appliedCode || null,
      razorpayOrderId: order.id,
      status: 'created',
      createdAt: Date.now(),
    });

    return NextResponse.json({
      orderId: order.id,
      amount: finalAmount,
      currency: 'INR',
      transactionId: txRef.id,
      gross,
      discount,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Checkout failed' }, { status: 500 });
  }
}
