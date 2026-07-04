import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';
import { adminDb } from '@/lib/firebaseAdmin';
import { COLLECTIONS } from '@/lib/collections';

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const snap = await adminDb
    .collection(COLLECTIONS.projects)
    .where('uid', '==', user.uid)
    .orderBy('createdAt', 'desc')
    .limit(50)
    .get();

  const projects = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return NextResponse.json({ projects });
}
