/**
 * Site motion (approved by Jonas, 2026-10-28). Loaded after first paint by BaseLayout,
 * never when the visitor prefers reduced motion. Content is visible without JS: the
 * hidden start state only exists while <html> has `js-motion` (set inline in <head>).
 *
 *   [data-reveal="smoke"]  headings: words resolve from blur, 1100 ms, stagger 60 ms
 *   [data-reveal="fade"]   content: opacity + 12 px, 450 ms, stagger 60 ms
 *   [data-cursor]          custom cursor states (pointer: fine only)
 *   #site-menu             fullscreen menu: backdrop fade + links from below
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(ScrollTrigger, SplitText);

const EASE = 'power3.out'; // closest GSAP curve to --ease-out (0.22, 1, 0.36, 1)
const root = document.documentElement;

function smoke(heading: HTMLElement) {
  const split = SplitText.create(heading, { type: 'words', aria: 'auto' });
  gsap.set(heading, { opacity: 1 });
  const tl = gsap.from(split.words, {
    opacity: 0,
    filter: 'blur(12px)',
    y: 8,
    letterSpacing: '0.04em',
    duration: 1.1,
    stagger: 0.06,
    ease: EASE,
    paused: true,
    onComplete: () => {
      split.revert();
    },
  });
  // Hero heading plays on load; the rest once, when 15 % into the viewport.
  if (heading.closest('.hero')) tl.play();
  else ScrollTrigger.create({ trigger: heading, start: 'top 85%', once: true, onEnter: () => tl.play() });
}

function revealHeadings() {
  document.querySelectorAll<HTMLElement>('[data-reveal="smoke"]').forEach(smoke);
}

function revealContent() {
  const items = gsap.utils.toArray<HTMLElement>('[data-reveal="fade"]');
  gsap.set(items, { opacity: 0, y: 12 });
  ScrollTrigger.batch(items, {
    start: 'top 85%',
    once: true,
    onEnter: (batch) =>
      gsap.to(batch, { opacity: 1, y: 0, duration: 0.45, stagger: 0.06, ease: EASE, clearProps: 'transform' }),
  });
}

function cursor() {
  if (!matchMedia('(pointer: fine)').matches) return;
  const dot = document.createElement('div');
  dot.className = 'cursor';
  dot.setAttribute('aria-hidden', 'true');
  dot.innerHTML =
    '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="M7 7h10v10"/><path d="M7 17 17 7"/></svg>';
  document.body.append(dot);

  const x = gsap.quickTo(dot, 'x', { duration: 0.35, ease: EASE });
  const y = gsap.quickTo(dot, 'y', { duration: 0.35, ease: EASE });
  let shown = false;

  window.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    if (!shown) {
      gsap.set(dot, { x: e.clientX, y: e.clientY });
      dot.classList.add('is-visible');
      shown = true;
    }
    x(e.clientX);
    y(e.clientY);
  });
  document.addEventListener('pointerleave', () => {
    dot.classList.remove('is-visible');
    shown = false;
  });
  document.addEventListener('pointerover', (e) => {
    const target = e.target as Element;
    const project = target.closest('[data-cursor="project"]');
    dot.classList.toggle('is-project', !!project);
    dot.classList.toggle('is-link', !project && !!target.closest('a, button, summary, [role="button"]'));
  });
}

function menu() {
  const dialog = document.getElementById('site-menu') as HTMLDialogElement | null;
  if (!dialog) return;
  const links = dialog.querySelectorAll('.menu__link');
  new MutationObserver(() => {
    if (!dialog.open) return;
    gsap.fromTo(dialog, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: EASE });
    gsap.fromTo(
      links,
      { yPercent: 60, opacity: 0 },
      { yPercent: 0, opacity: 1, duration: 0.6, stagger: 0.05, delay: 0.1, ease: EASE, clearProps: 'all' },
    );
  }).observe(dialog, { attributes: true, attributeFilter: ['open'] });
}

document.fonts.ready.then(() => {
  revealHeadings();
  revealContent();
  root.classList.add('motion-ready');
  cursor();
  menu();
});
