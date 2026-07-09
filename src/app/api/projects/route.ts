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

/** Create a project from a client-merged transcript (large-video chunked flow). */
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { title, videoUrl, language, transcript, durationSeconds } = await req.json();
    if (!videoUrl || !transcript?.segments?.length) {
      return NextResponse.json({ error: 'videoUrl and transcript.segments are required' }, { status: 400 });
    }
    const looksLikeFirebase = String(videoUrl).startsWith('https://firebasestorage.googleapis.com/');
    const ownsPath = String(videoUrl).includes(encodeURIComponent(`captionist/${user.uid}/`)) ||
      String(videoUrl).includes(`captionist%2F${user.uid}%2F`);
    if (!looksLikeFirebase || !ownsPath) {
      return NextResponse.json({ error: 'Invalid video URL' }, { status: 400 });
    }

    const ref = adminDb.collection(COLLECTIONS.projects).doc();
    const now = Date.now();
    const project = {
      uid: user.uid,
      title: title || 'Untitled',
      videoUrl,
      language: language || 'unknown',
      status: 'ready' as const,
      transcript: {
        text: transcript.segments.map((s: any) => s.text).join(' '),
        segments: transcript.segments.map((s: any, i: number) => ({
          id: i, start: Number(s.start) || 0, end: Number(s.end) || 0, text: String(s.text || '').trim(),
        })).filter((s: any) => s.text),
      },
      durationSeconds: Number(durationSeconds) || 0,
      createdAt: now,
      updatedAt: now,
    };
    await ref.set(project);
    return NextResponse.json({ project: { id: ref.id, ...project } });
  } catch (e: any) {
    console.error('[projects POST] error:', e?.message);
    return NextResponse.json({ error: e?.message || 'Create failed' }, { status: 500 });
  }
}