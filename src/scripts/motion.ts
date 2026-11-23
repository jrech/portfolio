/* Pohyb (GSAP + ScrollTrigger). Zásady:
   - jen transform / opacity / color, žádné layout vlastnosti
   - každá animace jednou (bez smyček), kromě „dopisování“ citátu, které jde se scrollem
   - prefers-reduced-motion: nic se neanimuje, obsah je rovnou ve finálním stavu
   - bez JS je vše vidět (výchozí stav je finální, GSAP animuje „from“) */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const EASE = 'power3.out';

export function initMotion() {
  (window as unknown as { __motionReady?: boolean }).__motionReady = true;
  const mm = gsap.matchMedia();

  mm.add('(prefers-reduced-motion: reduce)', () => {
    document.documentElement.classList.remove('anim');
  });

  mm.add('(prefers-reduced-motion: no-preference)', () => {
    // Pokud se už zobrazil obsah z pojistky v Base.astro, úvod znovu neschovávat.
    if (document.documentElement.classList.contains('anim')) {
      workIntro(hero());
      studyHero();
    }
    clipReveals();
    reveals();
    quote();
    const cleanUpProcess = process();
    deliverables();
    return cleanUpProcess;
  });
}

// Obsah, který už mohl být vidět při startu skriptu, nevracet do skrytého stavu.
function isBelowViewport(element: HTMLElement) {
  return element.getBoundingClientRect().top >= window.innerHeight;
}

/* Hero: slova vyjedou zpod masky, fotka se rozevře od středu a zvýrazněná slova se dobarví. */
function hero() {
  const words = gsap.utils.toArray<HTMLElement>('.hero-title .wi');
  const hl = gsap.utils.toArray<HTMLElement>('.hero-title .wi.hl');
  const pill = document.querySelector('[data-hero-pill]');
  const pillImg = pill?.querySelector('img');
  const sub = document.querySelector('[data-hero-sub]');
  if (!words.length) return null; // jiná stránka než úvod

  return gsap.timeline({ defaults: { ease: 'power4.out' }, delay: 0.15 }).fromTo(
    words,
    { y: 0, yPercent: 115, rotate: 4, transformOrigin: '0% 100%' },
    { yPercent: 0, rotate: 0, duration: 1.1, stagger: 0.065 },
    0,
  )
    .fromTo(
      pill,
      { clipPath: 'inset(0% 50% 0% 50% round 999px)' },
      { clipPath: 'inset(0% 0% 0% 0% round 999px)', duration: 1.0, ease: 'expo.out' },
      0.5,
    )
    .from(pillImg ?? [], { scale: 1.5, duration: 1.4, ease: 'expo.out' }, 0.5)
    .from(hl, { color: 'var(--text)', duration: 0.6, ease: 'power2.out', stagger: 0.08 }, 0.95)
    .fromTo(sub, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: EASE }, 0.85);
}

/* Vybrané práce hned pod hero: když jsou při načtení vidět, vyjedou v úvodní sekvenci
   (nadpis, pak karty po jedné) zhruba s podtitulkem hera. Co je pod okrajem obrazovky (mobil),
   nechá se běžnému odhalení při scrollu. Skrytý výchozí stav drží CSS (.anim [data-reveal-load]). */
function workIntro(tl: gsap.core.Timeline | null) {
  if (!tl) return;
  const els = gsap.utils.toArray<HTMLElement>('[data-reveal-load]').filter((el) => !isBelowViewport(el));
  if (!els.length) return;
  els.forEach((el) => (el.dataset.revealed = ''));
  const [heading, ...cards] = els[0].matches('h2, h3') ? els : [null, ...els];
  gsap.set(els, { y: 32, opacity: 0 });
  const to = { y: 0, opacity: 1, duration: 0.8, ease: EASE, clearProps: 'transform,opacity' };
  if (heading) tl.to(heading, to, 0.9);
  if (cards.length) tl.to(cards, { ...to, stagger: 0.12 }, 1.0);
}

/* Případová studie: stejné vyjetí slov jako hero na úvodu, pak text a fotka, která se rozevře zespodu. */
function studyHero() {
  const root = document.querySelector('[data-study-hero]');
  if (!root) return;
  const words = root.querySelectorAll('.wi');
  const hl = root.querySelectorAll('.wi.hl');
  const sub = root.querySelector('[data-study-sub]');
  const cover = root.querySelector('[data-study-cover]');

  const tl = gsap.timeline({ defaults: { ease: 'power4.out' }, delay: 0.15 })
    .fromTo(
      words,
      { y: 0, yPercent: 115, rotate: 4, transformOrigin: '0% 100%' },
      { yPercent: 0, rotate: 0, duration: 1.1, stagger: 0.08 },
      0,
    )
    .from(hl, { color: 'var(--text)', duration: 0.6, ease: 'power2.out' }, 0.7)
    .fromTo(sub, { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.8, ease: EASE }, 0.45);
  // 404 fotku nemá
  if (cover)
    tl.fromTo(
      cover,
      { clipPath: 'inset(18% 6% 0% 6% round 24px)' },
      { clipPath: 'inset(0% 0% 0% 0% round 24px)', duration: 1.3, ease: 'expo.out' },
      0.55,
    );
}

/* Velké obrázky (data-clip-reveal) se při scrollu rozevřou zespodu, fotka uvnitř se lehce zmenší. */
function clipReveals() {
  gsap.utils.toArray<HTMLElement>('[data-clip-reveal]').filter(isBelowViewport).forEach((el) => {
    const img = el.querySelector('img');
    gsap
      .timeline({ scrollTrigger: { trigger: el, start: 'top 85%', once: true } })
      .fromTo(
        el,
        { clipPath: 'inset(14% 4% 0% 4% round 24px)' },
        { clipPath: 'inset(0% 0% 0% 0% round 24px)', duration: 1.2, ease: 'expo.out', clearProps: 'clipPath' },
      )
      .from(img ?? [], { scale: 1.1, duration: 1.4, ease: 'expo.out' }, 0);
  });
}

function reveals() {
  const fresh = (el: HTMLElement) => !('revealed' in el.dataset) && isBelowViewport(el);
  // [data-reveal-load] drží CSS skryté, dokud nedostane data-revealed – odemknout ještě před animací
  const unlock = (el: HTMLElement) => (el.dataset.revealed = '');
  gsap.utils.toArray<HTMLElement>('[data-reveal]').filter(fresh).forEach((el) => {
    unlock(el);
    gsap.from(el, {
      y: 12,
      opacity: 0,
      duration: 0.3,
      ease: EASE,
      clearProps: 'transform,opacity',
      scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    });
  });
  // výchozí stav nastavit hned, jinak by položky před vstupem do viewportu probliknuly (viditelné → 0 → animace)
  const items = gsap.utils.toArray<HTMLElement>('[data-reveal-item]').filter(fresh);
  items.forEach(unlock);
  if (!items.length) return;
  gsap.set(items, { y: 12, opacity: 0 });
  ScrollTrigger.batch(items, {
    start: 'top 90%',
    once: true,
    onEnter: (batch) =>
      gsap.to(batch, { y: 0, opacity: 1, duration: 0.3, ease: EASE, stagger: 0.05, clearProps: 'transform,opacity' }),
  });
}

/* Citát: slova přechází z tlumené do plné bílé podle scrollu. */
function quote() {
  const q = document.querySelector<HTMLElement>('[data-quote]');
  if (!q || !isBelowViewport(q)) return;
  // barvy řeší CSS ([data-quote] .w v global.css) podle motivu, tady se posouvá jen --p (0 → 1)
  const words = gsap.utils.toArray<HTMLElement>('.w', q);
  const STEP = 0.1; // rozestup slov na časové ose (stejný jako dřív stagger)
  const tl = gsap.timeline({ scrollTrigger: { trigger: q, start: 'top 80%', end: 'bottom 45%', scrub: 0.6 } });
  words.forEach((w, i) => tl.fromTo(w, { '--p': 0 }, { '--p': 1, duration: 0.5, ease: 'none' }, i * STEP));

  // ručně kreslená zvýraznění (Quote.astro): nakreslí se, když se rozsvítí poslední slovo skupiny
  gsap.utils.toArray<HTMLElement>('[data-mark]', q).forEach((mark) => {
    const last = gsap.utils.toArray<HTMLElement>('.w', mark).at(-1);
    const at = (last ? words.indexOf(last) : 0) * STEP + 0.35;
    const swash = mark.querySelector('[data-swash]');
    const strokes = gsap.utils.toArray<SVGPathElement>('svg:not([data-doodle]) [data-draw]', mark);
    const doodles = gsap.utils.toArray<SVGSVGElement>('[data-doodle]', mark);
    if (swash) tl.fromTo(swash, { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: 0.35, ease: 'power2.out' }, at);
    // nenakreslené tahy skrýt úplně (kulaté konce čar by jinak byly vidět jako tečky)
    if (strokes.length) {
      tl.fromTo(strokes, { opacity: 0 }, { opacity: 1, duration: 0.01, stagger: 0.12 }, at + 0.1);
      tl.fromTo(strokes, { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.4, ease: 'power1.inOut', stagger: 0.12 }, at + 0.1);
    }
    doodles.forEach((d, i) => {
      tl.fromTo(d, { scale: 0, rotate: -30, transformOrigin: '50% 50%' }, { scale: 1, rotate: 0, duration: 0.25, ease: 'back.out(2.2)' }, at + 0.3 + i * 0.05);
      tl.fromTo(d.querySelectorAll('[data-draw]'), { strokeDasharray: 1, strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 0.3, ease: 'power1.out', stagger: 0.06 }, at + 0.3 + i * 0.05);
    });
  });
}

/* Proces: každá karta má malou scénu, která ukazuje, co se v kroku děje.
   Scéna se přehraje při vstupu karty do záběru a znovu při najetí myší. */
function process() {
  const steps = document.querySelector('[data-steps]');
  if (!steps) return;
  const cards = gsap.utils.toArray<HTMLElement>('.step', steps).filter(isBelowViewport);

  const scenes: Record<string, (c: HTMLElement) => gsap.core.Timeline> = {
    // 1 – hovor: rozvlnění zvuku
    call: (c) =>
      gsap
        .timeline({ paused: true, defaults: { ease: EASE } })
        .from(c.querySelector('.call-card'), { y: 12, opacity: 0, duration: 0.5 })
        .from(c.querySelectorAll('.wave i'), { scaleY: 0.15, duration: 0.5, stagger: 0.025, ease: 'back.out(2)' }, 0.2),

    // 2 – nabídka: položky se zaškrtnou, nabídka „odletí“
    offer: (c) =>
      gsap
        .timeline({ paused: true, defaults: { ease: EASE } })
        .from(c.querySelector('.doc'), { y: 12, opacity: 0, duration: 0.5 })
        .from(c.querySelectorAll('.doc-check'), { scale: 0, duration: 0.3, stagger: 0.15, ease: 'back.out(2.5)' }, 0.3)
        .from(c.querySelectorAll('.doc-item i'), { scaleX: 0, duration: 0.4, stagger: 0.15 }, 0.35)
        .from(c.querySelector('.b-send'), { scale: 0, duration: 0.35, ease: 'back.out(2)' }, 0.75)
        .to(c.querySelector('.b-send'), { x: 6, y: -6, duration: 0.18, yoyo: true, repeat: 1, ease: 'power1.inOut' }, 1.1),

    // 3 – návrh: fotka a šablona se naplní
    build: (c) =>
      gsap
        .timeline({ paused: true, defaults: { ease: EASE } })
        .from(c.querySelector('.photo'), { x: -16, opacity: 0, duration: 0.6 })
        .from(c.querySelector('.b-cam'), { scale: 0, duration: 0.35, ease: 'back.out(2)' }, 0.2)
        .from(c.querySelector('.wire'), { y: 16, opacity: 0, duration: 0.5 }, 0.25)
        .from(c.querySelector('.w-img'), { clipPath: 'inset(0 100% 0 0)', duration: 0.6, ease: 'power2.inOut' }, 0.45)
        .from(c.querySelectorAll('.wire > i'), { scaleX: 0, duration: 0.4, stagger: 0.08 }, 0.55),

    // 4 – spuštění: adresa se „napíše“, stránka se načte, ONLINE
    launch: (c) => {
      const tl = gsap.timeline({ paused: true, defaults: { ease: EASE } });
      tl.from(c.querySelector('.lb'), { y: 12, opacity: 0, duration: 0.5 });
      const typed = c.querySelector<HTMLElement>('[data-typed]');
      if (typed) {
        const full = typed.dataset.typed ?? '';
        const state = { n: 0 };
        tl.fromTo(
          state,
          { n: 0 },
          {
            n: full.length,
            duration: 0.6,
            ease: `steps(${full.length})`,
            onUpdate: () => (typed.textContent = full.slice(0, Math.round(state.n))),
          },
          0.25,
        );
      }
      tl.from(c.querySelectorAll('.lb-page > i, .lb-btns i'), { scaleX: 0, opacity: 0, duration: 0.35, stagger: 0.07 }, 0.8)
        .from(c.querySelector('.online'), { scale: 0.6, opacity: 0, duration: 0.4, ease: 'back.out(2)' }, 1.15)
        .fromTo(c.querySelector('.live'), { scale: 1 }, { scale: 1.8, duration: 0.25, yoyo: true, repeat: 1, ease: 'power1.inOut' }, 1.4);
      return tl;
    },
  };

  const listeners = new AbortController();
  const entrances = new Map<Element, gsap.core.Tween>();
  cards.forEach((card) => {
    const tl = scenes[card.dataset.step ?? '']?.(card);
    entrances.set(card, gsap.from(card, {
      paused: true,
      y: 12,
      opacity: 0,
      duration: 0.3,
      ease: EASE,
      clearProps: 'transform,opacity',
      onStart: () => { tl?.play(0); },
    }));

    card.addEventListener('pointerenter', (e) => {
      if (e.pointerType !== 'mouse' || !tl || tl.isActive() || tl.progress() === 0) return;
      tl.restart();
    }, { signal: listeners.signal });
  });
  ScrollTrigger.batch(cards, {
    start: 'top 85%',
    once: true,
    onEnter: (batch) => {
      const sequence = gsap.timeline();
      batch.forEach((card, index) => {
        const entrance = entrances.get(card);
        if (entrance) sequence.add(entrance.play(), index * 0.08);
      });
    },
  });
  return () => listeners.abort();
}

/* Nabídka: anotace v náhledu webu „naskočí“. */
function deliverables() {
  const annots = gsap.utils.toArray<HTMLElement>('[data-annot]').filter(isBelowViewport);
  if (!annots.length) return;
  gsap.from(annots, {
    scale: 0.8,
    opacity: 0,
    duration: 0.5,
    ease: 'back.out(2)',
    stagger: 0.2,
    clearProps: 'transform,opacity',
    scrollTrigger: { trigger: annots[0], start: 'top 80%', once: true },
  });
}
