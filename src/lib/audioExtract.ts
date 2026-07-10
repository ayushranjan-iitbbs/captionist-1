/**
 * Client-side audio extraction for large videos.
 *
 * Whisper accepts max 25 MB per file, but a 500 MB video's AUDIO is tiny once
 * re-encoded: 16 kHz mono @ 32 kbps ≈ 14 MB per HOUR. So we decode the video's
 * audio track in the browser, resample to 16 kHz mono (all Whisper uses
 * internally anyway), encode to MP3, and split into ~8-minute chunks so each
 * transcription request also fits inside Vercel Hobby's function timeout.
 */
import { Mp3Encoder } from '@breezystack/lamejs';

export interface AudioChunk {
  blob: Blob;        // MP3 data
  offsetSec: number; // where this chunk starts in the original video
  durationSec: number;
}

const TARGET_RATE = 16000;
const BITRATE_KBPS = 32;
const CHUNK_SECONDS = 8 * 60; // 8 min ≈ 1.9 MB per chunk, ~30-45s Whisper time

export async function extractAudioChunks(
  file: File,
  onProgress?: (label: string) => void
): Promise<AudioChunk[]> {
  onProgress?.('Reading file…');
  const arrayBuf = await file.arrayBuffer();

  onProgress?.('Decoding audio…');
  const AC = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
  // Decode directly AT 16 kHz: decodeAudioData resamples to the context's rate,
  // so we never hold full-rate PCM in memory (a 30-min stereo track at 48 kHz
  // would be ~700 MB of Float32 — at 16 kHz it's ~6x smaller). This is what
  // made 200-500 MB uploads die with an out-of-memory "cancel".
  let ctx: AudioContext;
  try { ctx = new AC({ sampleRate: TARGET_RATE }); } catch { ctx = new AC(); }
  let decoded: AudioBuffer;
  try {
    // pass the buffer directly (it gets detached) — no 500 MB slice() copy
    decoded = await ctx.decodeAudioData(arrayBuf);
  } finally {
    ctx.close().catch(() => {});
  }

  onProgress?.('Preparing audio…');
  // Downmix to mono in-place style (no OfflineAudioContext render buffer)
  const ch0 = decoded.getChannelData(0);
  let mono: Float32Array;
  if (decoded.numberOfChannels === 1) {
    mono = ch0;
  } else {
    const ch1 = decoded.getChannelData(1);
    mono = new Float32Array(ch0.length);
    for (let i = 0; i < ch0.length; i++) mono[i] = (ch0[i] + ch1[i]) / 2;
  }
  // If the browser ignored the 16 kHz context request, decimate manually
  if (decoded.sampleRate !== TARGET_RATE) {
    const ratio = decoded.sampleRate / TARGET_RATE;
    const out = new Float32Array(Math.floor(mono.length / ratio));
    for (let i = 0; i < out.length; i++) out[i] = mono[Math.floor(i * ratio)];
    mono = out;
  }

  // Float32 [-1,1] → Int16 PCM
  const pcm = new Int16Array(mono.length);
  for (let i = 0; i < mono.length; i++) {
    const s = Math.max(-1, Math.min(1, mono[i]));
    pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }

  const chunkFrames = CHUNK_SECONDS * TARGET_RATE;
  const chunks: AudioChunk[] = [];
  const total = Math.ceil(pcm.length / chunkFrames);

  for (let c = 0; c < total; c++) {
    onProgress?.(total > 1 ? `Encoding audio ${c + 1}/${total}…` : 'Encoding audio…');
    const slice = pcm.subarray(c * chunkFrames, Math.min((c + 1) * chunkFrames, pcm.length));
    const enc = new Mp3Encoder(1, TARGET_RATE, BITRATE_KBPS);
    const parts: Uint8Array[] = [];
    const BLOCK = 1152 * 20;
    for (let i = 0; i < slice.length; i += BLOCK) {
      const out = enc.encodeBuffer(slice.subarray(i, i + BLOCK));
      if (out.length) parts.push(new Uint8Array(out));
      if ((i / BLOCK) % 40 === 0) await new Promise((r) => setTimeout(r, 0)); // keep UI responsive
    }
    const end = enc.flush();
    if (end.length) parts.push(new Uint8Array(end));
    chunks.push({
      blob: new Blob(parts as BlobPart[], { type: 'audio/mpeg' }),
      offsetSec: c * CHUNK_SECONDS,
      durationSec: slice.length / TARGET_RATE,
    });
  }
  return chunks;
}