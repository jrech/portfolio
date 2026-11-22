/* Plynulý scroll (Lenis), napojený na GSAP ticker, aby ScrollTrigger běžel ve stejném snímku.
   - jen při prefers-reduced-motion: no-preference, jinak zůstává nativní scroll (kotvy ale mají stejný odsaz)
   - na dotyku Lenis nic nevyhlazuje (syncTouch je vypnutý), scroll zůstává nativní
   - kotvy (#prace, #o-mne…) jedou přes Lenis; CTA s data-open-form si scroll řeší samy (form.ts)
   - cíl kotvy: obsah sekce vycentrovaný do plochy pod navigací (centeredScrollY) */
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

let lenis: Lenis | null = null;
let navLocked = false;
let unlockTimer = 0;

export const getLenis = () => lenis;
export const isNavLocked = () => navLocked;

const GAP = 28; // mezera pod navigací, když se obsah do plochy nevejde

/* Výška místa, které zabírá sticky navigace (včetně jejího odsazení). offsetHeight nezávisí na schování přes transform. */
export function headerSpace() {
  return document.querySelector<HTMLElement>('.site-header')?.offsetHeight ?? 0;
}

/* Scroll, při kterém blok [top, top + height] (souřadnice dokumentu) stojí uprostřed plochy pod navigací.
   Když je vyšší než plocha, zarovná se horní hranou kousek pod navigaci. */
export function centeredScrollY(top: number, height: number, clampToPage = true) {
  const head = headerSpace();
  const avail = window.innerHeight - head;
  const y = height <= avail - GAP * 2 ? top - head - (avail - height) / 2 : top - head - GAP;
  const max = clampToPage ? document.documentElement.scrollHeight - window.innerHeight : Infinity;
  return Math.round(Math.max(0, Math.min(y, max)));
}

/* Pozice v dokumentu podle layoutu, bez transformací (prvky čekající na odhalení mají posun y). */
function layoutTop(el: HTMLElement) {
  let top = 0;
  for (let n: HTMLElement | null = el; n; n = n.offsetParent as HTMLElement | null) top += n.offsetTop;
  return top;
}

/* Skutečný obsah sekce bez jejího vnitřního odsazení (sekce mají nahoře a dole různě velký padding). */
function contentRect(el: HTMLElement) {
  const kids = Array.from(el.children).filter((c): c is HTMLElement => {
    const cs = getComputedStyle(c);
    return cs.display !== 'none' && cs.position !== 'absolute' && cs.position !== 'fixed';
  });
  const boxes = (kids.length ? kids : [el]).map((k) => ({ top: layoutTop(k), bottom: layoutTop(k) + k.offsetHeight }));
  const top = Math.min(...boxes.map((b) => b.top));
  const bottom = Math.max(...boxes.map((b) => b.bottom));
  return { top, height: bottom - top };
}

export function anchorScrollY(el: HTMLElement) {
  const r = contentRect(el);
  return centeredScrollY(r.top, r.height);
}

/* Při skoku na kotvu nechat navigaci viditelnou (jinak by se při scrollu dolů schovala a obsah by nebyl na středu). */
export function lockNav(on: boolean) {
  navLocked = on;
  window.clearTimeout(unlockTimer);
  if (on) {
    document.querySelector('.site-header')?.classList.remove('is-scrolled-away');
    unlockTimer = window.setTimeout(() => (navLocked = false), 2000); // pojistka, kdyby scroll přerušil uživatel
  }
}

/* Jeden scroll na pozici: přes Lenis (plynule nebo okamžitě), bez Lenisu nativně. */
export function scrollToY(y: number, opts: { immediate?: boolean; duration?: number; onComplete?: () => void } = {}) {
  lockNav(true);
  const done = () => {
    window.setTimeout(() => lockNav(false), 50);
    opts.onComplete?.();
  };
  if (lenis) {
    lenis.scrollTo(y, { immediate: opts.immediate, duration: opts.duration, force: true, onComplete: done });
    if (opts.immediate) done();
  } else {
    window.scrollTo({ top: y, behavior: 'auto' });
    done();
  }
}

export function initSmoothScroll() {
  if (window.matchMedia('(prefers-reduced-motion: no-preference)').matches) {
    lenis = new Lenis({ duration: 1.1, easing: (t) => 1 - Math.pow(1 - t, 4) });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis?.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
    // skip-link musí přesunout fokus nativně (klávesnice), CTA formuláře řeší form.ts
    if (!a || a.matches('.skip-link, [data-open-form]')) return;
    const id = a.getAttribute('href')!.slice(1);
    const target = id ? document.getElementById(id) : null;
    if (!target) return;
    e.preventDefault();
    scrollToY(id === 'obsah' ? 0 : anchorScrollY(target));
    history.pushState(null, '', `#${id}`);
  });

  // obrázky a fonty mění výšku stránky; přepočítat triggery i limit scrollu.
  // Příchod s kotvou z jiné stránky (/#prace): jedna korekce na střed, až je layout hotový.
  window.addEventListener('load', () => {
    lenis?.resize();
    ScrollTrigger.refresh();
    const id = decodeURIComponent(location.hash.slice(1));
    if (!id || id === 'obsah' || id === 'kontakt' || id === 'formular') return; // kontakt řeší form.ts
    const target = document.getElementById(id);
    if (target) requestAnimationFrame(() => scrollToY(anchorScrollY(target), { immediate: true }));
  });
}
