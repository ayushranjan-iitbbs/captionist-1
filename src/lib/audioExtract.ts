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
  const probeCtx = new AC();
  let decoded: AudioBuffer;
  try {
    decoded = await probeCtx.decodeAudioData(arrayBuf.slice(0));
  } finally {
    probeCtx.close().catch(() => {});
  }

  onProgress?.('Resampling…');
  const frames = Math.ceil(decoded.duration * TARGET_RATE);
  const off = new OfflineAudioContext(1, frames, TARGET_RATE);
  const src = off.createBufferSource();
  src.buffer = decoded;
  src.connect(off.destination);
  src.start();
  const mono = (await off.startRendering()).getChannelData(0);

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