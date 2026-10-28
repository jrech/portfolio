import { getCollection, type CollectionEntry } from 'astro:content';
import { bindSingleLetters, defaultLocale, localePath, type Locale } from '@/i18n';

export type ProjectEntry = CollectionEntry<'projects'> & { slug: string; locale: Locale };

const splitId = (id: string) => {
  const [locale, ...rest] = id.split('/');
  return { locale: locale as Locale, slug: rest.join('/') };
};

/**
 * Published (non-draft) projects in homepage order for a locale.
 * A project without a file in that locale falls back to its English file.
 */
export async function getProjects(locale: Locale = defaultLocale): Promise<ProjectEntry[]> {
  const entries = await getCollection('projects', ({ data }) => !data.draft);
  const bySlug = new Map<string, ProjectEntry>();
  for (const entry of entries) {
    const { locale: entryLocale, slug } = splitId(entry.id);
    if (entryLocale !== locale && entryLocale !== 'en') continue;
    const existing = bySlug.get(slug);
    if (!existing || (entryLocale === locale && existing.locale !== locale)) {
      const data = entryLocale === 'cs' ? bindSingleLetters(entry.data) : entry.data;
      bySlug.set(slug, { ...entry, data, slug, locale: entryLocale });
    }
  }
  return [...bySlug.values()].sort((a, b) => a.data.order - b.data.order);
}

export const projectUrl = (project: ProjectEntry, locale: Locale) =>
  localePath(locale, `/work/${project.slug}`);

export const formatServices = (services: string[]) => services.join(' · ');

/**
 * Case studies stay unlinked from the homepage until the client content exists
 * (Jonas, 2026-10-28). Their pages are still built for review, with noindex.
 */
export const isPublished = (project: ProjectEntry) => project.data.status === 'published';

/**
 * Two other projects for "More selected work": the hand-picked `related`
 * list first, then the next projects by order (wrapping around), never the
 * current one. Returns fewer when fewer exist.
 */
export async function getRelatedProjects(
  current: ProjectEntry,
  locale: Locale,
  limit = 2,
): Promise<ProjectEntry[]> {
  const all = await getProjects(locale);
  const picked = (current.data.related ?? []).map((slug) => all.find((p) => p.slug === slug));
  const start = all.findIndex((p) => p.slug === current.slug);
  const byOrder = [...all.slice(start + 1), ...all.slice(0, Math.max(start, 0))];

  const result: ProjectEntry[] = [];
  for (const project of [...picked, ...byOrder]) {
    if (result.length === limit) break;
    if (!project || project.slug === current.slug) continue;
    if (!result.some((p) => p.slug === project.slug)) result.push(project);
  }
  return result;
}
