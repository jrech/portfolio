# jonasrech.com — Astro (redesign 2026)

Personal portfolio of Jonáš Rech. Astro + TypeScript, scoped CSS with design tokens in `src/styles/global.css`, GSAP + Lenis for motion, light/dark theme. Static output on Vercel; the contact form posts to a Vercel Function (`api/contact.ts`).

## Commands

```sh
npm install
npm run dev           # http://localhost:4321 (no middleware, no /api/contact)
npm run build         # static output in dist/
npm run check         # astro check
npm run test:contact  # api/contact.ts against mocked Notion + Resend, nothing is sent
```

## Structure

```
src/
  layouts/Base.astro        html shell, theme (no-flash inline script), hreflang, language + theme switch
  views/                    page bodies shared by both languages (Home, PradelnaKrkonose, NotFound)
  pages/                    Czech at the root, English under en/ (thin wrappers around views/)
  components/               landing sections (Hero, Work, Problems, Deliverables, …), Header, Contact
  scripts/                  main.ts → motion (GSAP), smooth scroll + anchor centring (Lenis), form, theme, …
  styles/global.css         tokens (light + dark), base styles
  data/inquiry.ts           form definitions + server-side validation (questionnaire and short form)
  i18n.ts                   locale helpers, localeLinks()
api/contact.ts, api/_lib/   Vercel Function: Notion lead + Resend emails
middleware.ts               Vercel Routing Middleware: first-visit geo redirect to /en/
vercel.json                 redirects for old URLs
```

## Languages

Czech is the default at `/` (no prefix), English lives under `/en/` (Astro i18n, `prefixDefaultLocale: false`). Old `/cs/…` URLs 301 to the unprefixed path (`vercel.json`). Visitors outside CZ/SK are redirected to `/en/` on their first visit by `middleware.ts` (Vercel only); bots are never redirected. The language switch stores the choice in the `lang` cookie, which the redirect respects.

Case studies that don't exist yet (etecsa, grind, kids-garden, starobrnensky-senk) redirect temporarily (302) to `/#prace` / `/en/#prace`.

## Project inquiry

The contact card at the bottom of every page has a short form (name, phone or email, current website, a few words about the business; `src/components/Contact.astro`, `src/scripts/form.ts`). It posts JSON with `form: 'short'` to `/api/contact`; the fields are defined and validated by `getShortForm()` / `validateShortForm()` in `src/data/inquiry.ts`. The previous seven-step questionnaire (`getInquiry()`) is still accepted by the same endpoint.

Short-form specifics: no questionnaire answers are invented (project type, budget and timing stay empty in Notion); a phone number instead of an email leaves the Notion e-mail empty, goes into the brief and skips the client confirmation (Jonas still gets the notification). If sending fails, the error message offers a pre-filled mailto.

Both are posted to `api/contact.ts`, a Vercel Function next to the static site (no Astro adapter; like `middleware.ts` it does not run under `astro dev`, use `vercel dev` or a preview deploy). It:

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

The client confirmation always links the welcome package PDF on production: `https://www.jonasrech.com/welcome.pdf` (CZ) or `/welcome-en.pdf` (EN), served from `public/`. The email copy and HTML layout live in `api/_lib/lead.ts` (`WORDS`, `confirmationHtml`).

Tests (mocked Notion and Resend, nothing is sent): `npm run test:contact`.
