'use client';

import { useCallback, useEffect, useState } from 'react';
import { authFetch } from '@/lib/authFetch';
import { Plus, Trash2, Loader2, Type, Pencil, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface Font {
  id: string;
  name: string;
  fontFamily: string;
  cssUrl?: string;
  weight?: string;
  previewText?: string;
  isCustom?: boolean;
  order?: number;
}

const EMPTY = { name: '', fontFamily: '', cssUrl: '', weight: '700', previewText: 'Desi Creators Caption Karo!', order: 0 };

export default function AdminFonts() {
  const [fonts, setFonts] = useState<Font[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ...EMPTY });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await authFetch('/api/admin/content?type=fonts');
    if (res.ok) setFonts((await res.json()).items);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Inject Google Fonts stylesheet links for live preview
  useEffect(() => {
    const urls = new Set<string>();
    fonts.forEach((f) => f.cssUrl && urls.add(f.cssUrl));
    if (form.cssUrl) urls.add(form.cssUrl);
    const created: HTMLLinkElement[] = [];
    urls.forEach((url) => {
      if (document.querySelector(`link[data-font="${url}"]`)) return;
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = url;
      link.dataset.font = url;
      document.head.appendChild(link);
      created.push(link);
    });
    return () => { created.forEach((l) => l.remove()); };
  }, [fonts, form.cssUrl]);

  const submit = async () => {
    if (!form.name || !form.fontFamily) return toast.error('Name and font-family are required');
    setSaving(true);
    const data = { ...form, order: Number(form.order) || 0, isCustom: !!form.cssUrl };
    const res = editingId
      ? await authFetch('/api/admin/content', {
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'fonts', id: editingId, data }),
        })
      : await authFetch('/api/admin/content', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'fonts', data }),
        });
    setSaving(false);
    if (res.ok) {
      toast.success(editingId ? 'Updated' : 'Font added');
      setForm({ ...EMPTY });
      setEditingId(null);
      load();
    } else toast.error('Save failed');
  };

  const edit = (f: Font) => {
    setEditingId(f.id);
    setForm({
      name: f.name, fontFamily: f.fontFamily, cssUrl: f.cssUrl || '',
      weight: f.weight || '700', previewText: f.previewText || EMPTY.previewText, order: f.order || 0,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this font?')) return;
    await authFetch(`/api/admin/content?type=fonts&id=${id}`, { method: 'DELETE' });
    toast.success('Deleted');
    load();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold">Fonts &amp; Text Styles</h1>
      <p className="-mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
        Paste a Google Fonts stylesheet URL and the matching CSS font-family to make it available in the caption editor.
      </p>

      {/* Form */}
      <div className="surface p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            {editingId ? <Pencil size={18} style={{ color: 'var(--accent)' }} /> : <Plus size={18} style={{ color: 'var(--accent)' }} />}
            {editingId ? 'Edit font' : 'Add font'}
          </h2>
          {editingId && (
            <button onClick={() => { setEditingId(null); setForm({ ...EMPTY }); }} className="flex items-center gap-1 text-sm" style={{ color: 'var(--text-muted)' }}>
              <X size={14} /> Cancel
            </button>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <L label="Display name"><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Poppins Bold" /></L>
          <L label="CSS font-family"><input className="input" value={form.fontFamily} onChange={(e) => setForm({ ...form, fontFamily: e.target.value })} placeholder="'Poppins', sans-serif" /></L>
          <L label="Google Fonts URL"><input className="input" value={form.cssUrl} onChange={(e) => setForm({ ...form, cssUrl: e.target.value })} placeholder="https://fonts.googleapis.com/css2?family=Poppins:wght@700" /></L>
          <L label="Weight"><input className="input" value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} placeholder="700" /></L>
          <L label="Preview text"><input className="input" value={form.previewText} onChange={(e) => setForm({ ...form, previewText: e.target.value })} /></L>
          <L label="Order"><input type="number" className="input" value={form.order} onChange={(e) => setForm({ ...form, order: Number(e.target.value) })} /></L>
        </div>

        {/* Live preview */}
        {(form.fontFamily || form.name) && (
          <div className="surface mt-4 grid place-items-center p-6" style={{ background: 'var(--bg-soft)' }}>
            <span style={{ fontFamily: form.fontFamily || 'inherit', fontWeight: Number(form.weight) || 700, fontSize: 28 }}>
              {form.previewText || EMPTY.previewText}
            </span>
          </div>
        )}

        <button onClick={submit} disabled={saving} className="btn-primary mt-5 !py-2.5 text-sm disabled:opacity-50">
          {saving ? <Loader2 size={15} className="animate-spin" /> : editingId ? <Pencil size={15} /> : <Plus size={15} />}
          {editingId ? 'Save changes' : 'Add font'}
        </button>
      </div>

      {/* List */}
      <div className="surface overflow-hidden">
        <div className="border-b p-5" style={{ borderColor: 'var(--border)' }}>
          <h2 className="font-bold">Fonts ({fonts.length})</h2>
        </div>
        {loading ? (
          <div className="grid place-items-center p-10"><Loader2 className="animate-spin" style={{ color: 'var(--accent)' }} size={22} /></div>
        ) : fonts.length === 0 ? (
          <div className="grid place-items-center p-12 text-center">
            <Type size={36} style={{ color: 'var(--text-muted)' }} />
            <p className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>No custom fonts yet.</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {fonts.map((f) => (
              <div key={f.id} className="flex items-center gap-4 p-4" style={{ borderColor: 'var(--border)' }}>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{f.name}</p>
                  <p className="truncate text-2xl" style={{ fontFamily: f.fontFamily, fontWeight: Number(f.weight) || 700 }}>
                    {f.previewText || EMPTY.previewText}
                  </p>
                  <p className="mt-1 truncate text-xs" style={{ color: 'var(--text-muted)' }}>{f.fontFamily}</p>
                </div>
                <button onClick={() => edit(f)} className="grid h-9 w-9 place-items-center rounded-full" style={{ color: 'var(--accent)' }}><Pencil size={15} /></button>
                <button onClick={() => remove(f.id)} className="grid h-9 w-9 place-items-center rounded-full" style={{ color: '#ef4444' }}><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{label}</span>
      {children}
    </label>
  );
}
