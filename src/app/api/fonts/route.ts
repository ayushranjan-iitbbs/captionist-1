import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';
import { adminDb } from '@/lib/firebaseAdmin';

export const runtime = 'nodejs';

const COL = 'userfontscaptionist';

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const snap = await adminDb.collection(COL).where('uid', '==', user.uid).orderBy('createdAt', 'desc').limit(30).get();
  return NextResponse.json({ fonts: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const { name, url } = await req.json();
    if (!name || !url) return NextResponse.json({ error: 'name and url are required' }, { status: 400 });
    const looksLikeFirebase = String(url).startsWith('https://firebasestorage.googleapis.com/');
    const ownsPath = String(url).includes(encodeURIComponent(`captionist/${user.uid}/`)) ||
      String(url).includes(`captionist%2F${user.uid}%2F`);
    if (!looksLikeFirebase || !ownsPath) return NextResponse.json({ error: 'Invalid font URL' }, { status: 400 });
    const doc = { uid: user.uid, name: String(name).slice(0, 50).replace(/['"<>]/g, ''), url, createdAt: Date.now() };
    const ref = await adminDb.collection(COL).add(doc);
    return NextResponse.json({ font: { id: ref.id, ...doc } });
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