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
// Map the language NAMES the UI sends (from LANGUAGES) to Whisper ISO-639-1 codes.
// Whisper ignores an invalid value like "hindi" and silently auto-detects, which
// drops quiet segments — pinning the real code fixes accuracy.
const LANG_CODES: Record<string, string> = {
  hindi: 'hi', english: 'en', nepali: 'ne', urdu: 'ur', tamil: 'ta',
  malayalam: 'ml', gujarati: 'gu', bengali: 'bn', punjabi: 'pa', telugu: 'te',
  sindhi: 'sd', marathi: 'mr', kannada: 'kn', pushto: 'ps', pashto: 'ps', malay: 'ms',
};

// Short in-script priming samples bias Whisper toward the right language/script
// and improve continuity so it doesn't skip low-volume speech.
const PRIMING: Record<string, string> = {
  hi: 'नमस्ते। यह एक कहानी है। ध्यान से सुनिए।',
  mr: 'नमस्कार. ही एक गोष्ट आहे.',
  ne: 'नमस्ते। यो एउटा कथा हो।',
  ur: 'یہ ایک کہانی ہے۔',
  bn: 'এটি একটি গল্প।',
  ta: 'இது ஒரு கதை.',
  te: 'ఇది ఒక కథ.',
  ml: 'ഇതൊരു കഥയാണ്.',
  gu: 'આ એક વાર્તા છે.',
  kn: 'ಇದು ಒಂದು ಕಥೆ.',
  pa: 'ਇਹ ਇੱਕ ਕਹਾਣੀ ਹੈ।',
};

export async function transcribeFile(
  file: File,
  language?: string
): Promise<TranscriptionResult> {
  const buffer = Buffer.from(await file.arrayBuffer());
  return transcribeBuffer(buffer, file.name || 'audio.mp4', file.type || 'video/mp4', language);
}

/**
 * Transcribe raw bytes (used server-side after downloading the media from
 * Firebase Storage, so the video never has to pass through the API request
 * body — which on Vercel is capped at 4.5 MB).
 */
export async function transcribeBuffer(
  buffer: Buffer,
  filename: string,
  type: string,
  language?: string
): Promise<TranscriptionResult> {
  if (buffer.byteLength > MAX_BYTES) {
    throw new Error(
      `Audio is ${(buffer.byteLength / 1024 / 1024).toFixed(1)} MB, but OpenAI Whisper accepts a maximum of 25 MB. ` +
        `Use a shorter clip or a lower-bitrate file.`
    );
  }

  const openai = getOpenAI();
  const upload = await toFile(buffer, filename || 'audio.mp4', { type: type || 'video/mp4' });

  const langInput = (language || '').toLowerCase().trim();
  const langCode = LANG_CODES[langInput] || (langInput.length === 2 ? langInput : undefined);
  const prompt = langCode ? PRIMING[langCode] : undefined;

  let resp;
  try {
    resp = await openai.audio.transcriptions.create({
      file: upload,
      model: 'whisper-1',
      response_format: 'verbose_json',
      timestamp_granularities: ['segment'],
      temperature: 0,
      ...(langCode ? { language: langCode } : {}),
      ...(prompt ? { prompt } : {}),
    });
  } catch (e: any) {
    const cause = e?.cause?.code || e?.cause?.message || e?.code;
    const status = e?.status ? ` (HTTP ${e.status})` : '';
    const detail = cause ? ` [${cause}]` : '';
    throw new Error(`OpenAI request failed${status}${detail}: ${e?.message || 'unknown error'}`);
  }

  const r = resp as unknown as {
    language?: string;
    duration?: number;
    text: string;
    segments?: Array<{
      id: number; start: number; end: number; text: string;
      no_speech_prob?: number; avg_logprob?: number; compression_ratio?: number;
    }>;
  };

  const cleaned = cleanSegments(r.segments || []);
  const split = splitSegments(cleaned);

  return {
    language: r.language || language || 'unknown',
    duration: r.duration || 0,
    text: split.map((s) => s.text).join(' '),
    segments: split.map((s, i) => ({ id: i, start: s.start, end: s.end, text: s.text })),
  };
}

/* ── Accuracy post-processing ─────────────────────────────────────────────
 * Whisper "hallucinates" text over silence (especially at the very start) and
 * sometimes repeats. verbose_json gives per-segment confidence we can filter on.
 */
const HALLUCINATION_PATTERNS = [
  /thanks? for watching/i, /please subscribe/i, /subtitles? by/i,
  /amara\.org/i, /transcription by/i, /^\s*[♪♫\[\](){}]+\s*$/, /www\./i,
];

function cleanSegments(
  segs: Array<{ start: number; end: number; text: string; no_speech_prob?: number; avg_logprob?: number; compression_ratio?: number }>
): Array<{ start: number; end: number; text: string }> {
  const out: Array<{ start: number; end: number; text: string }> = [];
  for (const s of segs) {
    const text = (s.text || '').trim();
    if (!text) continue;

    const noSpeech = s.no_speech_prob ?? 0;
    const logprob = s.avg_logprob ?? 0;
    const compression = s.compression_ratio ?? 1;

    // Non-speech: Whisper is confident this span is silence/noise.
    if (noSpeech > 0.6 && logprob < -0.4) continue;
    // Very low confidence overall → likely garbage over quiet audio.
    if (logprob < -1.0) continue;
    // Repetition hallucination ("the the the…", looped phrases).
    if (compression > 2.4) continue;
    // Known boilerplate Whisper injects on silence.
    if (HALLUCINATION_PATTERNS.some((re) => re.test(text))) continue;
    // Degenerate single-token repeats.
    const words = text.split(/\s+/);
    if (words.length > 4 && new Set(words.map((w) => w.toLowerCase())).size <= 2) continue;

    out.push({ start: s.start, end: s.end, text });
  }
  return out;
}

/* Break long segments into short, single-line captions (~in sync, like Kalakar).
 * Timing is distributed across the split lines proportionally to character count. */
function splitSegments(
  segs: Array<{ start: number; end: number; text: string }>,
  maxChars = 32
): Array<{ start: number; end: number; text: string }> {
  const out: Array<{ start: number; end: number; text: string }> = [];
  for (const s of segs) {
    const dur = Math.max(0.2, s.end - s.start);
    const text = s.text.trim();
    if (text.length <= maxChars) { out.push(s); continue; }

    // Greedy word-wrap into <= maxChars chunks.
    const words = text.split(/\s+/);
    const chunks: string[] = [];
    let line = '';
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (test.length > maxChars && line) { chunks.push(line); line = w; }
      else line = test;
    }
    if (line) chunks.push(line);

    const totalChars = chunks.reduce((a, c) => a + c.length, 0) || 1;
    let t = s.start;
    for (const c of chunks) {
      const slice = (c.length / totalChars) * dur;
      out.push({ start: t, end: Math.min(s.end, t + slice), text: c });
      t += slice;
    }
  }
  return out;
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