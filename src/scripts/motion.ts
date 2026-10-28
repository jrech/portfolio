/**
 * Shared editorial motion: 900 ms content/rules, 1050 ms masked headings,
 * 85 ms stagger, one soft easing curve. Scroll-scrubbed statement with word-by-word focus.
 * Content remains available without JS and with reduced motion.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { CustomEase } from 'gsap/CustomEase';

gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase);

// Curves: fast start, long soft landing, so movement settles like a real object.
const EASE = CustomEase.create('site-out', '0.22, 1, 0.36, 1'); // same as --ease-out in tokens.css
const EASE_REVEAL = EASE; // expo-like out, headings
const EASE_MENU = CustomEase.create('site-menu', '0.76, 0, 0.24, 1'); // shutter: eases in and out
const root = document.documentElement;


const MOTION = { duration: 0.9, heading: 1.05, stagger: 0.085, distance: 20 };
const visible = (el: HTMLElement) => el.getClientRects().length > 0;

// Split only at entry: off-screen headings keep natural wrapping until needed.
function revealHeadings() {
  document.querySelectorAll<HTMLElement>('[data-reveal="heading"]').forEach((heading) => {
    const play = () => {
      gsap.set(heading, { opacity: 1 });
      SplitText.create(heading, {
        type: 'lines', mask: 'lines', linesClass: 'split-line', aria: 'auto',
        autoSplit: true,
        onSplit(self) {
          return gsap.fromTo(self.lines,
            { yPercent: 104, opacity: 0, filter: 'blur(6px)' },
            {
              yPercent: 0, opacity: 1, filter: 'blur(0px)',
              duration: MOTION.heading, stagger: MOTION.stagger, ease: EASE,
              onComplete: () => self.revert(),
            },
          );
        },
      });
    };
    if (heading.closest('.hero')) play();
    else ScrollTrigger.create({ trigger: heading, start: 'top 88%', once: true, onEnter: play });
  });
}


function scrubStatement() {
  document.querySelectorAll<HTMLElement>('[data-reveal="scrub"]').forEach(text => {
    const section = text.closest('section') ?? text;
    const split = SplitText.create(text, { type: 'words', aria: 'auto' });
    gsap.set(text, { opacity: 1 });
    gsap.fromTo(split.words,
      { opacity: 0.15, filter: 'blur(4px)' },
      {
        opacity: 1, filter: 'blur(0px)', stagger: 0.1, ease: 'none',
        scrollTrigger: {
          trigger: section, start: 'top top', end: '+=100%',
          scrub: 0.6, pin: true, invalidateOnRefresh: true,
        },
      },
    );
  });
}

function revealHero() {
  const items = gsap.utils.toArray<HTMLElement>('.hero [data-reveal="fade"], .hero__baseline');
  gsap.fromTo(items, { opacity: 0, y: MOTION.distance }, {
    opacity: 1, y: 0, duration: MOTION.duration, delay: 0.22,
    stagger: MOTION.stagger, ease: EASE, clearProps: 'transform,opacity',
  });
}

function revealContent() {
  const selector = '[data-reveal="fade"], .eyebrow, .footer__lead, .footer__bio, .footer__email, .footer__col, .footer__legal, .footer__invite .cta';
  const candidates = gsap.utils.toArray<HTMLElement>(selector).filter(el =>
    !el.closest('.hero, #site-menu') && visible(el));
  // Animate the owning block once; never stack parent and child translations.
  const items = candidates.filter(el => !candidates.some(parent => parent !== el && parent.contains(el)));
  gsap.set(items, { opacity: 0, y: MOTION.distance });
  ScrollTrigger.batch(items, {
    start: 'top 88%', once: true, batchMax: 4, interval: 0.06,
    onEnter: batch => gsap.to(batch, {
      opacity: 1, y: 0, duration: MOTION.duration,
      stagger: MOTION.stagger, ease: EASE, clearProps: 'transform,opacity',
    }),
  });
}

// Keep borders in layout; the pseudo element supplies only the visual stroke.
function revealRules() {
  const rules: HTMLElement[] = [];
  document.querySelectorAll<HTMLElement>('main section *, footer *').forEach(el => {
    if (!visible(el) || el.matches('img, svg, path, button, a')) return;
    const style = getComputedStyle(el);
    if (parseFloat(style.borderTopWidth) !== 1 || style.borderTopStyle !== 'solid') return;
    el.style.setProperty('--motion-rule-color', style.borderTopColor);
    el.classList.add('motion-rule-top');
    rules.push(el);
  });
  gsap.set(rules, { '--rule-progress': 0 });
  ScrollTrigger.batch(rules, {
    start: 'top 90%', once: true, batchMax: 4, interval: 0.06,
    onEnter: batch => gsap.to(batch, {
      '--rule-progress': 1, duration: MOTION.duration,
      stagger: MOTION.stagger, ease: EASE,
    }),
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
  const STRENGTH = 0.12;
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
      gsap.to(el, { '--mx': '0px', '--my': '0px', duration: 0.8, ease: EASE, overwrite: true });
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
  // The head timeout deliberately wins: never hide content again after a slow load.
  if (!root.classList.contains('js-motion')) return;
  try {
    scrubStatement();
    revealHeadings();
    revealHero();
    revealContent();
    revealRules();
    root.classList.add('motion-ready');
    cursor();
    magnet();
    faq();
    menu();
    ScrollTrigger.refresh();
  } catch (error) {
    ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    gsap.globalTimeline.getChildren().forEach(animation => animation.progress(1));
    root.classList.remove('js-motion');
    console.warn('Motion disabled; content remains accessible.', error);
  }
});

matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', event => {
  if (!event.matches) return;
  ScrollTrigger.getAll().forEach(trigger => trigger.kill());
  gsap.globalTimeline.getChildren().forEach(animation => animation.totalProgress(1));
  root.classList.remove('js-motion');
});
