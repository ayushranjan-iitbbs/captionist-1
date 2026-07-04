'use client';

import Uploader from '@/components/dashboard/Uploader';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminVideoUpload() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Ensure only admins can access this page
  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      router.replace('/dashboard');
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="animate-spin text-accent" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold">Upload Video for Captioning</h1>
      <Uploader />
    </div>
  );
}
