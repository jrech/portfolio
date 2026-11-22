/* Světlý / tmavý režim.
   - výchozí motiv nastavuje inline skript v Base.astro (localStorage → jinak systém), tady jen přepínač
   - volba se ukládá do localStorage; dokud uživatel nevybral, web sleduje systém
   - přepnutí: nový motiv se rozroste jako bublina z přepínače (View Transitions); bez nich krátký přechod barev,
     s prefers-reduced-motion okamžitě */
type Theme = 'light' | 'dark';

const KEY = 'theme';
const THEME_COLOR: Record<Theme, string> = { light: '#fafafa', dark: '#0b0b0a' };

const stored = (): Theme | null => {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'dark' || v === 'light' ? v : null;
  } catch {
    return null;
  }
};

export function initTheme() {
  const root = document.documentElement;
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]'));
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  const current = (): Theme => (root.dataset.theme === 'dark' ? 'dark' : 'light');

  const sync = () => {
    const dark = current() === 'dark';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[current()]);
    buttons.forEach((b) => {
      const label = (dark ? b.dataset.labelLight : b.dataset.labelDark) ?? '';
      b.setAttribute('aria-pressed', String(dark));
      b.setAttribute('aria-label', label);
      b.title = label;
    });
  };

  const apply = (t: Theme) => {
    root.dataset.theme = t;
    sync();
  };

  let fadeTimer = 0;
  let busy = false; // během přechodu další kliky ignorovat (snímek stránky by se rozbil)

  // záložní přechod bez View Transitions: krátké prolnutí barev
  const fade = (t: Theme) => {
    busy = true;
    root.classList.add('theme-anim');
    apply(t);
    window.clearTimeout(fadeTimer);
    fadeTimer = window.setTimeout(() => {
      root.classList.remove('theme-anim');
      busy = false;
    }, 450);
  };

  const switchTo = (t: Theme, from?: HTMLElement) => {
    if (t === current() || busy) return;
    if (reduce.matches) return apply(t);

    const doc = document as Document & {
      startViewTransition?: (cb: () => void) => { ready: Promise<void>; finished: Promise<void>; skipTransition?: () => void };
    };
    if (!doc.startViewTransition) return fade(t);

    // nový motiv se rozroste jako bublina ze středu přepínače (bez něj zespodu uprostřed)
    const r = from?.getBoundingClientRect();
    const x = r && r.width ? r.left + r.width / 2 : window.innerWidth / 2;
    const y = r && r.height ? r.top + r.height / 2 : window.innerHeight;
    const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
    busy = true;
    root.classList.add('theme-vt');
    let applied = false;
    const vt = doc.startViewTransition(() => {
      applied = true;
      apply(t);
    });
    vt.ready
      .then(() => {
        root.animate(
          { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
          { duration: 800, easing: 'cubic-bezier(0.22, 1, 0.36, 1)', pseudoElement: '::view-transition-new(root)' },
        );
      })
      .catch(() => {});
    vt.finished
      .catch(() => {})
      .finally(() => {
        root.classList.remove('theme-vt');
        busy = false;
      });
    // pojistka: když prohlížeč snímek nevykreslí (skrytá karta), přepnout bez animace
    window.setTimeout(() => {
      if (applied) return;
      vt.skipTransition?.();
      apply(t);
    }, 400);
  };

  buttons.forEach((b) =>
    b.addEventListener('click', () => {
      const next: Theme = current() === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(KEY, next);
      } catch {
        /* bez úložiště platí volba jen do obnovení stránky */
      }
      switchTo(next, b);
    }),
  );

  system.addEventListener('change', (e) => {
    if (!stored()) switchTo(e.matches ? 'dark' : 'light');
  });

  sync();
}
