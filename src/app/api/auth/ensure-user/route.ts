import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebaseAdmin';
import { COLLECTIONS } from '@/lib/collections';
import { newUserDoc } from '@/lib/userDoc';

export async function POST(req: NextRequest) {
  const header = req.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const decoded = await adminAuth.verifyIdToken(header.slice(7));
    const body = await req.json();
    const ref = adminDb.collection(COLLECTIONS.users).doc(decoded.uid);
    const snap = await ref.get();
    if (!snap.exists) {
      await ref.set(
        newUserDoc({
          uid: decoded.uid,
          name: body.name || decoded.name || 'Creator',
          email: body.email || decoded.email || '',
          photoURL: body.photoURL || decoded.picture,
        })
      );
    }
    const fresh = await ref.get();
    return NextResponse.json({ user: { uid: decoded.uid, ...fresh.data() } });
  } catch (e) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
}
