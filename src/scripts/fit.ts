/* Zmenší pevně navrženou ilustraci (.fit > .fit-inner) podle šířky rodiče.
   data-fit = šířka návrhu v px. */
export function initFit() {
  const els = document.querySelectorAll<HTMLElement>('[data-fit]');
  if (!els.length) return;
  const ro = new ResizeObserver((entries) => {
    for (const e of entries) {
      const el = e.target as HTMLElement;
      const designW = Number(el.dataset.fit) || 1;
      el.style.setProperty('--fit', String(e.contentRect.width / designW));
    }
  });
  els.forEach((el) => ro.observe(el));
}
