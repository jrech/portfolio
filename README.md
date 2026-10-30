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

The main CTA opens a fullscreen seven-step questionnaire (one single-choice question per step, contact last), in Czech or English after the page language (`src/components/site/InquiryDialog.astro`, `src/scripts/inquiry.ts`; questions in `src/data/inquiry.ts`).

On the last step the answers are posted to `api/contact.ts`, a Vercel Function next to the static site (no Astro adapter; like `middleware.ts` it does not run under `astro dev`, use `vercel dev` or a preview deploy). It:

1. rejects cross-origin requests, oversized bodies, a filled honeypot (`website`, answered with a fake success), submissions finished in under 4 s, and more than 5 requests per IP in 10 minutes (per warm instance, best effort);
2. validates the answers against `src/data/inquiry.ts` (known options only, required fields, lengths, control characters stripped);
3. saves the lead to the Notion "Leads" data source (API version `2025-09-03`). The browser sends a `submissionId` kept with the draft; a retry with the same ID reuses the existing Notion page instead of creating a second one. English answers are mapped to the Czech select options;
4. sends the client a confirmation and Jonas a notification with a link to the Notion page through Resend (with idempotency keys, so a retry does not mail twice), then ticks `Potvrzení odesláno` only after Resend accepted the confirmation. A failed confirmation is flagged in `Další krok` instead;
5. if Notion fails, still emails Jonas every answer (subject starts with `[NEULOŽENO]`) so no lead is lost silently; only if that fails too does the visitor see the error state (their draft stays saved).

Mapping: Firma ← company (or the name when empty), Kontakt ← name, Email ← email, Typ projektu ← "Co potřebujete?", Rozpočet klienta ← budget, Požadovaný termín ← "Kdy byste chtěli začít?", Web ← website address, Brief poptávky ← all project answers + message, ID webové poptávky ← submissionId, Follow-up ← +2 business days; Stav `New`, Zdroj poptávky `Webový formulář`, Další krok `Prověřit poptávku a odpovědět` (defaults in `LEAD_DEFAULTS`, `api/_lib/lead.ts`). Telefon stays empty (the form has no phone field).

Set these in Vercel → Project → Settings → Environment Variables:

| Variable | Required | Example |
| --- | --- | --- |
| `NOTION_API_KEY` | yes | internal integration secret, `ntn_…`; the integration must be connected to the Leads database |
| `NOTION_DATA_SOURCE_ID` | yes | `2d1282f1-dc9e-8018-89f1-000b9e6603eb` |
| `RESEND_API_KEY` | yes | `re_…` |
| `CONTACT_FROM_EMAIL` | yes | `Jonáš Rech <poptavka@jonasrech.com>` (domain verified in Resend) |
| `CONTACT_NOTIFICATION_EMAIL` | yes | where Jonas gets new leads |
| `CONTACT_REPLY_TO_EMAIL` | no | reply-to on the client confirmation, defaults to `CONTACT_NOTIFICATION_EMAIL` |
| `CONTACT_TEST_RECIPIENT` | no | **Preview only.** Every client confirmation goes here instead of the visitor |

Without the Notion variables the function answers 503 and the visitor sees the error state (the draft stays saved in the browser). Without the Resend variables leads are saved to Notion but no emails go out.

Tests (mocked Notion and Resend, nothing is sent): `npm run test:contact`.
