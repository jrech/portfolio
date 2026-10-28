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
- Content and rules: 900 ms, 20 px content lift, 85 ms stagger, batches capped at four.
- Headings: 1050 ms masked line reveal, 85 ms stagger, smoke blur resolving from 6 px to zero.
- Heading splitting happens on entry and adapts to width changes until completion.
- Statement follows the heading language with native scrolling.
- One-pixel top rules draw left to right; border geometry is preserved.
- No parent/child double reveal for content groups.
- Magnetic strength reduced to 0.12, with the shared soft return.
- Existing FAQ and modal behavior retained.
- No-JS/reduced-motion rendering remains readable. A late module respects the fallback.
- Turning on reduced motion ends active animations and removes scroll triggers.

## Verification scope
Code audit covered motion.ts, global styles, base layout, tokens, hero, services,
process, FAQ, project cards, about, testimonial, CTA, eyebrow and footer.
Deployment build is the compilation gate. Visual timing on a real mobile and desktop
still needs a browser review; an award-level result cannot be established by code alone.
