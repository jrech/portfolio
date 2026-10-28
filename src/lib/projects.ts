import { getCollection, getEntries, type CollectionEntry } from 'astro:content';

export type ProjectEntry = CollectionEntry<'projects'>;

/** Published (non-draft) projects in homepage order. */
export async function getProjects(): Promise<ProjectEntry[]> {
  const projects = await getCollection('projects', ({ data }) => !data.draft);
  return projects.sort((a, b) => a.data.order - b.data.order);
}

export const projectUrl = (project: ProjectEntry) => `/work/${project.id}`;

/**
 * Case studies stay unlinked from the homepage until the client content exists
 * (Jonas, 2026-10-28). Their pages are still built for review, with noindex.
 */
export const isPublished = (project: ProjectEntry) => project.data.status === 'published';

export const formatServices = (services: string[]) => services.join(' · ');

/**
 * Two other projects for "More selected work": the hand-picked `related`
 * list first, then the next projects by order (wrapping around), never the
 * current one. Returns fewer when fewer exist.
 */
export async function getRelatedProjects(current: ProjectEntry, limit = 2): Promise<ProjectEntry[]> {
  const all = await getProjects();
  const picked = current.data.related ? await getEntries(current.data.related) : [];
  const start = all.findIndex((p) => p.id === current.id);
  const byOrder = [...all.slice(start + 1), ...all.slice(0, Math.max(start, 0))];

  const result: ProjectEntry[] = [];
  for (const project of [...picked, ...byOrder]) {
    if (result.length === limit) break;
    if (!project || project.id === current.id || project.data.draft) continue;
    if (!result.some((p) => p.id === project.id)) result.push(project);
  }
  return result;
}
