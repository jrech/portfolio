import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function initProjectMotion(reduced: boolean) {
  if (reduced) return;
  const context = gsap.context(() => {
    const hero = document.querySelector<HTMLElement>('[data-case-hero]');
    if (hero) {
      gsap.timeline({ defaults: { ease: 'power4.out' } })
        .fromTo(hero.querySelector('[data-case-label]'), { autoAlpha: 0, x: -18 }, { autoAlpha: 1, x: 0, duration: .7 })
        .fromTo(hero.querySelector('[data-case-title]'), { autoAlpha: 0, yPercent: 12 }, { autoAlpha: 1, yPercent: 0, duration: 1.15 }, .08)
        .fromTo(hero.querySelectorAll('[data-case-detail]'), { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: .7, stagger: .08 }, .42);
    }

    document.querySelectorAll<HTMLElement>('[data-case-visual]').forEach((visual) => {
      gsap.fromTo(visual, { autoAlpha: 0, clipPath: 'inset(8% 0 8% 0)' }, {
        autoAlpha: 1,
        clipPath: 'inset(0% 0 0% 0)',
        duration: 1.05,
        ease: 'power4.out',
        scrollTrigger: { trigger: visual, start: 'top 82%', toggleActions: 'play none none none' },
      });
    });

    document.querySelectorAll<HTMLElement>('[data-case-copy]').forEach((copy) => {
      gsap.fromTo(copy, { autoAlpha: 0, y: 28 }, {
        autoAlpha: 1,
        y: 0,
        duration: .9,
        ease: 'power4.out',
        scrollTrigger: { trigger: copy, start: 'top 80%', toggleActions: 'play none none none' },
      });
    });
  });

  document.fonts.ready.then(() => ScrollTrigger.refresh());
  return () => context.revert();
}
