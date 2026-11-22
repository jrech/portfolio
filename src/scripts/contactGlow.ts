/* Oranžový WebGL glow v kontaktní sekci (stejné nastavení jako na původním jonasrech.com).
   Načte se líně, až se sekce blíží do zobrazení. Bez WebGL2 zůstane CSS přechod. */
export function initContactGlow() {
  const host = document.querySelector<HTMLElement>('[data-aurora]');
  if (!host) return;

  const io = new IntersectionObserver(
    async ([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();
      const { mountAurora } = await import('./aurora');
      const ok = mountAurora(host, {
        colorStops: ['#c93b00', '#5e0a00', '#ff6027'],
        amplitude: 1.5,
        blend: 0.53,
        height: 0.45, // nižší než na původním webu – sekce je kratší a glow by přebil text
        speed: 1,
        glow: 0.5,
        scale: 0.8,
        direction: 'bottom',
        opacity: 0.7,
      });
      if (ok) {
        host.classList.add('is-ready');
        host.closest('.contact')?.classList.add('has-aurora');
      }
    },
    { rootMargin: '400px 0px' },
  );
  io.observe(host);
}
