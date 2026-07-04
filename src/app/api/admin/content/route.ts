import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/session';
import { adminDb } from '@/lib/firebaseAdmin';
import { COLLECTIONS } from '@/lib/collections';

// Maps a public "type" to a namespaced collection.
const TYPE_MAP: Record<string, string> = {
  tutorials: COLLECTIONS.tutorials,
  testimonials: COLLECTIONS.testimonials,
  creators: COLLECTIONS.creators,
  landingVideos: COLLECTIONS.landingVideos,
  templates: COLLECTIONS.templates,
  transitions: COLLECTIONS.transitions,
  fonts: COLLECTIONS.fonts,
};

function resolve(type: string | null) {
  if (!type || !TYPE_MAP[type]) return null;
  return TYPE_MAP[type];
}

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const col = resolve(req.nextUrl.searchParams.get('type'));
  if (!col) return NextResponse.json({ error: 'Unknown type' }, { status: 400 });

  const snap = await adminDb.collection(col).orderBy('order', 'asc').get().catch(async () => {
    // collection may have no `order` index yet — fall back to unordered
    return adminDb.collection(col).get();
  });
  const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { type, data } = await req.json();
  const col = resolve(type);
  if (!col) return NextResponse.json({ error: 'Unknown type' }, { status: 400 });

  const ref = adminDb.collection(col).doc();
  await ref.set({
    order: typeof data.order === 'number' ? data.order : Date.now(),
    ...data,
    createdAt: Date.now(),
  });
  return NextResponse.json({ id: ref.id });
}

export async function PUT(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { type, id, data } = await req.json();
  const col = resolve(type);
  if (!col || !id) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  const { id: _omit, createdAt: _c, ...rest } = data || {};
  await adminDb.collection(col).doc(id).update({ ...rest, updatedAt: Date.now() });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const col = resolve(req.nextUrl.searchParams.get('type'));
  const id = req.nextUrl.searchParams.get('id');
  if (!col || !id) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  await adminDb.collection(col).doc(id).delete();
  return NextResponse.json({ ok: true });
}
