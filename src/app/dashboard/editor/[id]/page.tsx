'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { authFetch } from '@/lib/authFetch';
import { useAuth } from '@/context/AuthContext';
import toast from 'react-hot-toast';
import type { Project } from '@/types';
import {
  ArrowLeft, Download, FileText, Loader2, Save, Trash2, Search, Settings2,
  Play, Pause, Volume2, VolumeX, Maximize2, ZoomIn, ZoomOut, RefreshCw,
  Type as TypeIcon, Music, Captions as CaptionsIcon, Sparkles, Plus,
  ChevronLeft, ChevronRight, Wand2, LayoutTemplate, Layers, X, PanelLeft, PanelRight,
} from 'lucide-react';

/* ─────────────────────────── types & helpers ─────────────────────────── */

interface Seg { id: number; start: number; end: number; text: string }

interface CaptionStyle {
  fontFamily: string;
  fontWeight: number;
  fontSize: number;
  bold: boolean; italic: boolean; underline: boolean; uppercase: boolean;
  align: 'left' | 'center' | 'right';
  posX: number; posY: number;
  colorMode: 'solid' | 'gradient';
  color: string; color2: string;
  dropShadow: boolean; textStroke: boolean; background: boolean;
  transition: string;
  letterSpacing: number; lineHeight: number;
}

const DEFAULT_STYLE: CaptionStyle = {
  fontFamily: "'Inter', sans-serif", fontWeight: 800, fontSize: 32,
  bold: true, italic: false, underline: false, uppercase: true,
  align: 'left', posX: 4, posY: 82,
  colorMode: 'solid', color: '#FFFFFF', color2: '#4f8cff',
  dropShadow: true, textStroke: false, background: true,
  transition: 'fade', letterSpacing: 0, lineHeight: 1.25,
};

const FONTS = [
  { label: 'Inter', family: "'Inter', sans-serif" },
  { label: 'Poppins', family: "'Poppins', sans-serif" },
  { label: 'Montserrat', family: "'Montserrat', sans-serif" },
  { label: 'Roboto', family: "'Roboto', sans-serif" },
  { label: 'Oswald', family: "'Oswald', sans-serif" },
  { label: 'Bebas Neue', family: "'Bebas Neue', sans-serif" },
  { label: 'Anton', family: "'Anton', sans-serif" },
  { label: 'Luckiest Guy', family: "'Luckiest Guy', cursive" },
  { label: 'Archivo Black', family: "'Archivo Black', sans-serif" },
  { label: 'Playfair Display', family: "'Playfair Display', serif" },
];
const GOOGLE_FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Poppins:wght@400;600;700;800&family=Montserrat:wght@400;600;700;800&family=Roboto:wght@400;500;700&family=Oswald:wght@400;600;700&family=Bebas+Neue&family=Anton&family=Luckiest+Guy&family=Archivo+Black&family=Playfair+Display:wght@600;700;800&display=swap';

const WEIGHTS = [
  { label: 'Regular', value: 400 }, { label: 'Medium', value: 500 },
  { label: 'Semibold', value: 600 }, { label: 'Bold', value: 700 }, { label: 'Black', value: 900 },
];

const TEMPLATES: { name: string; tag: string; patch: Partial<CaptionStyle> }[] = [
  { name: 'Kalakar Glow', tag: 'Bold · Shadow', patch: { fontFamily: "'Luckiest Guy', cursive", color: '#b6ff3a', uppercase: true, dropShadow: true, background: false, fontWeight: 400 } },
  { name: 'Ali Abdaal', tag: 'Clean', patch: { fontFamily: "'Inter', sans-serif", color: '#0b1220', background: true, uppercase: false, dropShadow: false, fontWeight: 800 } },
  { name: 'Bold Title', tag: 'Impact', patch: { fontFamily: "'Anton', sans-serif", color: '#ffffff', uppercase: true, textStroke: true, background: false, fontWeight: 400 } },
  { name: 'Emphasis', tag: 'Accent', patch: { fontFamily: "'Poppins', sans-serif", colorMode: 'gradient', color: '#4f8cff', color2: '#38D2F5', uppercase: true, fontWeight: 800 } },
  { name: 'Lower Third', tag: 'Subtle', patch: { fontFamily: "'Montserrat', sans-serif", color: '#ffffff', background: true, align: 'left', posX: 22, posY: 88, uppercase: false, fontWeight: 700 } },
  { name: 'Highlight', tag: 'Pop', patch: { fontFamily: "'Bebas Neue', sans-serif", color: '#ffffff', background: true, uppercase: true, fontWeight: 400, fontSize: 40 } },
];

const TRANSITIONS = [
  { id: 'none', name: 'None' }, { id: 'fade', name: 'Fade' }, { id: 'pop', name: 'Pop' },
  { id: 'zoom', name: 'Zoom' }, { id: 'scale', name: 'Scale' }, { id: 'slide', name: 'Slide L/R' },
  { id: 'slideup', name: 'Slide Up/Down' },
];
const ANIM_CLASS: Record<string, string> = {
  none: '', fade: 'cap-fade', pop: 'cap-pop', zoom: 'cap-zoom',
  scale: 'cap-scale', slide: 'cap-slide', slideup: 'cap-slideup',
};

const pad = (n: number, w = 2) => String(Math.floor(n)).padStart(w, '0');
const srtTime = (t: number) => `${pad(t / 3600)}:${pad((t % 3600) / 60)}:${pad(t % 60)},${pad((t - Math.floor(t)) * 1000, 3)}`;
const tc = (t: number) => `${pad(t / 60)}:${pad(t % 60)}:${pad((t % 1) * 100)}`;
const clock = (t: number) => `${Math.floor(t / 60)}:${pad(t % 60)}`;
const buildSrt = (s: Seg[]) => s.map((x, i) => `${i + 1}\n${srtTime(x.start)} --> ${srtTime(x.end)}\n${x.text}\n`).join('\n');

function waveHeights(count: number): number[] {
  const out: number[] = [];
  let seed = 1337;
  for (let i = 0; i < count; i++) {
    seed = (seed * 9301 + 49297) % 233280;
    const r = seed / 233280;
    const env = 0.35 + 0.65 * Math.abs(Math.sin(i / 7) * Math.cos(i / 23));
    out.push(0.12 + r * 0.55 * env);
  }
  return out;
}

/* wrap text into lines that fit maxWidth (for canvas export) */
function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = w; }
    else line = test;
  }
  if (line) lines.push(line);
  return lines.length ? lines : [text];
}

/* ───────────────────────────── component ─────────────────────────────── */

export default function EditorPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);

  // audio graph (created once per video element)
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioSrcRef = useRef<MediaElementAudioSourceNode | null>(null);
  const audioDestRef = useRef<MediaStreamAudioDestinationNode | null>(null);

  const [project, setProject] = useState<Project | null>(null);
  const [segments, setSegments] = useState<Seg[]>([]);
  const [title, setTitle] = useState('');
  const [style, setStyle] = useState<CaptionStyle>(DEFAULT_STYLE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const [videoDownloading, setVideoDownloading] = useState(false);
  const [exportPct, setExportPct] = useState(0);

  const [tab, setTab] = useState<'text' | 'templates' | 'transitions' | 'audio'>('text');
  const [tlMode, setTlMode] = useState<'word' | 'line'>('line');
  const [pxPerSec, setPxPerSec] = useState(26);
  const [search, setSearch] = useState('');
  const [mobilePanel, setMobilePanel] = useState<'none' | 'captions' | 'inspector'>('none');

  const [dbTemplates, setDbTemplates] = useState<any[]>([]);
  const [dbTransitions, setDbTransitions] = useState<any[]>([]);

  const markDirty = () => setDirty(true);
  const patchStyle = (p: Partial<CaptionStyle>) => { setStyle((s) => ({ ...s, ...p })); markDirty(); };

  useEffect(() => {
    if (document.querySelector('link[data-editor-fonts]')) return;
    const l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = GOOGLE_FONTS_HREF; l.dataset.editorFonts = '1';
    document.head.appendChild(l);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const [t, tr] = await Promise.all([
          authFetch('/api/admin/content?type=templates'),
          authFetch('/api/admin/content?type=transitions'),
        ]);
        if (t.ok) setDbTemplates((await t.json()).items || []);
        if (tr.ok) setDbTransitions((await tr.json()).items || []);
      } catch { /* non-fatal */ }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const res = await authFetch(`/api/projects/${id}`);
      if (res.ok) {
        const { project: p } = await res.json();
        setProject(p);
        setTitle(p.title);
        setSegments((p.transcript?.segments || []) as Seg[]);
        if (p.style) setStyle({ ...DEFAULT_STYLE, ...p.style });
        setDuration(p.durationSeconds || 0);
      } else {
        toast.error('Could not load project');
        router.replace('/dashboard/projects');
      }
      setLoading(false);
    })();
  }, [id, router]);

  const totalDur = useMemo(() => duration || segments[segments.length - 1]?.end || 1, [duration, segments]);

  const onTime = useCallback(() => {
    const t = videoRef.current?.currentTime ?? 0;
    setCurrent(t);
    setActiveIdx(segments.findIndex((s) => t >= s.start && t <= s.end));
  }, [segments]);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onMeta = () => { if (v.duration && isFinite(v.duration)) setDuration(v.duration); };
    v.addEventListener('play', onPlay); v.addEventListener('pause', onPause); v.addEventListener('loadedmetadata', onMeta);
    return () => { v.removeEventListener('play', onPlay); v.removeEventListener('pause', onPause); v.removeEventListener('loadedmetadata', onMeta); };
  }, [project?.videoUrl]);

  useEffect(() => {
    const el = timelineRef.current;
    if (!el) return;
    const x = current * pxPerSec;
    if (x < el.scrollLeft + 60 || x > el.scrollLeft + el.clientWidth - 120) el.scrollLeft = Math.max(0, x - el.clientWidth / 2);
  }, [current, pxPerSec]);

  const togglePlay = () => { const v = videoRef.current; if (!v) return; if (v.paused) v.play().catch(() => {}); else v.pause(); };
  const seekTo = (t: number) => { const v = videoRef.current; if (!v) return; v.currentTime = t; setCurrent(t); };
  const toggleMute = () => { const v = videoRef.current; if (!v) return; v.muted = !v.muted; setMuted(v.muted); };
  const goFullscreen = () => stageRef.current?.requestFullscreen?.().catch(() => {});

  const updateText = (i: number, text: string) => { setSegments((p) => p.map((s, x) => (x === i ? { ...s, text } : s))); markDirty(); };
  const removeSeg = (i: number) => { setSegments((p) => p.filter((_, x) => x !== i)); markDirty(); };
  const addLineAtPlayhead = () => {
    const seg: Seg = { id: Date.now(), start: current, end: Math.min(totalDur, current + 2), text: 'New caption' };
    setSegments((p) => [...p, seg].sort((a, b) => a.start - b.start)); markDirty();
  };

  const save = async () => {
    setSaving(true);
    const text = segments.map((s) => s.text).join(' ');
    const res = await authFetch(`/api/projects/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, transcript: { text, segments }, style }),
    });
    setSaving(false);
    if (res.ok) { setDirty(false); toast.success('Saved'); } else toast.error('Save failed');
  };

  const download = (data: string, name: string) => {
    const url = URL.createObjectURL(new Blob([data], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
  };
  const safeName = (title || 'captions').replace(/[^\w-]+/g, '_');
  const cleanAudio = () => toast.success('Audio enhancement is applied at export time.');

  /* ── canvas caption renderer (full, wrapped, non-clipping) ── */
  const drawExportFrame = (ctx: CanvasRenderingContext2D, W: number, H: number, time: number) => {
    const v = videoRef.current;
    if (v && v.readyState >= 2) ctx.drawImage(v, 0, 0, W, H);
    else { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H); }

    const active = segments.find((s) => time >= s.start && time <= s.end);
    let text = active?.text || '';
    if (!text) return;
    if (style.uppercase) text = text.toUpperCase();

    const scale = H / 720;                       // scale styling to real resolution
    let fs = style.fontSize * scale * 1.6;
    const weight = style.bold ? Math.max(style.fontWeight, 700) : style.fontWeight;
    ctx.font = `${style.italic ? 'italic ' : ''}${weight} ${fs}px ${style.fontFamily}`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';

    const maxW = W * 0.94;
    while (fs > 12 && ctx.measureText(text).width > maxW) {
      fs -= 1;
      ctx.font = `${style.italic ? 'italic ' : ''}${weight} ${fs}px ${style.fontFamily}`;
    }
    const textWidth = Math.min(ctx.measureText(text).width, maxW);
    const lh = fs * Math.max(style.lineHeight, 1.15);
    const blockH = lh;
    const cx = W * 0.02;
    let cy = H * (style.posY / 100);
    cy = Math.min(H - blockH / 2 - 8, Math.max(blockH / 2 + 8, cy));

    if (style.background) {
      const padX = fs * 0.35, padY = fs * 0.22;
      const bw = textWidth + padX * 2, bh = blockH + padY * 2;
      const bx = cx - padX;
      ctx.fillStyle = 'rgba(0,0,0,0.72)';
      const r = fs * 0.25;
      const by = cy - bh / 2;
      ctx.beginPath();
      ctx.moveTo(bx + r, by);
      ctx.arcTo(bx + bw, by, bx + bw, by + bh, r);
      ctx.arcTo(bx + bw, by + bh, bx, by + bh, r);
      ctx.arcTo(bx, by + bh, bx, by, r);
      ctx.arcTo(bx, by, bx + bw, by, r);
      ctx.closePath(); ctx.fill();
    }

    if (style.dropShadow) { ctx.shadowColor = 'rgba(0,0,0,.85)'; ctx.shadowBlur = 18 * scale; ctx.shadowOffsetY = 4 * scale; }
    else { ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0; }

    if (style.colorMode === 'gradient') {
      const g = ctx.createLinearGradient(0, 0, W, 0); g.addColorStop(0, style.color); g.addColorStop(1, style.color2); ctx.fillStyle = g;
    } else ctx.fillStyle = style.color;

    const y = cy;
    if (style.textStroke) { ctx.lineWidth = Math.max(2, fs * 0.06); ctx.strokeStyle = 'rgba(0,0,0,.9)'; ctx.strokeText(text, cx, y); }
    ctx.fillText(text, cx, y);
    ctx.shadowColor = 'transparent';
  };

  const ensureAudioTracks = (video: HTMLVideoElement): MediaStreamTrack[] => {
    try {
      if (!audioCtxRef.current) {
        const Ctx = (window.AudioContext || (window as any).webkitAudioContext) as typeof AudioContext;
        const ctx = new Ctx();
        const src = ctx.createMediaElementSource(video);
        const dest = ctx.createMediaStreamDestination();
        src.connect(dest);
        src.connect(ctx.destination); // keep normal playback audible
        audioCtxRef.current = ctx; audioSrcRef.current = src; audioDestRef.current = dest;
      }
      audioCtxRef.current.resume().catch(() => {});
      return audioDestRef.current!.stream.getAudioTracks();
    } catch (e) {
      console.warn('[export] audio unavailable:', e);
      return [];
    }
  };

  const downloadVideo = async () => {
    const video = videoRef.current, canvas = canvasRef.current;
    if (!project?.videoUrl || !video || !canvas) { toast.error('Video not ready'); return; }

    const W = video.videoWidth || 1280;
    const H = video.videoHeight || Math.round(W * 9 / 16);
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) { toast.error('Canvas unavailable'); return; }

    // Taint check — if the video is cross-origin without CORS, bail early with guidance.
    try { ctx.drawImage(video, 0, 0, W, H); canvas.toDataURL(); }
    catch {
      toast.error('Cannot export: enable CORS on your Storage bucket (see setup) and reload.');
      return;
    }

    const canvasStream = canvas.captureStream?.(30);
    if (!canvasStream) { toast.error('Browser does not support canvas capture'); return; }
    const audioTracks = ensureAudioTracks(video);
    const outputStream = new MediaStream([...canvasStream.getVideoTracks(), ...audioTracks]);

    setVideoDownloading(true); setExportPct(0);
    const wasTime = video.currentTime, wasPaused = video.paused;

    try {
      const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp8')
        ? 'video/webm;codecs=vp8' : 'video/webm';
      const recorder = new MediaRecorder(outputStream, { mimeType: mime, videoBitsPerSecond: 8_000_000 });
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      const done = new Promise<Blob>((res, rej) => {
        recorder.onstop = () => res(new Blob(chunks, { type: 'video/webm' }));
        recorder.onerror = () => rej(new Error('Recording failed'));
      });

      let raf = 0;
      const loop = () => {
        drawExportFrame(ctx, W, H, video.currentTime);
        setExportPct(Math.min(99, Math.round((video.currentTime / (video.duration || totalDur)) * 100)));
        raf = requestAnimationFrame(loop);
      };

      recorder.start(100);
      raf = requestAnimationFrame(loop);
      video.currentTime = 0;
      await video.play();

      await new Promise<void>((resolve) => {
        const end = () => { video.removeEventListener('ended', end); resolve(); };
        video.addEventListener('ended', end);
      });

      recorder.stop();
      cancelAnimationFrame(raf);
      const blob = await done;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = `${safeName}.webm`; a.click();
      URL.revokeObjectURL(url);
      toast.success('Captioned video downloaded');
    } catch (e: any) {
      toast.error(e?.message || 'Export failed');
    } finally {
      video.pause(); video.currentTime = wasTime; if (!wasPaused) video.play().catch(() => {});
      setVideoDownloading(false); setExportPct(0);
    }
  };

  /* ── live preview overlay (non-clipping, wraps) ── */
  const activeText = activeIdx >= 0 ? segments[activeIdx]?.text : '';
  const overlayText = style.uppercase ? (activeText || '').toUpperCase() : activeText;
  const captionColor = style.colorMode === 'gradient' ? 'transparent' : style.color;
  const overlayStyle: React.CSSProperties = {
    position: 'absolute', left: '2%', top: `${style.posY}%`,
    transform: 'translate(0,-50%)',
    width: '96%',
    fontFamily: style.fontFamily, fontWeight: style.bold ? Math.max(style.fontWeight, 700) : style.fontWeight,
    fontSize: `clamp(14px, ${style.fontSize / 12}vw, ${style.fontSize * 1.35}px)`,
    fontStyle: style.italic ? 'italic' : 'normal',
    textDecoration: style.underline ? 'underline' : 'none',
    textAlign: 'left', letterSpacing: `${style.letterSpacing}px`, lineHeight: Math.max(style.lineHeight, 1.2),
    color: captionColor,
    ...(style.colorMode === 'gradient'
      ? { backgroundImage: `linear-gradient(90deg, ${style.color}, ${style.color2})`, WebkitBackgroundClip: 'text', backgroundClip: 'text' as any }
      : {}),
    background: style.background ? 'rgba(0,0,0,0.72)' : 'transparent',
    padding: style.background ? '0.3em 0.6em' : 0,
    borderRadius: style.background ? '0.5em' : 0,
    textShadow: style.dropShadow ? '0 4px 18px rgba(0,0,0,.8)' : 'none',
    WebkitTextStroke: style.textStroke ? '1.5px rgba(0,0,0,.9)' : (undefined as any),
    pointerEvents: 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'clip',
  };

  const filtered = segments.map((s, i) => ({ s, i })).filter(({ s }) => !search || s.text.toLowerCase().includes(search.toLowerCase()));

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center" style={{ background: 'var(--editor-bg)' }}>
        <Loader2 className="animate-spin" style={{ color: 'var(--accent)' }} size={30} />
      </div>
    );
  }

  const CaptionRail = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-2 px-4 pt-4">
        <h2 className="text-lg font-extrabold">Captions</h2>
        <div className="surface flex items-center gap-2 px-2.5 py-1.5" style={{ background: 'var(--editor-panel)' }}>
          <Search size={14} style={{ color: 'var(--text-muted)' }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" className="w-20 bg-transparent text-xs outline-none" />
        </div>
      </div>
      <div className="px-4 pb-3 pt-2">
        <button className="surface flex w-full items-center justify-between px-3 py-2 text-sm font-semibold" style={{ background: 'var(--editor-panel)' }}>
          <span className="flex items-center gap-2"><Settings2 size={14} style={{ color: 'var(--accent)' }} /> Caption Tools</span>
          <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
        </button>
      </div>
      <div className="editor-scroll min-h-0 flex-1 space-y-1.5 overflow-y-auto px-3 pb-4">
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-xs" style={{ color: 'var(--text-muted)' }}>No captions</p>
        ) : filtered.map(({ s, i }) => (
          <div key={s.id ?? i} onClick={() => { setSelectedIdx(i); seekTo(s.start); }}
            className="group flex cursor-pointer items-center gap-3 rounded-2xl border px-3 py-2.5 transition"
            style={{
              background: i === activeIdx ? 'rgba(79,140,255,0.10)' : 'var(--editor-surface)',
              borderColor: i === selectedIdx ? 'var(--accent)' : i === activeIdx ? 'rgba(79,140,255,0.4)' : 'var(--editor-border)',
            }}>
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-bold"
              style={{ background: i === activeIdx ? 'var(--accent)' : 'var(--editor-panel)', color: i === activeIdx ? '#fff' : 'var(--text-muted)' }}>{i + 1}</span>
            <input value={s.text} onChange={(e) => updateText(i, e.target.value)} onFocus={() => setSelectedIdx(i)} className="flex-1 bg-transparent text-sm outline-none" />
            <button onClick={(e) => { e.stopPropagation(); removeSeg(i); }} className="shrink-0 opacity-0 transition group-hover:opacity-100" style={{ color: '#ef4444' }}><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
    </div>
  );

  const Inspector = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex gap-1 border-b px-3 pt-3" style={{ borderColor: 'var(--editor-border)' }}>
        {[{ id: 'text', label: 'Text' }, { id: 'templates', label: 'Templates' }, { id: 'transitions', label: 'Transitions' }, { id: 'audio', label: 'AI Audio' }].map((t) => {
          const on = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id as typeof tab)} className="relative px-2.5 py-2.5 text-xs font-semibold transition" style={{ color: on ? 'var(--accent)' : 'var(--text-muted)' }}>
              {t.label}{on && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full" style={{ background: 'var(--accent)' }} />}
            </button>
          );
        })}
      </div>

      <div className="editor-scroll min-h-0 flex-1 overflow-y-auto p-4">
        {tab === 'text' && (
          <div className="space-y-5">
            <div className="surface p-3" style={{ background: 'var(--editor-panel)' }}>
              <div className="mb-2 flex items-center justify-between"><span className="text-xs font-bold">Editing Line</span><span className="text-[11px]" style={{ color: 'var(--accent)' }}>select a caption</span></div>
              <input value={selectedIdx >= 0 ? segments[selectedIdx]?.text ?? '' : ''} onChange={(e) => selectedIdx >= 0 && updateText(selectedIdx, e.target.value)} placeholder="Edit line text…" className="input !py-2.5 text-sm" />
              <button onClick={() => setSelectedIdx(-1)} className="btn-ghost mt-2 w-full !py-2 text-xs">Clear Selection</button>
            </div>

            <Section title="Fonts">
              <Field label="Font Family">
                <select className="input !py-2 text-sm" value={style.fontFamily} onChange={(e) => patchStyle({ fontFamily: e.target.value })}>
                  {FONTS.map((f) => <option key={f.label} value={f.family}>{f.label}</option>)}
                </select>
              </Field>
              <Field label="Font Face">
                <select className="input !py-2 text-sm" value={style.fontWeight} onChange={(e) => patchStyle({ fontWeight: Number(e.target.value) })}>
                  {WEIGHTS.map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}
                </select>
              </Field>
              <div className="flex items-center gap-3">
                <input type="range" min={12} max={72} value={style.fontSize} className="flex-1" onChange={(e) => patchStyle({ fontSize: Number(e.target.value) })} />
                <div className="surface flex w-20 items-center justify-between px-2 py-1.5 text-sm" style={{ background: 'var(--editor-panel)' }}><span>{style.fontSize}</span><span style={{ color: 'var(--text-muted)' }}>px</span></div>
                <button onClick={() => patchStyle({ fontSize: DEFAULT_STYLE.fontSize })} title="Reset" className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: 'var(--editor-panel)' }}><RefreshCw size={13} /></button>
              </div>
            </Section>

            <Section title="Format">
              <label className="mb-1.5 block text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Styles</label>
              <div className="grid grid-cols-4 gap-2">
                <Toggle active={style.uppercase} onClick={() => patchStyle({ uppercase: !style.uppercase })}><span className="text-sm font-bold">Tt</span></Toggle>
                <Toggle active={style.bold} onClick={() => patchStyle({ bold: !style.bold })}><span className="text-sm font-black">T</span></Toggle>
                <Toggle active={style.italic} onClick={() => patchStyle({ italic: !style.italic })}><span className="text-sm font-bold italic">t</span></Toggle>
                <Toggle active={style.underline} onClick={() => patchStyle({ underline: !style.underline })}><span className="text-sm font-bold underline">U</span></Toggle>
              </div>
              <label className="mb-1.5 mt-4 block text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Text Alignment</label>
              <div className="grid grid-cols-3 gap-2">
                {(['left', 'center', 'right'] as const).map((a) => (
                  <Toggle key={a} active={style.align === a} onClick={() => patchStyle({ align: a })}>
                    <div className="flex w-full flex-col gap-0.5 px-1" style={{ alignItems: a === 'left' ? 'flex-start' : a === 'right' ? 'flex-end' : 'center' }}>
                      <span className="block h-0.5 w-4 rounded bg-current" /><span className="block h-0.5 w-2.5 rounded bg-current" /><span className="block h-0.5 w-4 rounded bg-current" />
                    </div>
                  </Toggle>
                ))}
              </div>
            </Section>

            <Section title="Position">
              <div className="grid grid-cols-2 gap-3">
                <Field label="X %"><input type="number" className="input !py-2 text-sm" value={Math.round(style.posX)} onChange={(e) => patchStyle({ posX: Math.max(0, Math.min(100, Number(e.target.value))) })} /></Field>
                <Field label="Y %"><input type="number" className="input !py-2 text-sm" value={Math.round(style.posY)} onChange={(e) => patchStyle({ posY: Math.max(0, Math.min(100, Number(e.target.value))) })} /></Field>
              </div>
            </Section>

            <Section title="Color">
              <div className="mb-2 grid grid-cols-2 gap-2">
                <Toggle active={style.colorMode === 'solid'} onClick={() => patchStyle({ colorMode: 'solid' })}><span className="text-xs font-semibold">Solid</span></Toggle>
                <Toggle active={style.colorMode === 'gradient'} onClick={() => patchStyle({ colorMode: 'gradient' })}><span className="text-xs font-semibold">Gradient</span></Toggle>
              </div>
              <div className="flex items-center gap-2">
                <input type="color" value={style.color} onChange={(e) => patchStyle({ color: e.target.value })} className="h-9 w-10 shrink-0 cursor-pointer rounded-lg border-0 bg-transparent" />
                <input value={style.color} onChange={(e) => patchStyle({ color: e.target.value })} className="input !py-2 text-sm font-mono uppercase" />
                {style.colorMode === 'gradient' && <input type="color" value={style.color2} onChange={(e) => patchStyle({ color2: e.target.value })} className="h-9 w-10 shrink-0 cursor-pointer rounded-lg border-0 bg-transparent" />}
              </div>
            </Section>

            <Section title="Spacing">
              <Field label={`Letter spacing (${style.letterSpacing}px)`}><input type="range" min={-2} max={12} value={style.letterSpacing} className="w-full" onChange={(e) => patchStyle({ letterSpacing: Number(e.target.value) })} /></Field>
              <Field label={`Line height (${style.lineHeight.toFixed(2)})`}><input type="range" min={1} max={2} step={0.05} value={style.lineHeight} className="w-full" onChange={(e) => patchStyle({ lineHeight: Number(e.target.value) })} /></Field>
            </Section>

            <Section title="Effects">
              <SwitchRow label="Drop Shadow" on={style.dropShadow} onClick={() => patchStyle({ dropShadow: !style.dropShadow })} />
              <SwitchRow label="Text Stroke" on={style.textStroke} onClick={() => patchStyle({ textStroke: !style.textStroke })} />
              <SwitchRow label="Background" on={style.background} onClick={() => patchStyle({ background: !style.background })} />
            </Section>
          </div>
        )}

        {tab === 'templates' && (
          <div className="space-y-3">
            {(dbTemplates.length > 0 ? dbTemplates : TEMPLATES).map((t: any, idx: number) => {
              const patch = t.patch || {
                fontFamily: t.fontFamily || DEFAULT_STYLE.fontFamily,
                fontWeight: parseInt(t.fontWeight) || DEFAULT_STYLE.fontWeight,
                fontSize: parseInt(t.fontSize) || DEFAULT_STYLE.fontSize,
                bold: t.bold === 'true' || t.bold === true,
                uppercase: t.uppercase === 'true' || t.uppercase === true,
                color: t.color || DEFAULT_STYLE.color,
                dropShadow: t.dropShadow !== 'false' && t.dropShadow !== false,
                background: t.background !== 'false' && t.background !== false,
              };
              return (
                <button key={t.id || t.name || idx} onClick={() => { patchStyle(patch); toast.success(`${t.name} applied`); }}
                  className="surface w-full p-4 text-left transition hover:opacity-90" style={{ background: 'var(--editor-surface)', borderColor: 'var(--editor-border)' }}>
                  <div className="mb-3 flex items-center justify-between"><span className="font-bold">{t.name}</span><span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{t.tag || 'Custom'}</span></div>
                  <div className="grid h-16 place-items-center rounded-xl" style={{ background: 'var(--editor-panel)' }}>
                    <span style={{
                      fontFamily: patch.fontFamily, fontWeight: patch.fontWeight,
                      color: patch.colorMode === 'gradient' ? 'transparent' : patch.color,
                      backgroundImage: patch.colorMode === 'gradient' ? `linear-gradient(90deg, ${patch.color}, ${patch.color2})` : undefined,
                      WebkitBackgroundClip: patch.colorMode === 'gradient' ? 'text' : undefined,
                      textShadow: patch.dropShadow ? '0 2px 12px rgba(0,0,0,.6)' : undefined,
                      background: patch.background ? '#fff' : undefined,
                      padding: patch.background ? '4px 10px' : undefined, borderRadius: patch.background ? 8 : undefined, fontSize: 18,
                    }}>{patch.uppercase ? 'PREVIEW' : 'Preview'}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {tab === 'transitions' && (
          <div>
            <p className="mb-3 text-sm font-semibold">Applied on <span style={{ color: 'var(--accent)' }}>{tlMode === 'line' ? 'Line' : 'Word'}</span></p>
            <div className="grid grid-cols-3 gap-3">
              {(dbTransitions.length > 0 ? dbTransitions : TRANSITIONS).map((tr: any, idx: number) => {
                const trId = tr.id || tr.name?.toLowerCase().replace(/\s+/g, '-') || `t${idx}`;
                const on = style.transition === trId;
                return (
                  <button key={trId} onClick={() => patchStyle({ transition: trId })} className="surface grid aspect-square place-items-center gap-2 p-2 text-center transition"
                    style={{ background: 'var(--editor-surface)', borderColor: on ? 'var(--accent)' : 'var(--editor-border)' }}>
                    <span className="grid h-9 w-9 place-items-center rounded-full" style={{ background: 'var(--editor-panel)' }}><span className="h-3.5 w-3.5 rounded-sm" style={{ background: on ? 'var(--accent)' : 'var(--text-muted)' }} /></span>
                    <span className="text-[11px] font-semibold leading-tight">{tr.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'audio' && (
          <div className="space-y-4 text-center">
            <span className="surface inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold" style={{ background: 'var(--editor-panel)', color: 'var(--accent)' }}><Sparkles size={13} /> AI-Powered</span>
            <h3 className="text-xl font-extrabold">Audio Enhancement</h3>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Clean up your audio, remove background noise & enhance overall quality.</p>
            <button onClick={cleanAudio} className="btn-primary w-full !py-3"><Wand2 size={16} /> Clean Audio</button>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs" style={{ color: 'var(--text-muted)' }}><span>• Noise Reduction</span><span>• Voice Enhancement</span><span>• Normalize</span></div>
            <div className="surface flex items-center gap-3 p-3 text-left" style={{ background: 'var(--editor-panel)' }}>
              <Sparkles size={16} style={{ color: 'var(--accent)' }} />
              <div><p className="text-sm font-bold">Remaining Credits</p><p className="text-xs" style={{ color: 'var(--text-muted)' }}>{Math.max(0, 100 - (user?.usage.audioCleansUsed || 0))} credits available</p></div>
            </div>
          </div>
        )}
      </div>

      <div className="border-t p-3" style={{ borderColor: 'var(--editor-border)' }}>
        <button onClick={downloadVideo} disabled={videoDownloading} className="btn-primary w-full !py-3 disabled:opacity-60">
          {videoDownloading ? <><Loader2 size={16} className="animate-spin" /> Rendering… {exportPct}%</> : <><Download size={16} /> Download Video</>}
        </button>
      </div>
    </div>
  );

  const blocks = tlMode === 'line'
    ? segments.map((s, i) => ({ key: s.id ?? i, i, start: s.start, end: s.end, text: s.text }))
    : segments.flatMap((s, i) => {
        const words = s.text.split(/\s+/).filter(Boolean);
        const span = (s.end - s.start) / Math.max(words.length, 1);
        return words.map((w, wi) => ({ key: `${s.id ?? i}-${wi}`, i, start: s.start + wi * span, end: s.start + (wi + 1) * span, text: w }));
      });
  const heights = waveHeights(Math.max(60, Math.floor(totalDur * 3)));
  const tlWidth = Math.max(totalDur * pxPerSec, 600);

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'var(--editor-bg)', color: 'var(--text)' }}>
      <header className="flex items-center justify-between gap-3 border-b px-3 py-2.5 sm:px-4" style={{ borderColor: 'var(--editor-border)', background: 'var(--editor-surface)' }}>
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <button onClick={() => router.push('/dashboard/projects')} className="grid h-9 w-9 shrink-0 place-items-center rounded-xl" style={{ background: 'var(--editor-panel)' }}><ArrowLeft size={18} /></button>
          <div className="min-w-0">
            <input value={title} onChange={(e) => { setTitle(e.target.value); markDirty(); }} className="w-full truncate bg-transparent text-base font-extrabold outline-none sm:text-lg" />
            <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{project?.status === 'ready' ? 'Ready to edit' : 'Processing…'}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <button onClick={() => download(segments.map((s) => s.text).join('\n'), `${safeName}.txt`)} className="btn-ghost !px-2.5 !py-2 text-xs"><FileText size={14} /><span className="hidden sm:inline"> TXT</span></button>
          <button onClick={() => download(buildSrt(segments), `${safeName}.srt`)} className="btn-ghost !px-2.5 !py-2 text-xs"><Download size={14} /><span className="hidden sm:inline"> SRT</span></button>
          <button onClick={save} disabled={!dirty || saving} className="btn-primary !px-3 !py-2 text-xs disabled:opacity-50">{saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}<span className="hidden sm:inline"> Save</span></button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-72 shrink-0 border-r lg:block" style={{ borderColor: 'var(--editor-border)', background: 'var(--editor-surface)' }}>{CaptionRail}</aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="editor-scroll min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
            <div ref={stageRef} className="relative mx-auto aspect-video w-full max-w-3xl overflow-visible rounded-2xl border bg-black" style={{ borderColor: 'var(--editor-border)' }}>
              {project?.videoUrl ? (
                <>
                  <video ref={videoRef} src={project.videoUrl} crossOrigin="anonymous" onTimeUpdate={onTime} playsInline className="h-full w-full object-contain" />
                  <canvas ref={canvasRef} className="hidden" />
                </>
              ) : (
                <div className="grid h-full place-items-center text-sm" style={{ color: 'var(--text-muted)' }}>Video preview unavailable</div>
              )}
              <div className="absolute left-3 top-3"><span className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold" style={{ background: 'rgba(0,0,0,.55)', color: '#fff' }}><RefreshCw size={12} /> Replace</span></div>
              <div className="absolute right-3 top-3"><span className="rounded-full px-3 py-1 text-xs font-semibold" style={{ background: 'rgba(0,0,0,.55)', color: '#f5b74f' }}>● Low-res</span></div>
              {overlayText ? (
                <div key={`${activeIdx}-${style.transition}`} className={ANIM_CLASS[style.transition]} style={overlayStyle}>{overlayText}</div>
              ) : (
                <div style={{ ...overlayStyle, color: 'var(--text-muted)', background: 'rgba(0,0,0,.4)' }}>Preview appears here</div>
              )}
            </div>

            <div className="mx-auto mt-3 flex max-w-3xl items-center gap-3 rounded-2xl border px-3 py-2.5" style={{ borderColor: 'var(--editor-border)', background: 'var(--editor-surface)' }}>
              <button onClick={togglePlay} className="grid h-10 w-10 place-items-center rounded-full" style={{ background: 'var(--accent)', color: '#fff' }}>{playing ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}</button>
              <button onClick={toggleMute} className="grid h-9 w-9 place-items-center rounded-full" style={{ background: 'var(--editor-panel)' }}>{muted ? <VolumeX size={16} /> : <Volume2 size={16} />}</button>
              <div className="font-mono text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}><span style={{ color: 'var(--text)' }}>{tc(current)}</span> / {tc(totalDur)}</div>
              <input type="range" min={0} max={totalDur} step={0.01} value={current} onChange={(e) => seekTo(Number(e.target.value))} className="flex-1" />
              <button onClick={goFullscreen} className="grid h-9 w-9 place-items-center rounded-full" style={{ background: 'var(--editor-panel)' }}><Maximize2 size={16} /></button>
            </div>

            <div className="mx-auto mt-4 flex max-w-3xl flex-wrap items-center gap-2 lg:max-w-none">
              <div className="surface flex p-0.5" style={{ background: 'var(--editor-panel)' }}>
                {(['word', 'line'] as const).map((m) => (
                  <button key={m} onClick={() => setTlMode(m)} className="rounded-lg px-3 py-1.5 text-xs font-bold uppercase transition" style={tlMode === m ? { background: 'var(--editor-surface)', color: 'var(--text)' } : { color: 'var(--text-muted)' }}>{m}</button>
                ))}
              </div>
              <button onClick={addLineAtPlayhead} className="btn-ghost !px-3 !py-1.5 text-xs"><Plus size={14} /> {tlMode === 'line' ? 'Line' : 'Word'}</button>
              <div className="mx-1 h-6 w-px" style={{ background: 'var(--editor-border)' }} />
              <button onClick={() => { const prev = [...blocks].reverse().find((x) => x.end < current); if (prev) seekTo(prev.start); }} className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: 'var(--editor-panel)' }}><ChevronLeft size={15} /></button>
              <button onClick={() => { const b = blocks.find((x) => x.start > current); if (b) seekTo(b.start); }} className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: 'var(--editor-panel)' }}><ChevronRight size={15} /></button>
              <div className="ml-auto flex items-center gap-2">
                <button onClick={() => setPxPerSec((z) => Math.max(8, z - 6))} className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: 'var(--editor-panel)' }}><ZoomOut size={15} /></button>
                <input type="range" min={8} max={80} value={pxPerSec} onChange={(e) => setPxPerSec(Number(e.target.value))} className="w-24" />
                <button onClick={() => setPxPerSec((z) => Math.min(80, z + 6))} className="grid h-8 w-8 place-items-center rounded-lg" style={{ background: 'var(--editor-panel)' }}><ZoomIn size={15} /></button>
              </div>
            </div>

            <div className="mt-3 rounded-2xl border" style={{ borderColor: 'var(--editor-border)', background: 'var(--editor-surface)' }}>
              <div ref={timelineRef} className="editor-scroll relative overflow-x-auto"
                onClick={(e) => { const el = timelineRef.current; if (!el) return; const rect = el.getBoundingClientRect(); const x = e.clientX - rect.left + el.scrollLeft; seekTo(Math.max(0, Math.min(totalDur, x / pxPerSec))); }}>
                <div className="relative" style={{ width: tlWidth, minHeight: 150 }}>
                  <div className="relative h-6 border-b" style={{ borderColor: 'var(--editor-border)' }}>
                    {Array.from({ length: Math.ceil(totalDur / 5) + 1 }).map((_, i) => (<span key={i} className="absolute top-1 text-[10px] tabular-nums" style={{ left: i * 5 * pxPerSec + 4, color: 'var(--text-muted)' }}>{clock(i * 5)}</span>))}
                  </div>
                  <div className="relative h-16 border-b" style={{ borderColor: 'var(--editor-border)' }}>
                    {blocks.map((b) => {
                      const on = b.i === activeIdx;
                      return (
                        <button key={b.key} onClick={(e) => { e.stopPropagation(); setSelectedIdx(b.i); seekTo(b.start); }} className="absolute top-3 flex items-center overflow-hidden rounded-md px-1 text-[10px] font-semibold transition" title={b.text}
                          style={{ left: b.start * pxPerSec, width: Math.max(6, (b.end - b.start) * pxPerSec - 2), height: 34, background: on ? 'var(--accent)' : 'var(--editor-block)', color: on ? '#fff' : 'var(--text)' }}>
                          <span className="truncate">{b.text}</span>
                        </button>
                      );
                    })}
                  </div>
                  <div className="flex h-14 items-center gap-px" style={{ background: 'var(--editor-panel)' }}>
                    {heights.map((h, i) => (<span key={i} className="inline-block rounded-full" style={{ width: Math.max(1, tlWidth / heights.length - 1), height: `${h * 100}%`, background: 'var(--accent)', opacity: 0.55 }} />))}
                  </div>
                  <div className="pointer-events-none absolute inset-y-0" style={{ left: current * pxPerSec }}>
                    <div className="h-full w-0.5" style={{ background: 'var(--accent)' }} />
                    <div className="absolute -top-0.5 -left-1.5 h-3 w-3 rounded-sm" style={{ background: 'var(--accent)' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-around border-t p-2 lg:hidden" style={{ borderColor: 'var(--editor-border)', background: 'var(--editor-surface)' }}>
            <button onClick={() => setMobilePanel('captions')} className="flex flex-col items-center gap-0.5 px-4 py-1 text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}><CaptionsIcon size={18} /> Captions</button>
            <button onClick={togglePlay} className="grid h-11 w-11 place-items-center rounded-full" style={{ background: 'var(--accent)', color: '#fff' }}>{playing ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}</button>
            <button onClick={() => setMobilePanel('inspector')} className="flex flex-col items-center gap-0.5 px-4 py-1 text-[11px] font-semibold" style={{ color: 'var(--text-muted)' }}><Sparkles size={18} /> Style</button>
          </div>
        </main>

        <aside className="hidden w-80 shrink-0 border-l lg:block" style={{ borderColor: 'var(--editor-border)', background: 'var(--editor-surface)' }}>{Inspector}</aside>
      </div>

      {mobilePanel !== 'none' && (
        <div className="fixed inset-0 z-[60] lg:hidden" onClick={() => setMobilePanel('none')}>
          <div className="absolute inset-0 bg-black/50" />
          <div className="absolute inset-x-0 bottom-0 top-16 flex flex-col rounded-t-3xl border-t" style={{ background: 'var(--editor-surface)', borderColor: 'var(--editor-border)' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3">
              <span className="flex items-center gap-2 text-sm font-bold">{mobilePanel === 'captions' ? <><PanelLeft size={16} /> Captions</> : <><PanelRight size={16} /> Style</>}</span>
              <button onClick={() => setMobilePanel('none')} className="grid h-8 w-8 place-items-center rounded-full" style={{ background: 'var(--editor-panel)' }}><X size={16} /></button>
            </div>
            <div className="min-h-0 flex-1">{mobilePanel === 'captions' ? CaptionRail : Inspector}</div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────── small UI atoms ─────────────────────────── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (<div><p className="mb-2 text-[11px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>{title}</p><div className="space-y-3">{children}</div></div>);
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (<label className="block"><span className="mb-1 block text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{label}</span>{children}</label>);
}
function Toggle({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (<button onClick={onClick} className="grid place-items-center rounded-xl border py-2 transition" style={{ background: active ? 'var(--accent)' : 'var(--editor-panel)', color: active ? '#fff' : 'var(--text)', borderColor: active ? 'var(--accent)' : 'var(--editor-border)' }}>{children}</button>);
}
function SwitchRow({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (<button onClick={onClick} className="flex w-full items-center justify-between py-1.5"><span className="text-sm">{label}</span><span className="relative h-5 w-9 rounded-full transition" style={{ background: on ? 'var(--accent)' : 'var(--editor-border)' }}><span className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all" style={{ left: on ? 18 : 2 }} /></span></button>);
}