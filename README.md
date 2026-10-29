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
  i18n/en.json, cs.json    every visitor-facing string; cs.json mirrors en.json key for key
  i18n/index.ts            locale helpers, localePath(), Czech non-breaking-space typesetting
  content/projects/<cs|en>/*.md  one file per project and language (schema in content.config.ts)
  lib/projects.ts          sorting, related projects, published check
  components/pages/HomePage.astro  homepage body shared by both languages
  pages/index.astro, pages/en/index.astro
  pages/work/[slug].astro, pages/en/work/[slug].astro  case studies
middleware.ts              Vercel Routing Middleware: first-visit geo redirect to /en/
```

Design reference: `DESIGN_SYSTEM.md`, `portfo.pen`, `pen_exports/`.

Status: Phase 1 (foundation), Phase 2 (homepage) and Phase 3 (case-study template) done. GSAP motion, final media, CS/EN and deployment come later.

## Publishing a case study

Case studies are built but hidden until their content is ready: `status: in-preparation` keeps the homepage card unlinked and the page `noindex`. Preview them directly at `/work/<slug>`. Fill in the Markdown file in `src/content/projects/`, then set `status: published`.

## Languages

Czech is the default at `/`, English lives under `/en/` (Astro i18n). Visitors outside CZ/SK are redirected to `/en/` by `middleware.ts` (Vercel only, header `x-vercel-ip-country`); bots are never redirected, and the EN / CZ switch stores the choice in a `lang` cookie that the redirect respects. Locally (`npm run dev`) there is no geo redirect; open `/en/` directly.

## Project inquiry

The main CTA on Czech pages opens a fullscreen questionnaire (`src/components/site/InquiryDialog.astro`, `src/scripts/inquiry.ts`; questions in `src/data/inquiry.ts`). English pages keep linking to `#contact`.

Answers are posted to `api/inquiry.ts`, a Vercel Function that validates them against `src/data/inquiry.ts`, applies spam checks (honeypot, minimum fill time, same-origin, per-IP rate limit) and sends the email through [Resend](https://resend.com). It does not run under `astro dev`/`astro preview`; use `vercel dev` or a preview deploy.

Set these in Vercel → Project → Settings → Environment Variables:

| Variable | Required | Example |
| --- | --- | --- |
| `RESEND_API_KEY` | yes | `re_…` |
| `INQUIRY_FROM_EMAIL` | yes | `Poptávka <poptavka@jonasrech.com>` (domain verified in Resend) |
| `INQUIRY_TO_EMAIL` | no | defaults to `hello@jonasrech.com` |

Without them the endpoint answers 503 and the form shows its error state; the draft stays saved in the browser.
