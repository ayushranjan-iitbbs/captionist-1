'use client';

import { Search, ChevronDown, LogOut, Settings, Menu } from 'lucide-react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function Topbar({ onToggleSidebar }: { onToggleSidebar?: () => void }) {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex items-center gap-4 px-3 pt-3">
        {onToggleSidebar && (
          <button onClick={onToggleSidebar} className="lg:hidden btn-ghost p-2" aria-label="Toggle sidebar">
            <Menu size={20} />
          </button>
        )}
      <div className="surface flex flex-1 items-center gap-3 px-4 py-3" style={{ background: 'var(--bg-soft)' }}>
        <Search size={18} style={{ color: 'var(--text-muted)' }} />
        <input
          className="flex-1 bg-transparent text-sm outline-none"
          placeholder="Search by title..."
          style={{ color: 'var(--text)' }}
        />
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>⌘K</span>
      </div>

      <div className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          className="surface flex items-center gap-2 px-3 py-2"
          style={{ background: 'var(--bg-soft)' }}
        >
          <div className="h-8 w-8 overflow-hidden rounded-full" style={{ background: 'var(--accent)' }}>
            {user?.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.photoURL} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="grid h-full w-full place-items-center text-sm font-bold text-white">
                {user?.name?.charAt(0) || 'U'}
              </div>
            )}
          </div>
          <span className="text-sm font-medium">{user?.name || 'User'}</span>
          <ChevronDown size={16} />
        </button>

        {open && (
          <div className="surface absolute right-0 top-12 z-50 w-48 p-1" style={{ background: 'var(--card)' }}>
            <button
              onClick={() => { router.push('/dashboard/settings'); setOpen(false); }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:opacity-80"
            >
              <Settings size={15} /> Account
            </button>
            <button
              onClick={async () => { await signOut(); router.push('/'); }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-400 hover:opacity-80"
            >
              <LogOut size={15} /> Sign out
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
