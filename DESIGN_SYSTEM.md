# Jonas Rech — Design system

**Status:** synchronized with the approved Pen designs (`portfo.pen`) and the HTML exports in `pen_exports/` (homepage desktop "2. Quiet confidence — Cream rhythm", tablet 834, mobile 390, fullscreen navigation desktop/mobile, Prádelna Krkonoše case study desktop/mobile). Updated for the Astro implementation (Phase 1 + 2 homepage, Phase 3 case studies, 2026‑10‑28).

- **Existing** = directly visible in approved canvases, exports or Pen variables.
- **Proposed** = implementation guidance, not an approved design decision.
- **Implemented** = what `src/` currently does (Phase 1: tokens, global styles, header, fullscreen menu, hero, footer. Phase 2: every remaining homepage section).

## Source of truth

1. Latest approved Pen designs (visual source of truth)
2. Pen design system / variables (token names)
3. HTML exports (exact pixel values: sizes, gaps, paddings, line-heights)
4. This repository

Where the Pen **variables** disagree with the values the approved **frames** actually use, the frames win, because they are what was approved. Every such case is listed under *Discrepancies*.

---

## Foundations

### Color tokens

CSS custom properties live in `src/styles/tokens.css`. Names follow the Pen variables (`color/accent` → `--color-accent`).

| CSS variable | HEX | Pen variable | Use |
|---|---:|---|---|
| `--color-background` | `#10100F` | `color/background` (*#171817*, see discrepancies) | Page background, menu, footer |
| `--color-background-deep` | `#0F0F0E` | — | Selected projects section |
| `--color-surface` | `#20211F` | `color/surface` | Raised surfaces, media placeholders |
| `--color-text-display` | `#F2EFE9` | — | Hero headline, wordmark, hamburger lines, CTA arrow circle |
| `--color-text-primary` | `#EAE9E5` | `color/text-primary` | Primary text, headings, links |
| `--color-text-intro` | `#C6C3BC` | — | Hero introduction |
| `--color-text-secondary` | `#A4A29C` | `color/text-secondary` | Captions, metadata, secondary email |
| `--color-rule` | `#484844` | `color/rule` | 1px dividers |
| `--color-paper` | `#D5D3CA` | `color/paper` | Explore anchor, social labels in menu |
| `--color-ink` | `#10100F` | `color/ink` (*#171817*) | Text on orange |
| `--color-accent` | `#FF4D18` | `color/accent` | Indices, CTA, active menu item, arrows, focus ring |
| `--color-cream` | `#EEE9DF` | — | Cream rhythm surface (Services, Process) |
| `--color-cream-ink` | `#171817` | — | Primary text on cream |
| `--color-cream-muted` | `#595A53` | — | Secondary text on cream |
| `--color-cream-rule` | `#C9C5BA` | — | Dividers on cream |

**Approved application:** dark is the default. Cream is used only for Services and Process (all three breakpoints). Preserve orange accents. No gradients or ambient glow on approved pages, except the hero portrait readability shade and the footer background threads (fine cream-to-orange WebGL lines, `scripts/threads.ts`, port of React Bits Threads; replaced the ambient glow at Jonas's request, 2026-10-29; not in Pen).

### Typography

| Role | Family | CSS variable | Notes |
|---|---|---|---|
| Display + body | **Rethink Sans** (variable 400–800) | `--font-display`, `--font-body` | Self-hosted via `@fontsource-variable/rethink-sans` (includes latin-ext for Czech) |
| Caption / metadata | **Space Mono** 700 | `--font-caption` | Self-hosted via `@fontsource/space-mono`; uppercase where the copy is uppercase |

`fonts/jonasrech.com/*.woff2` (Instrument Sans, Manrope) belong to the **old live site capture** inside the Pen file and are not part of the new design.

**Pen type scale variables** (px) — reference only, the frames use their own values:
desktop `h1 90 · h2 64 · h3 36 · h4 24 · lead 20 · body 16 · small 14 · label 11`; mobile `h1 56 · h2 40 · h3 28 · h4 22 · lead 18 · body 16 · small 14 · label 10`.

**Values used by approved frames** (size / line-height / tracking, weight):

| Element | Desktop 1440 | Tablet 834 | Mobile 390 |
|---|---|---|---|
| Hero headline (500) | 66 / 0.98 / −3.5 | 52 / 0.98 / −2.5 | 36 / 0.98 / −1.5 |
| Hero intro (400) | 17 / 26px | 16 / 1.5 | 16 / 1.5 |
| Section title (500) | 54 / normal / −2.3 | — | — |
| Case-study title (500) | 90 / 88px / −4 | — | 56 / 55px / −2.5 |
| Footer headline, homepage (500) | 80 / 80px / −3.5, centered | 56 / 1.02 / −2 | 42 / 1.02 / −1.6 |
| Footer headline, case study (500) | 64 / 65px / −2.8 | — | 36 / 37px / −1.3 |
| Menu link (500) | 72 / 1.04 / −3 | 56 / normal / −2 | 46 / 1.05 / −1.8 |
| Wordmark (700) | 22 / normal / −1 | 20 (menu: 21) | 20 |
| CTA label (700) | 18 | 18 | 18 |
| Footer / menu email (400) | 22 / −0.4 (homepage: 36, 500, −1) | 26 / −0.4 | 21 / −0.4 |
| Caption (Space Mono 700) | 11 / +1.2 | 11 / +1.2 | 10 / +0.9 |

Caption size/tracking is tokenised (`--caption-size`, `--caption-tracking`) and switches at the tablet breakpoint. Fluid type is **not** used: sizes step at breakpoints, as the frames do.

### Spacing

Pen variables `space/1 4 · /2 8 · /3 12 · /4 16 · /6 24 · /8 32 · /12 48 · /16 64` → `--space-1 … --space-16`. Frames also use 26, 28, 30, 36, 44, 60, 80, 90, 104, 120, 160 px; those stay as literal values in the component that owns them rather than being forced onto the 4/8 scale.

Section rhythm — **deviates from Pen on purpose** (Jonas, 2026-10-28: "more whitespace, it feels crammed"). All homepage sections share two tokens in `tokens.css`:

| Token | Mobile | Tablet | Desktop | Pen frames had |
|---|---|---|---|---|
| `--section-space` (section padding-block) | 104 | 136 | 192 | 56–64 · 80 · 120–160 |
| `--section-stack` (intro → content) | 56 | 72 | 96 | 36–40 · 44 · 44–64 |

Item spacing also grew: work grid rows 36/44/44 → 56/72/80, service rows padding 24/28 → 32/40, FAQ rows 26+30 → 32+36, process steps (mobile) 32 → 48, About story 32/100 → 48/120, FAQ intro↔list 90 → 120, Process intro→steps 126 → 144. Footer: invite block 104/108 → 160/168 and wider gaps around the contact and nav. To tune globally, change the two tokens. The Proposition section is a full viewport (100svh) instead.

### Grid, containers, breakpoints

| | Mobile | Tablet | Desktop |
|---|---|---|---|
| Acceptance frame | 390 | 834 | 1440 |
| CSS range | < 640 | 640–1023 | ≥ 1024 |
| Gutter `--gutter` | 24 | 40 | 60 |
| Header height `--header-height` | 80 | 80 | 96 |
| Project grid gap `--grid-gap` | 36 (stacked) | 24 (2 col) | 28 (2 col) |

- `.container` = `max-width: 1320px + 2 × gutter`, centered, gutter padding. Above 1440 px the content column stays 1320 px wide and centers (**assumption**: the design has no frame wider than 1440). Full-bleed media (hero portrait) spans the viewport.
- `.grid` / `.grid--2` = editorial project grid: stacked on mobile, two equal columns from tablet.
- Breakpoint values 640 / 1024 are **implementation choices**; the design only defines the three acceptance frames.

### Shape, layers

`--radius-pill: 28px` (CTA), circles fully round. `--z-header: 10`, `--z-menu: 100` (menu is a modal `<dialog>`, so it sits in the top layer anyway).

---

## Components

### Header (`SiteHeader.astro`) — Implemented

Wordmark `JONAS RECH®` left, menu toggle right, `height: var(--header-height)`, gutter padding.
- Toggle = 44×44 hit area with two 27×2 px lines, 7 px apart (`--color-text-display`).
- Desktop adds a `MENU` caption (Space Mono 10 / +2px, secondary) 12 px left of the lines. Tablet/mobile: lines only.
- `overlay` prop: positioned over the hero (homepage). Without it the header takes its own row (case studies).

### Fullscreen navigation (`MenuOverlay.astro`) — Implemented

Native `<dialog>` opened with `showModal()`: focus trap, `Esc` closes, background inert, scroll locked, focus moves to Close and returns to the toggle.

| | Desktop | Tablet | Mobile |
|---|---|---|---|
| Header height | 96 | 88 | 80 |
| Close | `CLOSE` caption + 26px ×, gap 14 | caption + 25px ×, gap 12 | 24px × only |
| Body padding | 44 top/bottom, gap 60 | 44 / 48, gap 24 | 38 / 24, gap 24 |
| Links | gap 6, row padding 4, index gap 28, max-width 760 | gap 8, row 72px, index gap 24 | gap 12, row 58px, index gap 20 |
| Arrow | 38 | 30 | 26 |
| Baseline | rule top, 28 / 36 padding; email · socials · language spread | rule top, 28 / 32; email left, socials + language right | rule top, 24 / 28; stacked: email, then socials ↔ language |

Content: caption `TAKE A LOOK AROUND`; links `01 Work · 02 Services · 03 About · 04 Process · 05 Contact`; baseline `HAVE A PROJECT IN MIND?` + `hello@jonasrech.com`, Instagram / LinkedIn with 16px (mobile 14px) icons in `--color-text-secondary`, `EN / CZ`.

**State:** the frames show "Work" in orange with an arrow. Implemented as the **hover / focus / current-page** state (`aria-current="page"`); all other items rest in `--color-text-primary`. *(Assumption — the design shows a single static state.)*

### CTA / Start a project (`CtaButton.astro`) — Implemented

Pen reusable component `GBUkS`: height 56, padding `8 8 8 22`, gap 26, radius 28, `--color-accent` fill; label 18/700 `--color-ink`; 40px `--color-text-display` circle with 20px Lucide `arrow-up-right`. `block` prop stretches it full width with `space-between` (mobile hero).

### Eyebrow (`Eyebrow.astro`) — Implemented

`[NN]` orange index + secondary caption, gap 12 (e.g. `[01] A few things I’ve made`). `accent` variant without index (`YOUR NEXT CHAPTER`).

### Media frame (`MediaFrame.astro`) — Implemented (placeholder)

`<figure>` with a fixed `aspect-ratio`, `--color-surface` placeholder, `object-fit: cover` for slotted `<img>` / `<video>`. Known media sizes from the exports:

| Media | Desktop | Tablet | Mobile |
|---|---|---|---|
| Hero portrait | 1440 × 816 (full bleed) | 834 × 800 | 390 × 520 (top), shade over full 830 |
| Project card image | 646 × 345 | 365 × 240 | 342 × 230 |

### Homepage hero (`Hero.astro`) — Implemented

| | Desktop | Tablet | Mobile |
|---|---|---|---|
| Section height | 816 | 800 | 830 |
| Message top / width | 229 / 860 (headline 843) | 270 / 640 (headline 538) | 340 / 342 |
| Stack gap | 30 | 24 | 24 |
| Actions | row, gap 30, 16 top padding | row, gap 20 | column, gap 20, CTA full width |
| `Explore the work ↓` | Rethink Sans 11/700 | Space Mono 11/+1.2 | Space Mono 10/+0.9 |
| Location baseline | 53 from bottom | 32 from bottom | 25 from bottom |
| Readability shade | `linear-gradient(-90deg, #10100f00 0%, #10100fCC 70%, #10100f 100%)` | same | `linear-gradient(0deg, #10100f 0%, #10100fEE 42%, #10100f00 85%)` |

Portrait is a neutral placeholder; pass final media through the `media` slot.

### Footer — contact invitation + footer (`SiteFooter.astro`) — Implemented

Top rule, `--color-background`, `id="contact"`.

- **`centered`** (homepage desktop, Cream rhythm frame): `YOUR NEXT CHAPTER` (accent) → 80px headline broken after "something" → lead *"Let’s talk about your business and what comes next."* → CTA, all centered in a `104 160 108` block; then centered bio (17/26, max 696) and 36px email; rule; `EXPLORE` / `ELSEWHERE` columns (gap 14, 15px links); rule; legal row `© 2026 JONAS RECH · Privacy policy · EN / CZ · Back to top ↑`.
- **`split`** (case studies): eyebrow, headline left + CTA right (gap 64), supporting line, email, link rows, legal row. Supported now; used from Phase 2.
- **Tablet / mobile** (both variants): left-aligned stack — `[06] Your next chapter`, headline, CTA, secondary email, inline link row, social row, legal (row on tablet; stacked on mobile in the order copyright, privacy, back to top, language). Gaps: tablet 44 / padding 80; mobile 36 / padding 64; email → links always 40.

### Homepage sections (Phase 2) — Implemented

Order (from the Pen frame): Hero → Selected work → Proposition → Services → Testimonial → About → Process → FAQ → Contact/footer. Copy lives in `src/data/home.ts`; components in `src/components/home/`.

Surface themes: `.theme-deep` = `--color-background-deep`; `.theme-cream` = cream surface that **remaps** `--color-text-primary/-display/-secondary` and `--color-rule` to the cream tokens, so captions, eyebrows and rules adapt without variants.

| Section (id) | Surface | Padding D / T / M | Key values D · T · M |
|---|---|---|---|
| Selected work `#work` | deep | 160 / 80 / 64 | title 54 −2.3 · 48 −1.5 · 36 −1.5; grid 2 col, gap 44×28 · 44×24 · stack 36 |
| Proposition | deep | 240 / 80 / 64 | 72/76 −3.5 (max 1130) · 54/59 −2 · 38/42 −1.6 |
| Services `#services` | cream | 120 / 80 / 64 | title 68/69 −3 · 52/53 −2 · 40/41 −1.6; rows: index 40 · name 480 34/38 · desc 430 15/22 right-aligned |
| Testimonial | deep | 160 / 80 / 56 | mark 100/80 · 64/51 · 48/38; quote 45/52 −1.7 · 38/44 · 25/33 |
| About `#about` | deep (D) / base | 120 / 80 / 64 | title 76/78 · 56/57 · 40/41; portrait 640×520 · 330×440 · full×390; gap 100 · 32 · 32 |
| Process `#process` | cream | 160 / 80 / 64 | title 64/67 · 52/54 · 40/42; steps 4 columns staircase (+56px each) · rows (index 64, w72) · rows (index 40, w56) |
| FAQ `#faq` | base | 140 / 80 / 64 | intro 430 + gap 90 · stacked; question 24/29 · 23/28 · 20/24 |

Components:
- **`ProjectCard`**: `MediaFrame` (height 345 / 240 / 230), title 30 / 23 / 24, description 15/21 (desktop measure 501 / 495 px where the frame fixes it) · 14/20, disciplines caption (desktop only), 42px accent circle with ink arrow. Whole card clickable through the title link; arrow rotates 45° on hover/focus. Details stretch so arrows align across a row.
- **`ComingSoonCard`**: surface panel (padding 32 / 24) with `04 / IN THE WORKS`, statement 47/49 · 30/31 · 32/33 with a fixed line break, "Coming soon" + status caption (desktop only).
- **Service row**: `<ol>`; index hidden on mobile; desktop copy is longer than tablet/mobile copy (both kept, swapped by CSS).
- **Testimonial**: `<figure>` + `<blockquote lang="cs">`, 48px avatar placeholder (slot), name 14/700, company Rethink 11 (desktop) / Space Mono caption (tablet, mobile).
- **About**: desktop uses the CTA button; tablet/mobile use the text link "Let’s work together ↗", "More about me" and the "ONE PERSON. A SHARED DIRECTION." signature (per frame).
- **Process step**: big index (secondary color), title, description, outcome caption with 15px accent arrow. The Pen promise line ("No handoffs. No guesswork.", Lucide `messages-square`) was **removed** at Jonas's request (2026-10-29), CZ and EN.
- **FAQ**: native `<details name="faq">` — exclusive accordion, keyboard accessible, zero JS; first item open; `+` (primary) / `−` (accent) icons, 22px.

### Selected work grid (updated 2026-10-28, approved by Jonas)

- "Coming soon" card removed. The first project spans the full grid width from tablet up (media 400 tablet / 600 desktop — **no Pen frame, my proposal**), the other two sit side by side below. Mobile is unchanged (stack).
- Cards are generated from the `projects` collection. While a project's `status` is `in-preparation` the card is **not a link** (title is plain text, arrow stays as a visual, no hover rotation). Setting `status: published` makes it link to `/work/<slug>`.

### Case study (Phase 3) — Implemented

Pen frames "Case study / Prádelna Krkonoše — Desktop / Mobile" (exports `case_desktop.html`, `case_mobile.html`). There is **no tablet frame**; tablet values (640–1023) are interpolated and marked as such in the CSS.

| Part | Component | Desktop 1440 | Tablet (interpolated) | Mobile 390 |
|---|---|---|---|---|
| Header | `SiteHeader` (not overlay) | 96 | 80 | 80 |
| Hero | `case/CaseHero` | padding-top 80, gap 48; title 90/88 −4; positioning 20/28 max 720; metadata 4 columns (gap 32, padding 24 0, rule on top); visual 704 | top 64, gap 40; title 72/71 −3.2; metadata 2×2; visual 440 | top 56, gap 36; title 56/55 −2.5 (14vw below 390); metadata stacked (gap 24); visual 280 |
| Editorial section | `case/CaseSection` | padding 160 / 120, gap 48; heading 64/67 −2.5 flex 1 + reading column 552 (18/27), gap 96 | 120 / 96; heading 52/54 −2; reading 18/27, max 552 | 96 / 72, gap 36; heading 40/42 −1.5; reading 16/24 |
| Decisions | `case/CaseDecisions` | rows: number 12 accent w48, title 28 −0.7, copy 16/24 w552, padding 32 0, gap 32 | stacked (as mobile) | stacked, padding 24 0, gap 16, title 26 |
| Visual 01 `full` | `case/CaseVisual` | 656, surface + 1px rule outline, padding 48 | 520, padding 40 | 360, padding 24 |
| Visual 02 `responsive` | `case/CaseVisual` | 720, `#171817`, row, mobile slot 256×544 | row, slot 192×328 | column, slot 192×328 |
| Visual 03 `detail` | `case/CaseVisual` | 520, paper `#D5D3CA`, ink text | 440 | 360 |
| Visual caption | — | mono caption under the frame, gap 16 | gap 24 | gap 32 |
| More selected work | `case/RelatedWork`, `case/RelatedCard` | rule on top, padding 160, gap 48; heading 64 −2.5; 2 cards (gap 32), media 480, title 28 −0.8 + services 14, 42px arrow; "← Back to all projects" | padding 120; 2 columns, media 320 | padding 96, gap 36; heading 40; cards stacked (gap 40), media 256, title 24 |
| Footer | `SiteFooter variant="split"` | "Your project could be next." + CTA right; "Have something in mind? Let’s talk." | — | — |

Content: `src/content/projects/<slug>.md` (schema in `src/content.config.ts`, helpers in `src/lib/projects.ts`). Missing sections render a marked "CONTENT TO FOLLOW" placeholder, missing visuals render neutral slots; nothing is invented. Related projects: the entry's `related` list, then the next projects by order, never the current one, max 2; with none left only the back link renders. Unpublished case studies are built (for review) with `noindex, nofollow` and are not linked from anywhere visitors can reach.

Case-study decisions and deviations:

- **Gutter**: 60 px like the rest of the site, not the 64 px of the case frames (see discrepancy 8).
- **Eyebrow labels**: Pen has "The challenge" without a period and the other three with one; all four use the period.
- **Visual placeholder photos + tint** in the frames are reference images; they are not used. A supplied `image` fills the frame and replaces the brief.
- **Visual captions** are `nowrap` in the mobile frame and run past 390 px; implemented wrapping.
- **Related card titles**: 28 px for Starobrněnský šenk but 30 px for GRIND on desktop (24/28 on mobile); unified to 28 desktop / 24 mobile.
- **Mobile footer** in the case frame drops the column labels and puts links in rows; the shared mobile footer from the homepage is used instead (one footer, one behaviour).
- **Testimonial**: no slot in the case frame. When a project has an approved `testimonial`, the homepage testimonial block is reused after the outcome.
- **Exporter inflation (discrepancy 12)** also hits the case export (metadata row, decision rows, related section, legal row); Pen hug heights are used, so the export measures 47 / 189 / 322 / 23 px taller in those places.

---

## Interaction and motion

**Existing:** the designs show hover affordances and link/button intent only; Pen specifies no timings, easing or triggers.

**Implemented (restrained, Phase 1–2):**

| Element | State |
|---|---|
| All interactive elements | `:focus-visible` 2px `--color-accent` outline, 3px offset |
| CTA | arrow nudges 1px up-right on hover/focus (220ms); press scales to 0.98 |
| Menu toggle | `MENU` label brightens, lower line shifts 4px on hover |
| Menu links | hover/focus/current → accent + arrow fades in (220ms) |
| Footer / menu links | color shift to accent (160ms); footer email brightens |
| Explore anchor | underline + brighter on hover/focus |
| Project card | arrow circle rotates 45° on hover / focus-within (220ms); focus ring around the whole card |
| FAQ | `+` rotates 90° on hover; open state swaps to accent `−` |
| About text links | underline on hover/focus |

Tokens: `--ease-out: cubic-bezier(0.22, 1, 0.36, 1)`, `--duration-fast: 160ms`, `--duration-base: 220ms`. `prefers-reduced-motion: reduce` collapses all transitions and disables smooth scrolling.

**Implemented (Phase 4, GSAP — `src/scripts/motion.ts`, approved by Jonas 2026-10-28):** headings slide up line by line from a mask with a light blur (1.1 s, expo-like out); hero runs headline → intro → CTAs; grouped content rises 24 px with 160 ms stagger; Proposition is pinned for one viewport while words go from dim to full; menu rolls down from the top and back up on close; FAQ animates height, one item open at a time; magnetic hover on CTAs and the logo; custom follower cursor that becomes an 88 px arrow circle over card images. Project titles turn accent on hover (no underline, no image zoom). Reduced motion: none of this loads.

**Earlier proposals (superseded where the list above differs):**

| Effect | Proposed specification |
|---|---|
| Text-roll link | 240 ms ease-out, one-line vertical swap, no layout shift |
| Scroll reveal | opacity + 12 px translate, 450 ms ease-out, 60 ms stagger; trigger at 15% viewport; content visible without JS (GSAP) |
| Project video preview | hover/focus only, muted, looped, 200 ms crossfade; paused offscreen; static image fallback |
| Section transition | color change only; no animated wipes |
| Ambient glow / typography parallax | not in approved designs; optional future proposal only |

Honor `prefers-reduced-motion`: no parallax, reveals, text-roll or autoplay previews.

---

## Responsive guidance

- 1440 / 834 / 390 are the visual acceptance points; between them the layout reflows with the nearest frame's values (no interpolation).
- Copy is identical across breakpoints; only line wrapping, sizes and stacking change.
- Hero heights are fixed per frame. At 320 px the headline wraps to five lines and still clears the location baseline (verified).

## Discrepancies found (Pen variables vs. frames vs. exports)

1. **Background / ink:** Pen variables say `#171817`; every approved frame and export uses `#10100F` (and `#0F0F0E` for Selected projects). Implemented `#10100F`. → Update the Pen variables, or confirm `#171817` is intended.
2. **Desktop homepage frame missing from `portfo.pen`:** the export is "2. Quiet confidence — Cream rhythm", but the `.pen` file only contains "1. Quiet confidence". Their footers differ (Cream rhythm: centered, with bio and EXPLORE/ELSEWHERE labels; Quiet confidence: left headline + right CTA). Implemented the export (newer). → Re-save `portfo.pen` so it contains the approved frame.
3. **Footer content differs by breakpoint:** desktop has the bio, lead line and column labels; tablet/mobile omit them and use an `[06]` eyebrow. Implemented as designed (content hidden below desktop). → Confirm the bio should really disappear on mobile.
4. **Mobile footer `FAQ` link** is Space Mono 10px in `#D5D3CA` while its siblings are Rethink Sans 13px. Treated as a design slip: implemented consistently with the other links.
5. **Social labels in the menu:** Rethink Sans 11/700 on desktop, Space Mono on tablet/mobile. Implemented per frame. → Pick one.
6. **Explore the work anchor:** Rethink Sans on desktop, Space Mono on tablet/mobile. Implemented per frame.
7. **Menu header height** is 88 px on tablet, while the page header is 80 px. Implemented per frame (the wordmark jumps 4 px when the menu opens on tablet).
8. **Gutter on case studies** is 64 px (desktop) vs. 60 px on the homepage and in the menu. Shared header/footer use 60 px. → Confirm 60 px for case studies.
9. **Menu baseline overflows the frame** in the desktop and mobile navigation exports (language selector ends past 1440 / 390 px). Implemented inside the gutter.
10. **"Large Jonas Rech signature"** mentioned in the previous version of this file does not appear in any approved footer frame. Not implemented.
11. **Nav targets:** menu says "Contact", footer says "FAQ" in the same position; both are kept as designed.
12. **Exporter inflates bordered rows (important).** Every frame with a top border is exported as `box-sizing: content-box` with a fixed height that *already includes* its padding, so the padding is applied twice. Affected: service rows (+56px each), collapsed FAQ items (+56px), testimonial attribution (+24), About signature (+24), footer nav (+36) and legal rows (+24). In `portfo.pen` these frames have **no fixed height** (hug content). Implemented the Pen behavior; that is why Services, FAQ and the footer are shorter than the HTML export. **Confirmed by Jonas (2026‑10‑28): follow Pen.**
13. **Hidden layers:** disciplines and "NEW WORK IN PROGRESS" are disabled in the tablet/mobile frames, the Process promise in tablet/mobile, and service indices on mobile. Implemented as hidden at those breakpoints. FAQ answers 2–5 exist in Pen as disabled layers and are used as the accordion content.
14. **Copy differs per breakpoint:** services descriptions (long on desktop, short on tablet/mobile); Services lead "Strategy, design and development. One clear direction." exists only on tablet/mobile; About actions differ (button vs. text links + signature). Implemented per frame. → Worth unifying.
15. **Testimonial spelling:** mobile frame says "Jonáš", desktop/tablet say "Jonas". Used "Jonas". The quote is Czech on an otherwise English page (marked `lang="cs"`).
16. **"Let's work together ↗"** uses a straight apostrophe in the frames; implemented with ’ like the rest of the copy.
17. **About surface:** `#0F0F0E` on desktop, `#10100F` on tablet/mobile (and the same 1-step difference for Selected work on tablet). Visually identical; implemented as in the frames for About, deep everywhere for Selected work.

## Clarifications still needed

1. EN / CZ: implemented — Czech at `/`, English at `/en/`, geo redirect for visitors outside CZ/SK (`middleware.ts`), working EN / CZ switch, hreflang. Czech one-letter words are bound to the next word with a non-breaking space. Longer Czech copy wraps the Services title to three lines on desktop (two in Pen).
2. Instagram URL: set to `instagram.com/jonasrech.design/` from Jonas's note; confirm the handle. LinkedIn confirmed.
3. Privacy policy page (linked to `/privacy`, not built — 404).
4. ~~mailto vs #contact~~ decided: every "Start a project" goes to `#contact`; mailto only on the plain email text. A short questionnaire + Cal.com comes later.
5. Approval of proposed motion timings before GSAP work starts.
6. Prádelna testimonial: approved by the client (2026-10-28). Prádelna narrative is still draft copy for client review.
7. "More about me" points to `/about` (no page planned in the designs — 404).
8. Case-study content for Starobrněnský šenk and GRIND (nothing beyond the homepage card copy exists).
