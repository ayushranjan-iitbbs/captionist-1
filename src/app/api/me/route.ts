import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';
import { adminDb } from '@/lib/firebaseAdmin';
import { COLLECTIONS } from '@/lib/collections';

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({ user });
}

export async function PATCH(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const patch: Record<string, any> = { updatedAt: Date.now() };
  if (typeof body.name === 'string') patch.name = body.name.trim();
  if (typeof body.phone === 'string') patch.phone = body.phone.trim();
  if (typeof body.preferredLanguage === 'string') patch.preferredLanguage = body.preferredLanguage;

  await adminDb.collection(COLLECTIONS.users).doc(user.uid).update(patch);
  return NextResponse.json({ ok: true });
}
