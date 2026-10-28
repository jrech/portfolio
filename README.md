# jonasrech.com — Astro

Personal portfolio of Jonas Rech. Astro + TypeScript, scoped CSS with design tokens, no UI framework.

## Commands

```sh
npm install
npm run dev      # http://localhost:4321
npm run build    # static output in dist/ (static; deploy target: Vercel)
npm run check    # astro check (types + diagnostics)
```

## Structure

```
src/
  styles/tokens.css        design tokens (colors, type, spacing, layout, motion)
  styles/global.css        reset, base, .caption, .container, .grid, a11y helpers
  layouts/BaseLayout.astro html shell, fonts, skip link, header/footer slots
  components/
    ui/        CtaButton, Eyebrow, Icon (Lucide), MediaFrame, Wordmark
    site/      SiteHeader, MenuOverlay (fullscreen <dialog>), SiteFooter
    ui/        + ArrowBadge, Lines
    home/      homepage sections
    case/      CaseHero, CaseSection, CaseDecisions, CaseVisual, RelatedWork, RelatedCard
  layouts/CaseStudyLayout.astro
  data/site.ts             nav items, email, socials
  data/home.ts             homepage copy
  content/projects/*.md    one file per project (schema in content.config.ts)
  lib/projects.ts          sorting, related projects, published check
  pages/index.astro
  pages/work/[slug].astro  case-study pages
```

Design reference: `DESIGN_SYSTEM.md`, `portfo.pen`, `pen_exports/`.

Status: Phase 1 (foundation), Phase 2 (homepage) and Phase 3 (case-study template) done. GSAP motion, final media, CS/EN and deployment come later.

## Publishing a case study

Case studies are built but hidden until their content is ready: `status: in-preparation` keeps the homepage card unlinked and the page `noindex`. Preview them directly at `/work/<slug>`. Fill in the Markdown file in `src/content/projects/`, then set `status: published`.
