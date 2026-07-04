import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';
import { transcribeFile } from '@/lib/openai';
import { adminDb } from '@/lib/firebaseAdmin';
import { COLLECTIONS } from '@/lib/collections';
import { PLANS } from '@/types';
import { FieldValue } from 'firebase-admin/firestore';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const form = await req.formData();
    const file = form.get('file') as File | null;
    const language = (form.get('language') as string) || undefined;
    const title = (form.get('title') as string) || file?.name || 'Untitled';
    const videoUrl = (form.get('videoUrl') as string) || undefined;

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    // Plan limit enforcement
    const plan = PLANS.find((p) => p.id === user.plan)!;
    const usedMin = user.usage.transcriptionSecondsUsed / 60;
    if (usedMin >= plan.limits.transcriptionMinutes) {
      return NextResponse.json(
        { error: 'Transcription limit reached for your plan. Please upgrade.' },
        { status: 402 }
      );
    }

    const result = await transcribeFile(file, language === 'auto' ? undefined : language);

    // Persist project
    const ref = adminDb.collection(COLLECTIONS.projects).doc();
    const now = Date.now();
    const project = {
      uid: user.uid,
      title,
      videoUrl: videoUrl || null,
      language: result.language,
      status: 'ready' as const,
      transcript: { text: result.text, segments: result.segments },
      durationSeconds: result.duration,
      createdAt: now,
      updatedAt: now,
    };
    await ref.set(project);

    // Update usage
    await adminDb
      .collection(COLLECTIONS.users)
      .doc(user.uid)
      .update({
        'usage.transcriptionSecondsUsed': FieldValue.increment(Math.round(result.duration)),
        updatedAt: now,
      });

    return NextResponse.json({ project: { id: ref.id, ...project } });
  } catch (e: any) {
    console.error('[transcribe] error:', e?.message, e?.cause || '');
    return NextResponse.json({ error: e?.message || 'Transcription failed' }, { status: 500 });
  }
}