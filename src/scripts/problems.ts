/* Sekce „Proč se lidi z webu neozvou“: výběr problému zvýrazní místo na maketě starého webu. */
export function initProblems() {
  const root = document.querySelector<HTMLElement>('[data-problems]');
  if (!root) return;
  const items = Array.from(root.querySelectorAll<HTMLElement>('[data-problem]'));

  const activate = (idx: number) => {
    items.forEach((item, i) => {
      const on = i === idx;
      item.toggleAttribute('data-active', on);
      item.querySelector('button')?.setAttribute('aria-expanded', String(on));
    });
    root.querySelectorAll<HTMLElement>('[data-marker],[data-badge],[data-tip]').forEach((el) => {
      const i = Number(el.dataset.marker ?? el.dataset.badge ?? el.dataset.tip);
      el.classList.toggle('is-active', i === idx);
    });
  };

  items.forEach((item, i) => {
    const btn = item.querySelector('button');
    btn?.addEventListener('click', () => activate(i));
    // na zařízeních s myší stačí najet
    item.addEventListener('pointerenter', (e) => {
      if ((e as PointerEvent).pointerType === 'mouse') activate(i);
    });
  });
}
