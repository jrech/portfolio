import { defineCollection, reference } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

/**
 * Projects: one Markdown file per project in src/content/projects/.
 * The file name is the URL slug (/work/<slug>) and the id used by `related`.
 *
 * Copy only goes in here once it is verified or clearly marked as draft.
 * Never add metrics, results or quotes the client has not confirmed.
 */

const paragraphs = z.array(z.string()).min(1);

const editorialSection = z.object({
  /** Section heading; defaults to the template label ("The challenge." …). */
  heading: z.string().optional(),
  paragraphs,
});

export const visualVariants = ['full', 'responsive', 'detail'] as const;

const projects = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projects' }),
  schema: ({ image }) =>
    z.object({
      /** Full project name: breadcrumb, metadata, page title. */
      title: z.string(),
      /** Card title where the homepage uses a shorter name ("Prádelna"). */
      cardTitle: z.string().optional(),
      /** Case-study h1; `\n` forces the approved line break. Defaults to `title`. */
      heroTitle: z.string().optional(),
      client: z.string(),
      industry: z.string().default('To confirm'),
      services: z.array(z.string()).min(1),
      /** Year as shown in the metadata row; omitted = "To confirm". */
      year: z.union([z.number(), z.string()]).optional(),
      status: z.enum(['in-preparation', 'published']).default('in-preparation'),
      /** Homepage card + meta description. */
      description: z.string(),
      /** Desktop measure of the card description in px, where the frame fixes one. */
      descriptionWidth: z.number().optional(),
      /** Case-study lead under the title. */
      positioning: z.string(),
      /** Homepage order (ascending). */
      order: z.number().default(0),
      /** Drafts are left out of the build entirely (no page, no card). */
      draft: z.boolean().default(false),
      /** Shown under the hero visual while the case study is not final. */
      notice: z.string().optional(),

      cover: z.object({ src: image(), alt: z.string() }).optional(),

      /** Missing sections render a clearly marked "content to follow" placeholder. */
      challenge: editorialSection.optional(),
      approach: editorialSection.optional(),
      solution: editorialSection
        .extend({
          decisions: z.array(z.object({ title: z.string(), copy: z.string() })).default([]),
        })
        .optional(),
      outcome: editorialSection.optional(),

      /** Up to three large visuals, placed after the challenge, approach and solution. */
      visuals: z
        .array(
          z.object({
            variant: z.enum(visualVariants),
            /** `\n` forces a line break. */
            title: z.string(),
            /** Brief for the final capture, shown while there is no image. */
            brief: z.string(),
            /** Responsive variant only: label of the mobile slot. */
            mobileLabel: z.string().optional(),
            image: z.object({ src: image(), alt: z.string() }).optional(),
          }),
        )
        .max(3)
        .default([]),

      /** Only for a quote the client has approved for publication. */
      testimonial: z
        .object({
          quote: z.string(),
          name: z.string(),
          company: z.string(),
          lang: z.string().default('en'),
        })
        .optional(),

      /** Hand-picked related projects; falls back to the next projects by order. */
      related: z.array(reference('projects')).max(2).optional(),
    }),
});

export const collections = { projects };
