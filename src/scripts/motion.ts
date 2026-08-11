import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

const EASE = 'power4.out';
const SECTION_START = 'top 72%';
const MEDIA_START = 'top 76%';

declare global {
  interface Window {
    __portfolioMotionCleanup?: () => void;
  }
}

const select = <T extends Element>(scope: ParentNode, selector: string) =>
  Array.from(scope.querySelectorAll<T>(selector));

const once = (element: Element, start = SECTION_START) => ({
  trigger: element,
  start,
  toggleActions: 'play none none none',
  invalidateOnRefresh: true,
});

const restoreSplitText = () => {
  document.querySelectorAll<HTMLElement>('[data-motion-words-ready]').forEach((element) => {
    const label = element.getAttribute('aria-label');
    if (label) element.textContent = label;
    element.removeAttribute('aria-label');
    delete element.dataset.motionWordsReady;
  });
};

const createSmoothScroll = () => {
  const lenis = new Lenis({
    autoRaf: false,
    lerp: .085,
    smoothWheel: true,
  });
  const onScroll = () => ScrollTrigger.update();
  const ticker = (time: number) => lenis.raf(time * 1000);
  lenis.on('scroll', onScroll);
  gsap.ticker.add(ticker);
  return { lenis, onScroll, ticker };
};

const revealLabel = (timeline: gsap.core.Timeline, element: Element | null, position: number | string = 0) => {
  if (!element) return;
  timeline.fromTo(element, { autoAlpha: 0, x: -18 }, { autoAlpha: 1, x: 0, duration: .7, ease: EASE }, position);
};

const revealText = (timeline: gsap.core.Timeline, element: Element | null, position: number | string = .08) => {
  if (!element) return;
  timeline.fromTo(
    element,
    { autoAlpha: 0, y: 34, clipPath: 'inset(0 0 100% 0)' },
    { autoAlpha: 1, y: 0, clipPath: 'inset(0 0 0% 0)', duration: 1.15, ease: EASE },
    position,
  );
};

const revealDetails = (timeline: gsap.core.Timeline, elements: Element[], position: number | string = .28) => {
  if (!elements.length) return;
  timeline.fromTo(
    elements,
    { autoAlpha: 0, y: 16 },
    { autoAlpha: 1, y: 0, duration: .7, stagger: .08, ease: EASE },
    position,
  );
};

const initStatementWordReveal = (section: HTMLElement) => {
  const words = select<HTMLElement>(section, '[data-statement-word]');
  if (!words.length) return;
  section.classList.add('statement--word-reveal');
  gsap.fromTo(words, { opacity: .2 }, {
    opacity: 1,
    duration: 2.35,
    ease: 'none',
    stagger: { each: .13, from: 'start' },
    scrollTrigger: {
      trigger: section,
      start: 'top 80%',
      end: 'top 35%',
      scrub: .35,
      invalidateOnRefresh: true,
    },
  });
};

export function initMotion(reduced: boolean) {
  window.__portfolioMotionCleanup?.();
  restoreSplitText();
  if (reduced) return;

  const smoothScroll = createSmoothScroll();
  const anchorController = new AbortController();
  select<HTMLAnchorElement>(document, 'a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const hash = link.getAttribute('href');
      const target = hash ? document.querySelector<HTMLElement>(hash) : null;
      if (!target) return;
      event.preventDefault();
      smoothScroll.lenis.scrollTo(target, { duration: 1.15, offset: 0 });
      history.pushState(null, '', hash);
    }, { signal: anchorController.signal });
  });

  const context = gsap.context(() => {
    const hero = document.querySelector<HTMLElement>('[data-motion="hero"]');
    if (hero) {
      const timeline = gsap.timeline({ defaults: { ease: EASE } });
      timeline
        .fromTo(hero.querySelector('.hero__image'), { autoAlpha: 0, scale: 1.035 }, { autoAlpha: 1, scale: 1, duration: 1.8, ease: 'power3.out' })
        .fromTo(hero.querySelector('[data-hero-eyebrow]'), { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: .8 }, .42)
        .fromTo(select(hero, '[data-hero-line]'), { autoAlpha: 0, yPercent: 14 }, { autoAlpha: 1, yPercent: 0, duration: 1.35, stagger: .1 }, .56)
        .fromTo(select(hero, '[data-hero-bottom] > *'), { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: .9, stagger: .12 }, 1.2);

      const heroTitle = hero.querySelector('h1');
      if (heroTitle) {
        gsap.to(heroTitle, {
          autoAlpha: .4,
          scale: .96,
          yPercent: -2.5,
          transformOrigin: 'left bottom',
          ease: 'none',
          scrollTrigger: {
            trigger: hero,
            start: 'top top',
            end: 'bottom 28%',
            scrub: .65,
            invalidateOnRefresh: true,
          },
        });
      }

      const heroBottom = hero.querySelector<HTMLElement>('[data-hero-bottom]');
      if (heroBottom) {
        gsap.to(heroBottom, {
          autoAlpha: .42,
          scale: .96,
          yPercent: -3.5,
          transformOrigin: 'left bottom',
          ease: 'none',
          scrollTrigger: {
            trigger: hero,
            start: 'top top',
            end: 'bottom 28%',
            scrub: .65,
            invalidateOnRefresh: true,
          },
        });
      }

    }

    document.querySelectorAll<HTMLElement>('[data-motion="statement"]').forEach((section) => {
      initStatementWordReveal(section);
    });

    document.querySelectorAll<HTMLElement>('[data-motion="work"]').forEach((section) => {
      const intro = section.querySelector('.section-intro');
      if (intro) {
        const timeline = gsap.timeline({ scrollTrigger: once(intro) });
        revealLabel(timeline, intro.querySelector('[data-motion-label]'));
        revealText(timeline, intro.querySelector('[data-motion-title]'), .1);
      }

      select<HTMLElement>(section, '[data-project]').forEach((card) => {
        const visual = card.querySelector<HTMLElement>('[data-project-reveal]');
        const meta = card.querySelector<HTMLElement>('[data-project-meta]');
        if (!visual) return;
        const timeline = gsap.timeline({ scrollTrigger: once(card, MEDIA_START) });
        timeline.fromTo(
          visual,
          { autoAlpha: 0, scale: .92 },
          { autoAlpha: 1, scale: 1, duration: 1.05, ease: EASE },
        );
        if (meta) revealDetails(timeline, Array.from(meta.children), .32);
      });
    });

    document.querySelectorAll<HTMLElement>('[data-motion="services"]').forEach((section) => {
      const intro = section.querySelector<HTMLElement>('[data-services-intro]');
      if (intro) {
        const timeline = gsap.timeline({ scrollTrigger: once(intro) });
        revealLabel(timeline, intro.querySelector('[data-motion-label]'));
        revealText(timeline, intro.querySelector('[data-motion-title]'), .08);
        revealDetails(timeline, select(intro, '[data-motion-support]'), .3);
      }
      const cards = select<HTMLElement>(section, '[data-service]');
      cards.forEach((card, index) => {
        gsap.fromTo(card, { autoAlpha: 0, y: 22, scale: .975 }, {
          autoAlpha: 1,
          y: 0,
          scale: 1,
          duration: .9,
          ease: EASE,
          delay: index * .1,
          clearProps: 'transform',
          scrollTrigger: once(card, 'top 84%'),
        });
      });
    });

    document.querySelectorAll<HTMLElement>('[data-motion="method"]').forEach((section) => {
      const intro = section.querySelector('.section-intro');
      if (intro) {
        const timeline = gsap.timeline({ scrollTrigger: once(intro) });
        revealLabel(timeline, intro.querySelector('[data-motion-label]'));
        revealText(timeline, intro.querySelector('[data-motion-title]'), .1);
      }
      const steps = section.querySelector<HTMLElement>('.method__steps');
      if (steps) {
        select<HTMLElement>(steps, '[data-method-step]').forEach((step) => {
          const timeline = gsap.timeline({ scrollTrigger: once(step, 'top 84%') });
          timeline
            .fromTo(step.querySelector('.method__number'), { autoAlpha: 0, x: -14 }, { autoAlpha: 1, x: 0, duration: .65, ease: EASE }, 0)
            .fromTo(step.querySelector('.method__text'), { autoAlpha: 0, y: 26, clipPath: 'inset(0 0 100% 0)' }, { autoAlpha: 1, y: 0, clipPath: 'inset(0 0 0% 0)', duration: 1.05, ease: EASE }, .08)
            .fromTo(step.querySelector('.method__line'), { scaleX: 0 }, { scaleX: 1, duration: .9, ease: EASE }, .18);
        });
      }
    });

    document.querySelectorAll<HTMLElement>('[data-motion="about"]').forEach((section) => {
      const image = section.querySelector<HTMLElement>('[data-about-image]');
      const copy = section.querySelector<HTMLElement>('[data-about-copy]');
      const timeline = gsap.timeline({ scrollTrigger: once(section) });
      if (image) timeline.fromTo(image, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 1.25, ease: EASE });
      if (copy) {
        revealLabel(timeline, copy.querySelector('[data-motion-label]'), .08);
        revealText(timeline, copy.querySelector('[data-motion-title]'), .14);
        revealDetails(timeline, select(copy, '[data-about-detail]'), .42);
      }
    });

    document.querySelectorAll<HTMLElement>('[data-motion="photos"]').forEach((section) => {
      const heading = section.querySelector('.photos__heading');
      if (heading) {
        const timeline = gsap.timeline({ scrollTrigger: once(heading) });
        revealLabel(timeline, heading.querySelector('[data-motion-label]'));
        revealText(timeline, heading.querySelector('[data-motion-title]'), .1);
      }
      const photoClip = 'inset(100% 0 0 0)';
      select<HTMLElement>(section, '[data-photo]').forEach((figure, index) => {
        const image = figure.querySelector('img');
        if (!image) return;
        gsap.fromTo(image, { clipPath: photoClip, y: 18 }, {
          clipPath: 'inset(0% 0% 0% 0%)',
          y: 0,
          duration: 1.15,
          delay: index * .16,
          ease: EASE,
          scrollTrigger: once(figure, MEDIA_START),
        });
      });
    });

    document.querySelectorAll<HTMLElement>('[data-motion="contact"]').forEach((section) => {
      const timeline = gsap.timeline({ scrollTrigger: once(section) });
      revealLabel(timeline, section.querySelector('[data-motion-label]'));
      revealText(timeline, section.querySelector('[data-motion-title]'), .1);
      revealDetails(timeline, select(section, '[data-contact-detail]'), .38);
    });
  });

  const cleanup = () => {
    context.revert();
    anchorController.abort();
    smoothScroll.lenis.off('scroll', smoothScroll.onScroll);
    gsap.ticker.remove(smoothScroll.ticker);
    smoothScroll.lenis.destroy();
  };
  window.__portfolioMotionCleanup = cleanup;
  document.fonts.ready.then(() => {
    if (window.__portfolioMotionCleanup === cleanup) ScrollTrigger.refresh();
  });
}
