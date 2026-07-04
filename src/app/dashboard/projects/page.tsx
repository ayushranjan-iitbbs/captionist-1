'use client';

import { useEffect, useState } from 'react';
import { authFetch } from '@/lib/authFetch';
import { ProjectCard } from '@/components/dashboard/ProjectCard';
import type { Project } from '@/types';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await authFetch('/api/projects');
      if (res.ok) setProjects((await res.json()).projects);
      setLoading(false);
    })();
  }, []);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Recent Projects</h1>
      {loading ? (
        <p style={{ color: 'var(--text-muted)' }}>Loading…</p>
      ) : projects.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>No projects yet.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
            {projects.map((p) => <ProjectCard key={p.id} project={p} />)}
          </div>
          <p className="mt-12 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
            You've reached the end
          </p>
        </>
      )}
    </div>
  );
}
