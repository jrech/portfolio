export function initCursorDot() {
  const el = document.querySelector<HTMLElement>('[data-cursor-dot]');
  if (!el || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const target = { x: -999, y: -999 };
  const pos = { x: -999, y: -999 };
  let raf = 0;
  const start = el.dataset.startAt ? document.querySelector(el.dataset.startAt) : null;
  let boundary = 0;
  let hasPointer = false;
  const updateVisibility = () => el.classList.toggle('is-on', hasPointer && (!start || target.y >= boundary));
  if (start) {
    const updateBoundary = () => {
      boundary = start.getBoundingClientRect().top;
      updateVisibility();
    };
    updateBoundary();
    window.addEventListener('scroll', updateBoundary, { passive: true });
    window.addEventListener('resize', updateBoundary);
    new ResizeObserver(updateBoundary).observe(document.body);
  }

  let previous = 0;
  const render = (now: number) => {
    const dt = previous ? now - previous : 16;
    const k = reduce.matches ? 1 : 1 - Math.exp(-dt / 70);
    previous = now;
    pos.x += (target.x - pos.x) * k;
    pos.y += (target.y - pos.y) * k;
    // Keep the dot just beyond the tip of the native pointer.
    el.style.transform = `translate3d(${(pos.x + 9).toFixed(2)}px, ${(pos.y + 13).toFixed(2)}px, 0)`;
    raf = Math.abs(target.x - pos.x) + Math.abs(target.y - pos.y) > 0.3 ? requestAnimationFrame(render) : 0;
  };

  window.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'mouse') return;
      if (!hasPointer) {
        pos.x = e.clientX;
        pos.y = e.clientY;
      }
      target.x = e.clientX;
      target.y = e.clientY;
      hasPointer = true;
      updateVisibility();
      if (!raf) {
        previous = 0;
        raf = requestAnimationFrame(render);
      }
    },
    { passive: true },
  );
  const hide = () => {
    hasPointer = false;
    updateVisibility();
  };
  document.documentElement.addEventListener('pointerleave', hide);
  window.addEventListener('blur', hide);
}
