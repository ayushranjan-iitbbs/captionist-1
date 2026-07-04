import OpenAI, { toFile } from 'openai';

let client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY is not set');
    client = new OpenAI({
      apiKey,
      // Whisper uploads can be slow; give them room and retry transient drops.
      timeout: 120_000,
      maxRetries: 2,
      ...(process.env.OPENAI_BASE_URL ? { baseURL: process.env.OPENAI_BASE_URL } : {}),
    });
  }
  return client;
}

export interface TranscriptSegment {
  id: number;
  start: number;
  end: number;
  text: string;
}

export interface TranscriptionResult {
  language: string;
  duration: number;
  text: string;
  segments: TranscriptSegment[];
}

// OpenAI's Whisper endpoint hard-caps uploads at 25 MB.
const MAX_BYTES = 25 * 1024 * 1024;

/**
 * Transcribe an audio/video file with Whisper, returning verbose JSON with
 * per-segment timings (needed for the caption editor + SRT export).
 */
export async function transcribeFile(
  file: File,
  language?: string
): Promise<TranscriptionResult> {
  if (file.size > MAX_BYTES) {
    throw new Error(
      `File is ${(file.size / 1024 / 1024).toFixed(1)} MB, but OpenAI Whisper accepts a maximum of 25 MB. ` +
        `Trim the clip or extract the audio first.`
    );
  }

  const openai = getOpenAI();

  // Convert the Web File (from Next's formData) into a Buffer-backed upload via
  // the SDK's own toFile() helper. Passing the raw formData File straight to the
  // SDK can break its multipart streaming on Node/Windows and surface as
  // APIConnectionError / ECONNRESET. A materialized Buffer with an explicit
  // filename produces a clean, correctly-sized request.
  const buffer = Buffer.from(await file.arrayBuffer());
  const upload = await toFile(buffer, file.name || 'audio.mp4', {
    type: file.type || 'video/mp4',
  });

  let resp;
  try {
    resp = await openai.audio.transcriptions.create({
      file: upload,
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
      temperature: 0,
      ...(language ? { language } : {}),
    });
  } catch (e: any) {
    // Surface the REAL underlying reason instead of the SDK's opaque
    // "Connection error." — e.cause typically holds ETIMEDOUT / ENOTFOUND /
    // ECONNRESET / certificate errors when the request can't reach OpenAI.
    const cause = e?.cause?.code || e?.cause?.message || e?.code;
    const status = e?.status ? ` (HTTP ${e.status})` : '';
    const detail = cause ? ` [${cause}]` : '';
    throw new Error(`OpenAI request failed${status}${detail}: ${e?.message || 'unknown error'}`);
  }

  // verbose_json shape
  const r = resp as unknown as {
    language?: string;
    duration?: number;
    text: string;
    segments?: Array<{ id: number; start: number; end: number; text: string }>;
  };

  // Filter and clean segments: remove empty segments and very short leading silence
  let segments = (r.segments || [])
    .map((s) => ({
      id: s.id,
      start: s.start,
      end: s.end,
      text: s.text.trim(),
    }))
    .filter((s) => s.text.length > 0); // Remove empty segments

  // If segments exist, ensure they start at 0 or adjust first segment
  // This handles cases where there's silence before the actual content starts
  if (segments.length > 0 && segments[0].start > 0) {
    segments[0] = { ...segments[0], start: 0 };
  }

  const fullText = (r.text || '').trim();
  const joinedText = segments.map((s) => s.text).join(' ').replace(/\s+/g, ' ').trim();
  const rawWords = fullText ? fullText.split(/\s+/).length : 0;
  const segmentWords = joinedText ? joinedText.split(/\s+/).length : 0;

  // If segment coverage is incomplete, fall back to a single full-text segment
  if (fullText && segmentWords / Math.max(rawWords, 1) < 0.9) {
    segments = [{
      id: 0,
      start: 0,
      end: r.duration || 0,
      text: fullText,
    }];
  }

  return {
    language: r.language || language || 'unknown',
    duration: r.duration || 0,
    text: fullText,
    segments,
  };
}

/** Convert transcription segments to an SRT string. */
export function segmentsToSrt(segments: TranscriptSegment[]): string {
  const fmt = (t: number) => {
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const s = Math.floor(t % 60);
    const ms = Math.floor((t - Math.floor(t)) * 1000);
    const pad = (n: number, w = 2) => String(n).padStart(w, '0');
    return `${pad(h)}:${pad(m)}:${pad(s)},${pad(ms, 3)}`;
  };

  return segments
    .map((seg, i) => `${i + 1}\n${fmt(seg.start)} --> ${fmt(seg.end)}\n${seg.text}\n`)
    .join('\n');
}