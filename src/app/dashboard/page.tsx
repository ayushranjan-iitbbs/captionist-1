'use client';

import { useEffect, useState, useCallback } from 'react';
import Uploader from '@/components/dashboard/Uploader';
import { ProjectCard } from '@/components/dashboard/ProjectCard';
import { authFetch } from '@/lib/authFetch';
import type { Project } from '@/types';

export default function DashboardHome() {
  const [projects, setProjects] = useState<Project[]>([]);

  const load = useCallback(async () => {
    const res = await authFetch('/api/projects');
    if (res.ok) {
      const data = await res.json();
      setProjects(data.projects);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-8">
      <Uploader onDone={load} />

      <div>
        <h2 className="mb-4 text-xl font-bold">Recent Videos</h2>
        {projects.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            No videos yet. Upload one above to generate captions.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
            {projects.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
