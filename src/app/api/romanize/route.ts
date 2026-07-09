import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';
import { getOpenAI } from '@/lib/openai';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Transliterate caption lines from their native script into Roman (Latin)
 * letters — same words, different script (e.g. "नमस्ते" -> "Namaste").
 * Returns { roman: string[] } aligned 1:1 with the input lines.
 */
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { lines } = (await req.json()) as { lines: string[] };
    if (!Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json({ error: 'lines[] required' }, { status: 400 });
    }

    const openai = getOpenAI();
    const roman: string[] = [];
    const CHUNK = 50;

    for (let i = 0; i < lines.length; i += CHUNK) {
      const chunk = lines.slice(i, i + CHUNK);
      const resp = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You transliterate text into the Roman (Latin) alphabet. Keep the SAME words and ' +
              'meaning — only change the script (e.g. Hindi "नमस्ते दोस्तों" -> "Namaste doston"). ' +
              'Do NOT translate to English. If a line is already Latin, return it unchanged.',
          },
          {
            role: 'user',
            content:
              'Return ONLY a JSON object {"items": string[]} with exactly the same length and order ' +
              'as the input array. Input:\n' + JSON.stringify(chunk),
          },
        ],
      });
      let items: string[] = [];
      try { items = JSON.parse(resp.choices[0].message.content || '{}').items || []; } catch { items = chunk; }
      if (items.length !== chunk.length) items = chunk;
      roman.push(...items.map((s) => String(s)));
    }

    return NextResponse.json({ roman });
  } catch (e: any) {
    console.error('[romanize] error:', e?.message);
    return NextResponse.json({ error: e?.message || 'Romanize failed' }, { status: 500 });
  }
}