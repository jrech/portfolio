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


// Kept short and triggered early: content should already be moving as it enters view.
const MOTION = { duration: 0.7, heading: 0.85, stagger: 0.06, distance: 20 };
const START = 'top 92%';
// Separator lines draw slower and on an even in-out curve, so the whole stroke is seen
// travelling across instead of jumping to ~70% in the first frames (Jonas, 2026-10-29).
const RULE = { duration: 1.4, ease: 'power2.inOut' };
const visible = (el: HTMLElement) => el.getClientRects().length > 0;
const passed = (el: HTMLElement) => el.getBoundingClientRect().bottom <= 0;

// Split only at entry: off-screen headings keep natural wrapping until needed.
function revealHeadings() {
  document.querySelectorAll<HTMLElement>('[data-reveal="heading"]').forEach((heading) => {
    if (heading.closest('.footer, .services') || (heading.closest('.faq') && matchMedia('(min-width: 1024px)').matches)) return;
    if (passed(heading)) return;
    gsap.set(heading, { opacity: 0 });
    const play = async () => {
      await document.fonts.ready;
      if (!root.classList.contains('js-motion')) return;
      // Hide the lines before showing their parent to avoid a one-frame flash.
      const split = SplitText.create(heading, {
        type: 'lines', mask: 'lines', linesClass: 'split-line', aria: 'auto', reduceWhiteSpace: false,
      });
      gsap.set(split.lines, { yPercent: 104, opacity: 0, filter: 'blur(6px)' });
      gsap.set(heading, { opacity: 1 });
      gsap.to(split.lines, {
        yPercent: 0, opacity: 1, filter: 'blur(0px)',
        duration: MOTION.heading, stagger: MOTION.stagger, ease: EASE,
        onComplete: () => {
          split.revert();
          gsap.set(heading, { opacity: 1 });
        },
      });
    };
    if (heading.closest('.hero')) play();
    else ScrollTrigger.create({ trigger: heading, start: START, once: true, onEnter: play });
  });
}

function scrubStatement() {
  document.querySelectorAll<HTMLElement>('[data-reveal="scrub"]').forEach(text => {
    const section = text.closest('section') ?? text;
    const split = SplitText.create(text, { type: 'words', aria: 'auto', reduceWhiteSpace: false });
    gsap.set(text, { opacity: 1 });
    gsap.fromTo(split.words,
      { opacity: 0.15, filter: 'blur(4px)' },
      {
        opacity: 1, filter: 'blur(0px)', stagger: 0.1, ease: 'none',
        scrollTrigger: {
          trigger: section, start: 'top top', end: 'bottom bottom',
          scrub: 0.6, invalidateOnRefresh: true,
        },
      },
    );
  });
}

// Hero entrance in one overlapping flow: H1 (revealHeadings) > intro > CTAs > navigation.
function revealHero() {
  const content = gsap.utils.toArray<HTMLElement>('.hero [data-reveal="fade"]');
  const nav = gsap.utils.toArray<HTMLElement>('.site-header--overlay .site-header__inner > *');
  const baseline = gsap.utils.toArray<HTMLElement>('.hero__baseline');
  // Start states first, so nothing flashes before the delayed timeline begins.
  gsap.set(content, { opacity: 0, y: MOTION.distance });
  gsap.set(nav, { opacity: 0, y: -10 });
  gsap.set(baseline, { opacity: 0 });
  gsap.timeline({ delay: 0.3, defaults: { duration: 0.8, ease: EASE, clearProps: 'transform,opacity' } })
    .to(content, { opacity: 1, y: 0, stagger: 0.14 })
    .to(nav, { opacity: 1, y: 0, stagger: 0.06 }, '-=0.55')
    .to(baseline, { opacity: 1 }, '<');
}

function revealContent() {
  const selector = '[data-reveal="fade"], .eyebrow, .footer__lead, .footer__bio, .footer__email, .footer__col, .footer__legal, .footer__invite .cta';
  const candidates = gsap.utils.toArray<HTMLElement>(selector).filter(el =>
    !el.closest('.hero, #site-menu, .footer, .services') && visible(el) &&
    !(matchMedia('(min-width: 1024px)').matches && el.matches('.step, .faq__item')));
  // Animate the owning block once; never stack parent and child translations.
  const items = candidates.filter(el => !passed(el) && !candidates.some(parent => parent !== el && parent.contains(el)));
  if (!items.length) return;
  gsap.set(items, { opacity: 0, y: MOTION.distance });
  ScrollTrigger.batch(items, {
    start: START, once: true, batchMax: 4, interval: 0.06,
    onEnter: batch => gsap.to(batch, {
      opacity: 1, y: 0, duration: MOTION.duration,
      stagger: MOTION.stagger, ease: EASE, clearProps: 'transform,opacity',
    }),
  });
}

// Keep borders in layout; the pseudo element supplies only the visual stroke.
function revealRules() {
  const rules: HTMLElement[] = [];
  document.querySelectorAll<HTMLElement>('.service, .testimonial__attribution, .faq__item, .footer__nav, .footer__legal').forEach(el => {
    if (!visible(el) || el.matches('img, svg, path, button, a')) return;
    const style = getComputedStyle(el);
    if (parseFloat(style.borderTopWidth) !== 1 || style.borderTopStyle !== 'solid') return;
    el.style.setProperty('--motion-rule-color', style.borderTopColor);
    el.classList.add('motion-rule-top');
    rules.push(el);
  });
  const pending = rules.filter(el => !passed(el));
  const generic = pending.filter(el => !el.matches('.service') &&
    !(el.matches('.faq__item') && matchMedia('(min-width: 1024px)').matches));
  gsap.set(pending, { '--rule-progress': 0 });
  if (!generic.length) return;
  ScrollTrigger.batch(generic, {
    start: 'top 90%', once: true, batchMax: 4, interval: 0.06,
    onEnter: batch => gsap.to(batch, {
      '--rule-progress': 1, duration: RULE.duration,
      stagger: MOTION.stagger, ease: RULE.ease,
    }),
  });
}


function revealServices() {
  const section = document.querySelector<HTMLElement>('.services');
  if (!section || passed(section)) return;
  const intro = section.querySelector<HTMLElement>('.services__intro');
  const heading = section.querySelector<HTMLElement>('[data-reveal="heading"]');
  if (!intro || !heading) return;
  const eyebrow = [...intro.querySelectorAll<HTMLElement>('.eyebrow')].filter(visible);
  const lead = [...intro.querySelectorAll<HTMLElement>('.services__lead')].filter(visible);
  const rows = [...section.querySelectorAll<HTMLElement>('.service')].filter(visible);

  let previous: Promise<void> = Promise.resolve();
  if (!passed(intro)) {
    gsap.set([...eyebrow, ...lead], { opacity: 0, y: MOTION.distance });
    gsap.set(heading, { opacity: 0 });
    previous = new Promise<void>(resolve => {
      ScrollTrigger.create({
        trigger: intro, start: START, once: true,
        onEnter: async () => {
          await document.fonts.ready;
          if (!root.classList.contains('js-motion') || passed(intro)) {
            gsap.set([heading, ...eyebrow, ...lead], { clearProps: 'opacity,transform' });
            resolve();
            return;
          }
          const split = SplitText.create(heading, {
            type: 'lines', mask: 'lines', linesClass: 'split-line', aria: 'auto', reduceWhiteSpace: false,
          });
          gsap.set(split.lines, { yPercent: 104, opacity: 0, filter: 'blur(6px)' });
          const timeline = gsap.timeline();
          gsap.delayedCall(0.35, resolve);
          if (eyebrow.length) timeline.to(eyebrow, {
            opacity: 1, y: 0, duration: 0.45, ease: EASE, clearProps: 'transform,opacity',
          });
          timeline.set(heading, { opacity: 1 });
          timeline.to(split.lines, {
            yPercent: 0, opacity: 1, filter: 'blur(0px)', duration: MOTION.heading,
            stagger: MOTION.stagger, ease: EASE,
            onComplete: () => {
              split.revert();
              gsap.set(heading, { opacity: 1 });
            },
          }, eyebrow.length ? '-=0.3' : 0);
          if (lead.length) timeline.to(lead, {
            opacity: 1, y: 0, duration: MOTION.duration, ease: EASE,
            clearProps: 'transform,opacity',
          }, '-=0.55');
        },
      });
    });
  }

  rows.forEach(row => {
    if (passed(row)) return;
    gsap.set(row, { opacity: 0, y: MOTION.distance });
    const waitForPrevious = previous;
    previous = new Promise<void>(resolve => {
      ScrollTrigger.create({
        trigger: row, start: START, once: true,
        onEnter: async () => {
          await waitForPrevious;
          if (!root.classList.contains('js-motion') || passed(row)) {
            gsap.set(row, { clearProps: 'opacity,transform', '--rule-progress': 1 });
            resolve();
            return;
          }
          gsap.timeline()
            .to(row, {
              opacity: 1, y: 0, duration: MOTION.duration, ease: EASE,
              clearProps: 'transform,opacity',
            })
            .to(row, { '--rule-progress': 1, duration: RULE.duration, ease: RULE.ease }, '<')
            .call(resolve, [], 0.07); // next row follows a beat later, overlapping
        },
      });
    });
  });
}

function revealSequences() {
  if (!matchMedia('(min-width: 1024px)').matches) return;
  const steps = gsap.utils.toArray<HTMLElement>('.process__steps .step');
  if (steps.length && !passed(steps[steps.length - 1])) {
    gsap.set(steps, { opacity: 0, y: MOTION.distance });
    gsap.to(steps, {
      opacity: 1, y: 0, duration: MOTION.duration, stagger: 0.1,
      ease: EASE, clearProps: 'transform,opacity',
      scrollTrigger: { trigger: '.process__steps', start: START, once: true },
    });
  }
  const heading = document.querySelector<HTMLElement>('.faq [data-reveal="heading"]');
  const questions = gsap.utils.toArray<HTMLElement>('.faq__item');
  if (!heading || !questions.length || passed(heading)) return;
  gsap.set(heading, { opacity: 0 });
  gsap.set(questions, { opacity: 0, y: MOTION.distance });
  ScrollTrigger.create({
    trigger: heading, start: START, once: true,
    onEnter: async () => {
      await document.fonts.ready;
      if (!root.classList.contains('js-motion')) return;
      const split = SplitText.create(heading, {
        type: 'lines', mask: 'lines', linesClass: 'split-line', aria: 'auto', reduceWhiteSpace: false,
      });
      gsap.set(split.lines, { yPercent: 104, opacity: 0, filter: 'blur(6px)' });
      const timeline = gsap.timeline();
      timeline.set(heading, { opacity: 1 });
      timeline.to(split.lines,
        { yPercent: 0, opacity: 1, filter: 'blur(0px)', duration: MOTION.heading,
          stagger: MOTION.stagger, ease: EASE, onComplete: () => {
            split.revert();
            gsap.set(heading, { opacity: 1 });
          } },
      );
      timeline.to(questions, {
        opacity: 1, y: 0, duration: MOTION.duration, stagger: 0.07,
        ease: EASE, clearProps: 'transform,opacity',
      }, '-=0.55');
      timeline.to(questions.filter(el => el.classList.contains('motion-rule-top')), {
        '--rule-progress': 1, duration: RULE.duration, stagger: 0.07, ease: RULE.ease,
      }, '<0.22');
    },
  });
}


function revealFooter() {
  const footer = document.querySelector<HTMLElement>('.footer');
  if (!footer) return;
  const heading = footer.querySelector<HTMLElement>('.footer__title');
  const invite = footer.querySelector<HTMLElement>('.footer__invite');
  if (!heading || !invite) return;

  const eyebrow = [...invite.querySelectorAll<HTMLElement>('.eyebrow')].filter(visible);
  const action = invite.querySelector<HTMLElement>('.cta');
  const lead = invite.querySelector<HTMLElement>('.footer__lead');
  const centered = footer.classList.contains('footer--centered') && matchMedia('(min-width: 1024px)').matches;
  const support = (centered ? [lead, action] : [action, lead])
    .filter((el): el is HTMLElement => !!el && visible(el));

  // Each scroll entry waits for the section above it. On a fast jump, elements
  // that are already behind the viewport are shown immediately instead of
  // leaving a long trail of invisible content.
  let previous: Promise<void> = Promise.resolve();
  if (!passed(invite)) {
    gsap.set([...eyebrow, ...support], { opacity: 0, y: MOTION.distance });
    gsap.set(heading, { opacity: 0 });
    previous = new Promise<void>(resolve => {
      ScrollTrigger.create({
        trigger: invite, start: START, once: true,
        onEnter: async () => {
          await document.fonts.ready;
          if (!root.classList.contains('js-motion') || passed(invite)) {
            gsap.set([heading, ...eyebrow, ...support], { clearProps: 'opacity,transform' });
            resolve();
            return;
          }
          const split = SplitText.create(heading, {
            type: 'lines', mask: 'lines', linesClass: 'split-line', aria: 'auto', reduceWhiteSpace: false,
          });
          gsap.set(split.lines, { yPercent: 104, opacity: 0, filter: 'blur(6px)' });
          const timeline = gsap.timeline();
          gsap.delayedCall(0.35, resolve);
          if (eyebrow.length) timeline.to(eyebrow, {
            opacity: 1, y: 0, duration: 0.45, ease: EASE, clearProps: 'transform,opacity',
          });
          timeline.set(heading, { opacity: 1 });
          timeline.to(split.lines, {
            yPercent: 0, opacity: 1, filter: 'blur(0px)', duration: MOTION.heading,
            stagger: MOTION.stagger, ease: EASE,
            onComplete: () => {
              split.revert();
              gsap.set(heading, { opacity: 1 });
            },
          }, eyebrow.length ? '-=0.3' : 0);
          support.forEach(el => timeline.to(el, {
            opacity: 1, y: 0, duration: MOTION.duration, ease: EASE,
            clearProps: 'transform,opacity',
          }, '-=0.55'));
        },
      });
    });
  }

  const groups: [string, string, number][] = [
    ['.footer__contact', '.footer__contact > *', 0.16],
    ['.footer__nav', '.footer__col-label, .footer__nav li', 0.12],
    ['.footer__legal', '.footer__legal > *', 0.1],
  ];
  groups.forEach(([containerSelector, itemSelector, stagger]) => {
    const container = footer.querySelector<HTMLElement>(containerSelector);
    if (!container || passed(container)) return;
    const items = [...container.querySelectorAll<HTMLElement>(itemSelector)].filter(visible);
    if (!items.length) return;
    gsap.set(items, { opacity: 0, y: MOTION.distance });
    const waitForPrevious = previous;
    previous = new Promise<void>(resolve => {
      ScrollTrigger.create({
        trigger: container, start: START, once: true,
        onEnter: async () => {
          await waitForPrevious;
          if (!root.classList.contains('js-motion') || passed(container)) {
            gsap.set(items, { clearProps: 'opacity,transform' });
            resolve();
            return;
          }
          gsap.to(items, {
            opacity: 1, y: 0, duration: MOTION.duration, stagger,
            ease: EASE, clearProps: 'transform,opacity',
          });
          gsap.delayedCall(0.15, resolve);
        },
      });
    });
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

// FAQ accordion: one open at a time, handled here because the native `name` grouping
// would close the previous item without animation. Only the padding-free `.faq__panel`
// height is tweened (between measured pixel values), so nothing snaps at either end.
function faq() {
  const items = gsap.utils.toArray<HTMLDetailsElement>('.faq__item');
  const panel = (item: HTMLDetailsElement) => item.querySelector<HTMLElement>('.faq__panel')!;
  const DURATION = 0.5;

  const collapse = (item: HTMLDetailsElement) => {
    const el = panel(item);
    gsap.killTweensOf(el);
    gsap.fromTo(
      el,
      { height: el.offsetHeight, overflow: 'hidden' },
      {
        height: 0,
        opacity: 0,
        duration: DURATION,
        ease: EASE_MENU,
        onComplete: () => {
          item.open = false;
          gsap.set(el, { clearProps: 'height,opacity,overflow' });
        },
      },
    );
  };

  const expand = (item: HTMLDetailsElement) => {
    const el = panel(item);
    gsap.killTweensOf(el);
    item.open = true;
    const target = el.scrollHeight;
    gsap.fromTo(
      el,
      { height: 0, opacity: 0, overflow: 'hidden' },
      {
        height: target,
        opacity: 1,
        duration: DURATION,
        ease: EASE_MENU,
        onComplete: () => gsap.set(el, { clearProps: 'height,opacity,overflow' }),
      },
    );
    gsap.fromTo(item.querySelector('.faq__icon--minus'), { rotate: -90 }, { rotate: 0, duration: 0.45, ease: EASE });
  };

  items.forEach((item) => {
    item.removeAttribute('name');
    item.querySelector('summary')?.addEventListener('click', (e) => {
      e.preventDefault();
      if (item.open && !gsap.isTweening(panel(item))) return collapse(item);
      if (item.open) return; // mid-animation click: let the current tween finish
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


function initializeMotion() {
  // The head timeout deliberately wins: never hide content again after a slow load.
  if (!root.classList.contains('js-motion')) return;
  try {
    scrubStatement();
    revealHeadings();
    revealHero();
    revealContent();
    revealRules();
    revealServices();
    revealSequences();
    revealFooter();
    root.classList.add('motion-ready');
    cursor();
    magnet();
      faq();
    menu();
    ScrollTrigger.sort();
    ScrollTrigger.refresh();
  } catch (error) {
    ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    gsap.globalTimeline.getChildren().forEach(animation => animation.progress(1));
    root.classList.remove('js-motion');
    console.warn('Motion disabled; content remains accessible.', error);
  }
}

initializeMotion();

matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', event => {
  if (!event.matches) return;
  ScrollTrigger.getAll().forEach(trigger => trigger.kill());
  gsap.globalTimeline.getChildren().forEach(animation => animation.totalProgress(1));
  root.classList.remove('js-motion');
});
