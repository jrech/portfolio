/* Plynulé rozbalování <details> (služby, FAQ) s ease-out.
   Bez JS nebo s reduced-motion fungují <details> nativně (name = jen jedna otevřená položka). */
import { gsap } from 'gsap';

const EASE = 'power3.out';

export function initAccordions() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const all = Array.from(document.querySelectorAll<HTMLDetailsElement>('details[name]'));
  // skupinu řídí JS – nativní `name` by zavíral ostatní okamžitě, bez animace
  all.forEach((d) => {
    d.dataset.group = d.getAttribute('name') ?? '';
    d.removeAttribute('name');
  });

  const isExpanded = (d: HTMLDetailsElement) => d.open && !d.classList.contains('is-closing');

  const animate = (d: HTMLDetailsElement, expand: boolean) => {
    const summary = d.querySelector('summary')!;
    const content = Array.from(d.children).filter((child) => child !== summary);
    const startHeight = d.offsetHeight;
    const wasOpen = d.open;
    gsap.killTweensOf([d, ...content]);

    d.open = true;
    d.classList.toggle('is-closing', !expand);
    d.style.removeProperty('height');
    const borderBottom = parseFloat(getComputedStyle(d).borderBottomWidth) || 0;
    const endHeight = expand ? d.offsetHeight : summary.offsetHeight + borderBottom;
    const duration = expand ? 0.24 : 0.18;

    if (!wasOpen) gsap.set(content, { opacity: 0 });
    gsap.to(content, { opacity: expand ? 1 : 0, duration: duration * 0.75, ease: EASE });
    gsap.fromTo(d, { height: startHeight, overflow: 'hidden' }, {
      height: endHeight,
      duration,
      ease: EASE,
      onComplete: () => {
        d.open = expand;
        d.classList.remove('is-closing');
        gsap.set(d, { clearProps: 'height,overflow' });
        gsap.set(content, { clearProps: 'opacity' });
      },
    });
  };

  all.forEach((d) => {
    const summary = d.querySelector('summary');
    summary?.addEventListener('click', (e) => {
      e.preventDefault();
      const expand = !isExpanded(d);
      if (expand) {
        all.filter((other) => other !== d && other.dataset.group === d.dataset.group && isExpanded(other))
          .forEach((other) => animate(other, false));
      }
      animate(d, expand);
    });
  });
}
