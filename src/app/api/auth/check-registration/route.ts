import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { COLLECTIONS } from '@/lib/collections';
import { normalizeMobile } from '@/lib/msg91';

/**
 * Pre-check before sending an OTP (standardized Baba-family pattern).
 * Tells the client whether this phone/email is already registered so it can
 * redirect wrong-mode users instantly instead of wasting an SMS.
 */
export async function POST(req: NextRequest) {
  try {
    const { phone, email } = await req.json();

    if (email) {
      try {
        const user = await adminAuth.getUserByEmail(email);
        return NextResponse.json({ registered: true, uid: user.uid });
      } catch {
        return NextResponse.json({ registered: false });
      }
    }

    if (phone) {
      const normalized = '+' + normalizeMobile(phone);
      // Look up in our users collection by phone
      const snap = await adminDb
        .collection(COLLECTIONS.users)
        .where('phone', '==', normalized)
        .limit(1)
        .get();
      return NextResponse.json({
        registered: !snap.empty,
        uid: snap.empty ? undefined : snap.docs[0].id,
      });
    }

    return NextResponse.json({ error: 'phone or email required' }, { status: 400 });
  } catch (e) {
    return NextResponse.json({ error: 'check failed' }, { status: 500 });
  }
}
