# Motion audit and implementation

## Findings
- Heading, body, hero and menu had separate curves and timing.
- A pinned statement added a full viewport of scrolling to read one paragraph.
- Borders appeared as part of a fading row rather than drawing independently.
- Footer copy, columns and hero baseline lacked entrance motion.
- Magnetic controls used a strong offset and elastic return.
- Headings were split before entering the viewport, risking stale line wrapping.
- A late motion module could hide content again after the head fallback timeout.

## Shared system
- Soft ease: cubic-bezier(0.22, 1, 0.36, 1).
- Content: 700 ms, 20 px lift, 60 ms stagger, batches capped at four, triggered at 92% of the viewport.
- Separator rules: 1.3 s on power1.inOut, drawn left to right alongside their content.
- Headings: word by word (`HEADING_SPLIT = 'words'`), 1.1 s per word on power2.out, stagger capped
  so a long heading takes about 1.7 s, triggered at 82%. Blur (12 px to zero) only with a fine pointer.
- Project images: 1.4 s focus-in (scale 1.04 to 1, brightness 0.8 to 1); blur only with a fine pointer.
- First visit per tab: hero photo fades in (1.1 s, image wait capped at 0.8 s); H1, intro, CTA, bar and
  navigation start 0.35 s in, navigation alongside the content. CTA and menu are in place after ~1.2 s.
  Scroll, tap or key skips the intro, also while the photo is still loading.
  Page-to-page navigation uses a cover that rolls down and lifts on the next page.
- Heading splitting happens on entry and adapts to width changes until completion.
- Statement keeps its sticky, scroll-scrubbed word reveal over one viewport. Each word resolves from 15% opacity / 4 px blur to full opacity / sharp focus; reversing scroll reverses the effect.
- One-pixel top rules draw left to right; border geometry is preserved.
- No parent/child double reveal for content groups.
- Magnetic strength reduced to 0.12, with the shared soft return.
- Existing FAQ and modal behavior retained.
- No-JS/reduced-motion rendering remains readable. A late module respects the fallback.
- Turning on reduced motion (or a motion error) ends active animations, removes scroll triggers and
  clears the inline hidden state of everything that had not revealed yet.
- Touch screens get no animated blur anywhere (it flickered purple on phones).

## Verification scope
Code audit covered motion.ts, global styles, base layout, tokens, hero, services,
process, FAQ, project cards, about, testimonial, CTA, eyebrow and footer.
Deployment build is the compilation gate. Visual timing on a real mobile and desktop
still needs a browser review; an award-level result cannot be established by code alone.
