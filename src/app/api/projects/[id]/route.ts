import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';
import { adminDb } from '@/lib/firebaseAdmin';
import { COLLECTIONS } from '@/lib/collections';

async function loadOwned(id: string, uid: string) {
  const ref = adminDb.collection(COLLECTIONS.projects).doc(id);
  const snap = await ref.get();
  if (!snap.exists) return { ref, data: null };
  const data = snap.data() as any;
  if (data.uid !== uid) return { ref, data: 'forbidden' as const };
  return { ref, data: { id: snap.id, ...data } };
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data } = await loadOwned(params.id, user.uid);
  if (data === null) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (data === 'forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  return NextResponse.json({ project: data });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { ref, data } = await loadOwned(params.id, user.uid);
  if (data === null) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (data === 'forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const patch: Record<string, any> = { updatedAt: Date.now() };
  if (typeof body.title === 'string') patch.title = body.title;
  if (body.transcript) patch.transcript = body.transcript;

  await ref.update(patch);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { ref, data } = await loadOwned(params.id, user.uid);
  if (data === null) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (data === 'forbidden') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await ref.delete();
  return NextResponse.json({ ok: true });
}
