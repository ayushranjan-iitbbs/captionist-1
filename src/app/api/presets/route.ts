import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';
import { adminDb } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';

const COL = 'userpresetscaptionist';

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const snap = await adminDb.collection(COL).where('uid', '==', user.uid).orderBy('createdAt', 'desc').limit(50).get();
  return NextResponse.json({ presets: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { name, patch } = await req.json();
    if (!name || typeof name !== 'string' || !patch || typeof patch !== 'object') {
      return NextResponse.json({ error: 'name and patch are required' }, { status: 400 });
    }
    const doc = { uid: user.uid, name: name.slice(0, 60), patch, createdAt: Date.now() };
    const ref = await adminDb.collection(COL).add(doc);
    return NextResponse.json({ preset: { id: ref.id, ...doc } });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Save failed' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  const ref = adminDb.collection(COL).doc(id);
  const doc = await ref.get();
  if (!doc.exists || doc.data()?.uid !== user.uid) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  await ref.delete();
  return NextResponse.json({ ok: true });
}