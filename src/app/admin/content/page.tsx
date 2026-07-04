'use client';

import { useCallback, useEffect, useState } from 'react';
import { authFetch } from '@/lib/authFetch';
import { Plus, Trash2, Loader2, Pencil, X } from 'lucide-react';
import toast from 'react-hot-toast';

type FieldType = 'text' | 'textarea' | 'number' | 'select';
interface Field {
  key: string;
  label: string;
  type: FieldType;
  options?: string[];
  placeholder?: string;
}

const SCHEMAS: Record<string, { label: string; fields: Field[] }> = {
  tutorials: {
    label: 'Tutorials',
    fields: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'description', label: 'Description', type: 'textarea' },
      { key: 'videoUrl', label: 'Video URL', type: 'text', placeholder: 'https://...' },
      { key: 'thumbnailUrl', label: 'Thumbnail URL', type: 'text' },
      { key: 'duration', label: 'Duration', type: 'text', placeholder: '3:17' },
      { key: 'order', label: 'Order', type: 'number' },
    ],
  },
  testimonials: {
    label: 'Testimonials',
    fields: [
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'handle', label: 'Handle', type: 'text', placeholder: '@creator' },
      { key: 'avatarUrl', label: 'Avatar URL', type: 'text' },
      { key: 'text', label: 'Testimonial', type: 'textarea' },
      { key: 'order', label: 'Order', type: 'number' },
    ],
  },
  creators: {
    label: 'Creators',
    fields: [
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'subtitle', label: 'Subtitle', type: 'text' },
      { key: 'avatarUrl', label: 'Avatar URL', type: 'text' },
      { key: 'order', label: 'Order', type: 'number' },
    ],
  },
  landingVideos: {
    label: 'Landing Videos',
    fields: [
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'videoUrl', label: 'Video URL', type: 'text' },
      { key: 'posterUrl', label: 'Poster URL', type: 'text' },
      { key: 'section', label: 'Section', type: 'select', options: ['hero', 'templates', 'testimonial'] },
      { key: 'order', label: 'Order', type: 'number' },
    ],
  },
  templates: {
    label: 'Caption Templates',
    fields: [
      { key: 'name', label: 'Template Name', type: 'text', placeholder: 'e.g., Kalakar Glow' },
      { key: 'tag', label: 'Tag', type: 'text', placeholder: 'e.g., Bold · Shadow' },
      { key: 'fontFamily', label: 'Font Family', type: 'text', placeholder: "'Luckiest Guy', cursive" },
      { key: 'fontSize', label: 'Font Size (px)', type: 'number' },
      { key: 'color', label: 'Color', type: 'text', placeholder: '#b6ff3a' },
      { key: 'bold', label: 'Bold (true/false)', type: 'text' },
      { key: 'uppercase', label: 'Uppercase (true/false)', type: 'text' },
      { key: 'order', label: 'Order', type: 'number' },
    ],
  },
  transitions: {
    label: 'Transitions',
    fields: [
      { key: 'name', label: 'Transition Name', type: 'text', placeholder: 'e.g., Fade' },
      { key: 'duration', label: 'Duration (ms)', type: 'number', placeholder: '300' },
      { key: 'description', label: 'Description', type: 'text', placeholder: 'e.g., Smooth fade effect' },
      { key: 'order', label: 'Order', type: 'number' },
    ],
  },
};

const TYPES = Object.keys(SCHEMAS);

export default function AdminContent() {
  const [type, setType] = useState<string>('tutorials');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<Record<string, any>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const schema = SCHEMAS[type];

  const load = useCallback(async (t: string) => {
    setLoading(true);
    const res = await authFetch(`/api/admin/content?type=${t}`);
    if (res.ok) setItems((await res.json()).items);
    setLoading(false);
  }, []);

  useEffect(() => {
    load(type);
    setForm({});
    setEditingId(null);
  }, [type, load]);

  const setField = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async () => {
    setSaving(true);
    const data: Record<string, any> = { ...form };
    schema.fields.forEach((f) => {
      if (f.type === 'number') data[f.key] = Number(data[f.key]) || 0;
    });

    const res = editingId
      ? await authFetch('/api/admin/content', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, id: editingId, data }),
        })
      : await authFetch('/api/admin/content', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type, data }),
        });

    setSaving(false);
    if (res.ok) {
      toast.success(editingId ? 'Updated' : 'Added');
      setForm({});
      setEditingId(null);
      load(type);
    } else {
      toast.error('Save failed');
    }
  };

  const edit = (item: any) => {
    setEditingId(item.id);
    const f: Record<string, any> = {};
    schema.fields.forEach((fld) => (f[fld.key] = item[fld.key] ?? ''));
    setForm(f);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this item?')) return;
    await authFetch(`/api/admin/content?type=${type}&id=${id}`, { method: 'DELETE' });
    toast.success('Deleted');
    load(type);
  };

  const primaryLabel = (item: any) => item.title || item.name || item.handle || item.id;
  const secondaryLabel = (item: any) => item.description || item.text || item.subtitle || item.section || item.duration || '';

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold">Content</h1>

      {/* Type tabs */}
      <div className="surface flex flex-wrap gap-1 p-1" style={{ background: 'var(--bg-soft)' }}>
        {TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className="rounded-xl px-4 py-2.5 text-sm font-semibold transition"
            style={type === t ? { background: 'var(--accent)', color: '#fff' } : { color: 'var(--text-muted)' }}
          >
            {SCHEMAS[t].label}
          </button>
        ))}
      </div>

      {/* Form */}
      <div className="surface p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            {editingId ? <Pencil size={18} style={{ color: 'var(--accent)' }} /> : <Plus size={18} style={{ color: 'var(--accent)' }} />}
            {editingId ? `Edit ${schema.label.replace(/s$/, '')}` : `Add ${schema.label.replace(/s$/, '')}`}
          </h2>
          {editingId && (
            <button onClick={() => { setEditingId(null); setForm({}); }} className="flex items-center gap-1 text-sm" style={{ color: 'var(--text-muted)' }}>
              <X size={14} /> Cancel
            </button>
          )}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {schema.fields.map((f) => (
            <label key={f.key} className={f.type === 'textarea' ? 'block sm:col-span-2' : 'block'}>
              <span className="mb-1.5 block text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>{f.label}</span>
              {f.type === 'textarea' ? (
                <textarea className="input" rows={3} value={form[f.key] ?? ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.placeholder} />
              ) : f.type === 'select' ? (
                <select className="input" value={form[f.key] ?? f.options?.[0]} onChange={(e) => setField(f.key, e.target.value)}>
                  {f.options?.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              ) : (
                <input type={f.type === 'number' ? 'number' : 'text'} className="input" value={form[f.key] ?? ''} onChange={(e) => setField(f.key, e.target.value)} placeholder={f.placeholder} />
              )}
            </label>
          ))}
        </div>
        <button onClick={submit} disabled={saving} className="btn-primary mt-5 !py-2.5 text-sm disabled:opacity-50">
          {saving ? <Loader2 size={15} className="animate-spin" /> : editingId ? <Pencil size={15} /> : <Plus size={15} />}
          {editingId ? 'Save changes' : 'Add item'}
        </button>
      </div>

      {/* List */}
      <div className="surface overflow-hidden">
        <div className="border-b p-5" style={{ borderColor: 'var(--border)' }}>
          <h2 className="font-bold">{schema.label} ({items.length})</h2>
        </div>
        {loading ? (
          <div className="grid place-items-center p-10">
            <Loader2 className="animate-spin" style={{ color: 'var(--accent)' }} size={22} />
          </div>
        ) : items.length === 0 ? (
          <p className="p-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>Nothing here yet. Add your first {schema.label.replace(/s$/, '').toLowerCase()} above.</p>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
            {items.map((item) => (
              <div key={item.id} className="flex items-center gap-4 p-4" style={{ borderColor: 'var(--border)' }}>
                {(item.avatarUrl || item.thumbnailUrl || item.imageUrl || item.posterUrl) && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.avatarUrl || item.thumbnailUrl || item.imageUrl || item.posterUrl} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{primaryLabel(item)}</p>
                  <p className="truncate text-sm" style={{ color: 'var(--text-muted)' }}>{secondaryLabel(item)}</p>
                </div>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>#{item.order ?? '—'}</span>
                <button onClick={() => edit(item)} className="grid h-9 w-9 place-items-center rounded-full" style={{ color: 'var(--accent)' }}>
                  <Pencil size={15} />
                </button>
                <button onClick={() => remove(item.id)} className="grid h-9 w-9 place-items-center rounded-full" style={{ color: '#ef4444' }}>
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
