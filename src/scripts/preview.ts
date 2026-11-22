/* Náhled webu v sekci „Co dostanete s webem“ se mění podle otevřené služby (01–03).
   Stav drží atributy na .panel (data-pv-state, data-copy), samotné přechody řeší CSS v Deliverables.astro.
   Náhled je aria-hidden, takže jde čistě o vizuál; bez JS zůstává stav 1. */
export function initDelivPreview() {
  const panel = document.querySelector<HTMLElement>('[data-pv]');
  const items = Array.from(document.querySelectorAll<HTMLDetailsElement>('details[data-pv-item]'));
  if (!panel || !items.length) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  let timer = 0;

  const show = (state: number) => {
    if (panel.dataset.pvState === String(state)) return;
    window.clearTimeout(timer);
    if (state === 2 && !reduce.matches) {
      // nejdřív bez přechodu obecný text, pak se „přepíše“ na konkrétní
      panel.classList.add('pv-snap');
      panel.dataset.copy = 'generic';
      void panel.offsetWidth;
      panel.classList.remove('pv-snap');
      timer = window.setTimeout(() => (panel.dataset.copy = 'real'), 700);
    } else {
      panel.dataset.copy = 'real';
    }
    panel.dataset.pvState = String(state);
  };

  items.forEach((d, i) =>
    d.addEventListener('toggle', () => {
      if (d.open && !d.classList.contains('is-closing')) show(i + 1);
    }),
  );
  const open = items.findIndex((d) => d.open);
  if (open >= 0) show(open + 1);
}
