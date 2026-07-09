'use client';

import Link from 'next/link';
import { Play } from 'lucide-react';
import type { Project } from '@/types';

export function ProjectCard({ project }: { project: Project }) {
  return (
    <Link href={`/dashboard/editor/${project.id}`} className="group block">
      <div className="surface relative aspect-video overflow-hidden" style={{ background: 'var(--bg-soft)' }}>
        {project.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={project.thumbnailUrl} alt="" className="h-full w-full object-cover" />
        ) : project.videoUrl ? (
          <video
            src={project.videoUrl}
            muted
            autoPlay
            loop
            playsInline
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="grid h-full w-full place-items-center">
            <span className="text-4xl font-bold gradient-text opacity-30">C</span>
          </div>
        )}
        <div className="absolute inset-0 grid place-items-center opacity-0 transition group-hover:opacity-100">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-black/60 text-white">
            <Play size={20} className="ml-0.5" />
          </div>
        </div>
      </div>
      <p className="mt-2 truncate text-sm font-semibold">{project.title}</p>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        {new Date(project.createdAt).toLocaleDateString()} · {project.language}
      </p>
    </Link>
  );
}

export default ProjectCard;