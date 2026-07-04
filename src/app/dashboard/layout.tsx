'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Sidebar from '@/components/dashboard/Sidebar';
import Topbar from '@/components/dashboard/Topbar';
import { Loader2, X } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Hide sidebar on editor routes
  const isEditorRoute = pathname.includes('/dashboard/editor/');

  useEffect(() => {
    if (!loading && !user) router.replace('/sign-in');
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="animate-spin text-accent" size={32} />
      </div>
    );
  }

  const closeSidebar = () => setSidebarOpen(false);

  if (isEditorRoute) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={closeSidebar}>
          <div className="absolute inset-0 bg-black opacity-50" />
        </div>
      )}
      {/* Mobile sidebar (hidden on desktop) */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-background transform transition-transform duration-200 lg:hidden ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <Sidebar />
        <button onClick={closeSidebar} className="absolute top-4 right-4 p-2" aria-label="Close sidebar">
          <X size={20} />
        </button>
      </aside>
      {/* Desktop sidebar */}
      <aside className="hidden lg:block">
        <Sidebar />
      </aside>
      <div className="flex flex-1 flex-col">
        <Topbar onToggleSidebar={() => setSidebarOpen((o) => !o)} />
        <main className="flex-1 p-3 pt-5">{children}</main>
      </div>
    </div>
  );
}
