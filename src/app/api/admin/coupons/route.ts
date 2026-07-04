import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/session';
import { adminDb } from '@/lib/firebaseAdmin';
import { COLLECTIONS } from '@/lib/collections';

export async function GET(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const snap = await adminDb.collection(COLLECTIONS.coupons).orderBy('createdAt', 'desc').get();
  const coupons = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return NextResponse.json({ coupons });
}

export async function POST(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const code = String(body.code || '').trim().toUpperCase();
  if (!code) return NextResponse.json({ error: 'Code is required' }, { status: 400 });

  // Enforce unique code
  const existing = await adminDb.collection(COLLECTIONS.coupons).where('code', '==', code).limit(1).get();
  if (!existing.empty) return NextResponse.json({ error: 'Coupon code already exists' }, { status: 409 });

  const ref = adminDb.collection(COLLECTIONS.coupons).doc();
  await ref.set({
    code,
    discountType: body.discountType === 'flat' ? 'flat' : 'percent',
    discountValue: Number(body.discountValue) || 0,
    maxDiscount: body.maxDiscount ? Number(body.maxDiscount) : null,
    minAmount: body.minAmount ? Number(body.minAmount) : null,
    usageLimit: body.usageLimit ? Number(body.usageLimit) : null,
    perUserLimit: body.perUserLimit ? Number(body.perUserLimit) : null,
    usedCount: 0,
    active: body.active !== false,
    expiresAt: body.expiresAt ? Number(body.expiresAt) : null,
    appliesToPlans: Array.isArray(body.appliesToPlans) ? body.appliesToPlans : [],
    createdAt: Date.now(),
  });
  return NextResponse.json({ id: ref.id });
}

export async function PUT(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const { id } = body;
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const patch: Record<string, any> = { updatedAt: Date.now() };
  for (const key of ['discountType', 'discountValue', 'maxDiscount', 'minAmount', 'usageLimit', 'perUserLimit', 'active', 'expiresAt', 'appliesToPlans']) {
    if (key in body) patch[key] = body[key];
  }
  if (body.code) patch.code = String(body.code).trim().toUpperCase();

  await adminDb.collection(COLLECTIONS.coupons).doc(id).update(patch);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const admin = await requireAdmin(req);
  if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  await adminDb.collection(COLLECTIONS.coupons).doc(id).delete();
  return NextResponse.json({ ok: true });
}
