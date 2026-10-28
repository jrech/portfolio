/**
 * Site motion (approved by Jonas, 2026-10-28). Loaded after first paint by BaseLayout,
 * never when the visitor prefers reduced motion. Content is visible without JS: the
 * hidden start state only exists while <html> has `js-motion` (set inline in <head>).
 *
 *   [data-reveal="heading"] headings: lines slide up from a mask, light blur, 1100 ms expo-like out, stagger 90 ms
 *   .hero                   headline, then intro (+350 ms), then CTAs (+150 ms)
 *   [data-reveal="fade"]    content: opacity + 24 px, 800 ms, stagger 160 ms
 *   .cta, .wordmark         magnetic hover (pointer: fine, not in the menu)
 *   .faq__item              accordion: height + opacity, one open at a time
 *   [data-cursor]           custom cursor states (pointer: fine only); arrow circle over the card image
 *   #site-menu              fullscreen menu: rolls down from the top (clip-path), links from below; rolls back up on close
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { CustomEase } from 'gsap/CustomEase';

gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase);

// Curves: fast start, long soft landing, so movement settles like a real object.
const EASE = CustomEase.create('site-out', '0.22, 1, 0.36, 1'); // same as --ease-out in tokens.css
const EASE_REVEAL = CustomEase.create('site-reveal', '0.16, 1, 0.3, 1'); // expo-like out, headings
const EASE_MENU = CustomEase.create('site-menu', '0.76, 0, 0.24, 1'); // shutter: eases in and out
const root = document.documentElement;

function slideUp(heading: HTMLElement) {
  // Lines slide up from behind a mask; a light blur keeps a hint of the smoke look.
  const split = SplitText.create(heading, { type: 'lines', mask: 'lines', linesClass: 'split-line', aria: 'auto' });
  heading.classList.add('is-split');
  gsap.set(heading, { opacity: 1 });
  const tl = gsap.from(split.lines, {
    yPercent: 105,
    opacity: 0,
    filter: 'blur(4px)',
    duration: 1.1,
    stagger: 0.09,
    ease: EASE_REVEAL,
    paused: true,
    onComplete: () => {
      split.revert();
      heading.classList.remove('is-split');
    },
  });
  // Hero heading plays on load; the rest once, when 15 % into the viewport.
  if (heading.closest('.hero')) tl.play();
  else ScrollTrigger.create({ trigger: heading, start: 'top 85%', once: true, onEnter: () => tl.play() });
}

function revealHeadings() {
  document.querySelectorAll<HTMLElement>('[data-reveal="heading"]').forEach(slideUp);
}

// Hero entrance runs in order: headline, then intro, then CTAs, each a beat later.
function revealHero() {
  const items = gsap.utils.toArray<HTMLElement>('.hero [data-reveal="fade"]');
  gsap.fromTo(
    items,
    { opacity: 0, y: 16 },
    { opacity: 1, y: 0, duration: 0.9, delay: 0.35, stagger: 0.15, ease: EASE, clearProps: 'transform' },
  );
}

function revealContent() {
  const items = gsap.utils.toArray<HTMLElement>('[data-reveal="fade"]').filter((el) => !el.closest('.hero'));
  gsap.set(items, { opacity: 0, y: 24 });
  ScrollTrigger.batch(items, {
    start: 'top 85%',
    once: true,
    // Items entering together (process steps, services, FAQ rows) come in one after another.
    onEnter: (batch) =>
      gsap.to(batch, { opacity: 1, y: 0, duration: 0.8, stagger: 0.16, ease: EASE, clearProps: 'transform' }),
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
    // Big arrow circle only over the project image, so it never covers the title or copy.
    const project = target.closest('[data-cursor="project"] .media');
    dot.classList.toggle('is-project', !!project);
    dot.classList.toggle('is-link', !project && !!target.closest('a, button, summary, [role="button"]'));
  });
}

const MENU_HIDDEN = 'inset(0% 0% 100% 0%)';
const MENU_SHOWN = 'inset(0% 0% 0% 0%)';

// Magnetic hover on CTAs and the logo (not inside the menu): the element leans
// toward the pointer by a fraction of the distance and springs back on leave.
function magnet() {
  if (!matchMedia('(pointer: fine)').matches) return;
  const STRENGTH = 0.3;
  document.querySelectorAll<HTMLElement>('.cta, .wordmark').forEach((el) => {
    if (el.closest('#site-menu')) return;
    el.classList.add('magnet');
    el.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      // Measure without the current offset, so the pull doesn't feed back into itself.
      const r = el.getBoundingClientRect();
      const mx = parseFloat(el.style.getPropertyValue('--mx')) || 0;
      const my = parseFloat(el.style.getPropertyValue('--my')) || 0;
      gsap.to(el, {
        '--mx': `${(e.clientX - (r.left - mx + r.width / 2)) * STRENGTH}px`,
        '--my': `${(e.clientY - (r.top - my + r.height / 2)) * STRENGTH}px`,
        duration: 0.5,
        ease: EASE,
        overwrite: true,
      });
    });
    el.addEventListener('pointerleave', () => {
      gsap.to(el, { '--mx': '0px', '--my': '0px', duration: 0.8, ease: 'elastic.out(1, 0.5)', overwrite: true });
    });
  });
}

// FAQ accordion: smooth height on open/close; one open at a time is handled here
// (the native `name` grouping would close the previous item without animation).
function faq() {
  const items = gsap.utils.toArray<HTMLDetailsElement>('.faq__item');
  const answer = (item: HTMLDetailsElement) => item.querySelector<HTMLElement>('.faq__answer')!;

  const collapse = (item: HTMLDetailsElement) => {
    gsap.killTweensOf(answer(item));
    gsap.to(answer(item), {
      height: 0,
      paddingTop: 0,
      opacity: 0,
      overflow: 'hidden',
      duration: 0.45,
      ease: EASE_MENU,
      onComplete: () => {
        item.open = false;
        gsap.set(answer(item), { clearProps: 'all' });
      },
    });
  };

  const expand = (item: HTMLDetailsElement) => {
    item.open = true;
    gsap.killTweensOf(answer(item));
    gsap.fromTo(
      answer(item),
      { height: 0, paddingTop: 0, opacity: 0, overflow: 'hidden' },
      { height: 'auto', paddingTop: '', opacity: 1, duration: 0.55, ease: EASE_MENU, clearProps: 'all' },
    );
    gsap.fromTo(item.querySelector('.faq__icon--minus'), { rotate: -90 }, { rotate: 0, duration: 0.45, ease: EASE });
  };

  items.forEach((item) => {
    item.removeAttribute('name');
    item.querySelector('summary')?.addEventListener('click', (e) => {
      e.preventDefault();
      if (item.open) return collapse(item);
      items.filter((other) => other !== item && other.open).forEach(collapse);
      expand(item);
    });
  });
}

function menu() {
  const dialog = document.getElementById('site-menu') as HTMLDialogElement | null;
  if (!dialog) return;
  const links = dialog.querySelectorAll('.menu__link');
  let closing = false;

  // Open: rolls down from the top edge, then the links rise in.
  new MutationObserver(() => {
    if (!dialog.open) return;
    closing = false;
    gsap.killTweensOf([dialog, links]);
    gsap.fromTo(
      dialog,
      { clipPath: MENU_HIDDEN },
      { clipPath: MENU_SHOWN, duration: 0.8, ease: EASE_MENU, clearProps: 'clipPath' },
    );
    gsap.fromTo(
      links,
      { yPercent: 60, opacity: 0 },
      { yPercent: 0, opacity: 1, duration: 0.8, stagger: 0.05, delay: 0.4, ease: EASE_REVEAL, clearProps: 'all' },
    );
  }).observe(dialog, { attributes: true, attributeFilter: ['open'] });

  // Close (button, link, Esc): rolls back up, then MenuOverlay closes the dialog.
  dialog.addEventListener('menu:close', (e) => {
    e.preventDefault();
    if (closing) return;
    closing = true;
    const { done } = (e as CustomEvent<{ done: () => void }>).detail;
    gsap.killTweensOf([dialog, links]);
    gsap.set(links, { clearProps: 'all' });
    gsap.fromTo(
      dialog,
      { clipPath: MENU_SHOWN },
      {
        clipPath: MENU_HIDDEN,
        duration: 0.65,
        ease: EASE_MENU,
        onComplete: () => {
          done();
          gsap.set(dialog, { clearProps: 'clipPath' });
          closing = false;
        },
      },
    );
  });
}

document.fonts.ready.then(() => {
  revealHeadings();
  revealHero();
  revealContent();
  root.classList.add('motion-ready');
  cursor();
  magnet();
  faq();
  menu();
});
