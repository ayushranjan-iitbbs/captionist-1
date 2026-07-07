'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage, auth } from '@/lib/firebaseClient';
import { v4 as uuid } from 'uuid';
import { LANGUAGES } from '@/lib/landingDefaults';
import { useRouter } from 'next/navigation';

export default function Uploader({ onDone }: { onDone?: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [language, setLanguage] = useState('auto');
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState('');

  const pick = (f: File | null) => {
    if (!f) return;
    if (f.size > 1e9) return toast.error('Max file size is 1GB');
    if (!/(mp4|mov|quicktime)/i.test(f.type)) return toast.error('Only MP4 / MOV supported');
    setFile(f);
  };

  const start = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error('Not signed in');

      setPhase('Uploading…');
      const path = `captionist/${uid}/${uuid()}-${file.name}`;
      const sref = storageRef(storage, path);
      await uploadBytes(sref, file);
      const url = await getDownloadURL(sref);

      setPhase('Transcribing…');
      const token = await auth.currentUser!.getIdToken();

      const res = await fetch('/api/transcribe', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ videoUrl: url, language, title: file.name }),
      });

      // Server may return a non-JSON error body (gateway timeout, 413 text…).
      // Read as text first, then parse defensively so we never crash on JSON.parse.
      const raw = await res.text();
      let data: any = {};
      try { data = raw ? JSON.parse(raw) : {}; }
      catch { data = { error: raw?.slice(0, 200) || `Request failed (${res.status})` }; }
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);

      toast.success('Captions ready!');
      setFile(null);
      onDone?.();
      router.push(`/dashboard/editor/${data.project.id}`);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to process');
    } finally {
      setBusy(false);
      setPhase('');
    }
  };

  return (
    <div className="surface p-6" style={{ background: 'var(--bg-soft)' }}>
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/quicktime"
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0] || null)}
      />

      {!file ? (
        <button
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files?.[0] || null); }}
          className="grid w-full place-items-center rounded-2xl border border-dashed py-16 transition hover:opacity-80"
          style={{ borderColor: 'var(--border)' }}
        >
          <ImagePlus size={40} style={{ color: 'var(--text-muted)' }} />
          <p className="mt-4 font-medium">Drop your video here or click to upload</p>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>Max: 25 MB audio, 1 GB file</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Supports: MP4, MOV</p>
        </button>
      ) : (
        <div>
          <div className="flex items-center justify-between rounded-xl border px-4 py-3" style={{ borderColor: 'var(--border)' }}>
            <span className="truncate text-sm">{file.name}</span>
            <button onClick={() => setFile(null)} disabled={busy}><X size={18} /></button>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <select value={language} onChange={(e) => setLanguage(e.target.value)} className="input max-w-[200px]" disabled={busy}>
              <option value="auto">Auto-detect</option>
              {LANGUAGES.map((l) => (<option key={l} value={l.toLowerCase()}>{l}</option>))}
            </select>
            <button onClick={start} disabled={busy} className="btn-primary">
              {busy ? (<><Loader2 className="animate-spin" size={18} /> {phase}</>) : 'Generate Captions'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
