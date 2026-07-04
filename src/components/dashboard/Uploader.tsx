// src/components/dashboard/Uploader.tsx
'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/context/AuthContext';
import { PLANS } from '@/types';
import {
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage';
import { storage, auth } from '@/lib/firebaseClient';
import { v4 as uuid } from 'uuid';
import { LANGUAGES } from '@/lib/landingDefaults';
import { useRouter } from 'next/navigation';

export default function Uploader({ onDone }: { onDone?: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [language, setLanguage] = useState('auto');
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState(''); // UI text: "Uploading…" / "Transcribing…"

  // -----------------------------------------------------------------
  // Pick a file & validate
  // -----------------------------------------------------------------
  const pick = (f: File | null) => {
    if (!f) return;
    if (f.size > 1e9) return toast.error('Max file size is 1 GB');
    if (!/(mp4|mov|quicktime)/i.test(f.type))
      return toast.error('Only MP4 / MOV supported');
    setFile(f);
  };

  // -----------------------------------------------------------------
  // Main upload → transcription → navigation flow
  // -----------------------------------------------------------------
  const start = async () => {
    if (!file) return;
    setBusy(true);
    try {
      // ---- 1️⃣  Upload to Cloud Storage ----
      const uid = auth.currentUser?.uid;
      if (!uid) throw new Error('Not signed in');

      setPhase('Uploading…');
      const path = `captionist/${uid}/${uuid()}-${file.name}`;
      const sref = storageRef(storage, path);
      await uploadBytes(sref, file); // <-- now succeeds once CORS rule is in place
      const url = await getDownloadURL(sref);

      // ---- 2️⃣  Call transcription endpoint ----
      setPhase('Transcribing…');
      const token = await auth.currentUser!.getIdToken();
      const form = new FormData();
      form.append('file', file);
      form.append('language', language);
      form.append('title', file.name);
      form.append('videoUrl', url); // needed for the editor video playback

      const res = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await res.json();

      if (!res.ok) {
        // API may include a helpful message (e.g., quota exhausted, plan limit)
        throw new Error(data.error ?? 'Transcription failed');
      }

      // ---- 3️⃣  Success – go to the editor ----
      toast.success('Captions ready!');
      setFile(null);
      onDone?.();
      router.push(`/dashboard/editor/${data.project.id}`);
    } catch (e: any) {
      // Show the exact error (CORS, quota, network, etc.)
      const msg = e?.message || 'Failed to process';
      toast.error(msg);
      console.error('[Uploader] error:', e);
    } finally {
      setBusy(false);
      setPhase('');
    }
  };

  const plan = PLANS.find((p) => p.id === (user?.plan || 'free')) ?? PLANS[0];
  const uploadDurationMinutes = plan.uploadDurationMinutes;

  // -----------------------------------------------------------------
  // Render UI
  // -----------------------------------------------------------------
  return (
    <div className="surface p-6" style={{ background: 'var(--bg-soft)' }}>
      <input
        ref={inputRef}
        type="file"
        accept="video/mp4,video/quicktime"
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0] || null)}
      />

      {/* ---------------------------------
          No file selected – show drop zone
          --------------------------------- */}
      {!file ? (
        <button
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            pick(e.dataTransfer.files?.[0] || null);
          }}
          className="grid w-full place-items-center rounded-2xl border border-dashed py-16 hover:opacity-80"
          style={{ borderColor: 'var(--border)' }}
        >
          <ImagePlus size={40} style={{ color: 'var(--text-muted)' }} />
          <p className="mt-4 font-medium">
            Drop your videos here or click to upload
          </p>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
            Max: {uploadDurationMinutes} minutes, 1 GB
          </p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Supports: MP4, MOV
          </p>
        </button>
      ) : (
        // ---------------------------------
        // File selected – show language + start button
        // ---------------------------------
        <div>
          <div
            className="flex items-center justify-between rounded-xl border px-4 py-3"
            style={{ borderColor: 'var(--border)' }}
          >
            <span className="truncate text-sm">{file.name}</span>
            <button onClick={() => setFile(null)} disabled={busy}>
              <X size={18} />
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="input max-w-[200px]"
              disabled={busy}
            >
              <option value="auto">Auto‑detect</option>
              {LANGUAGES.map((l) => (
                <option key={l} value={l.toLowerCase()}>
                  {l}
                </option>
              ))}
            </select>

            <button
              onClick={start}
              disabled={busy}
              className="btn-primary"
            >
              {busy ? (
                <>
                  <Loader2 className="animate-spin" size={18} /> {phase}
                </>
              ) : (
                'Generate Captions'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
