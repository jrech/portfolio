/* Mobilní menu v navigační „pilulce“. */
import { isNavLocked } from './smooth';
export function initMenu() {
  const btn = document.querySelector<HTMLButtonElement>('[data-menu-toggle]');
  const list = document.getElementById('nav-links');
  const header = btn?.closest<HTMLElement>('.site-header');
  if (!btn || !list || !header) return;

  let hidden = false;
  let turningPoint = window.scrollY;
  window.addEventListener('scroll', () => {
    const bottom = document.documentElement.scrollHeight - window.innerHeight;
    const y = Math.max(0, Math.min(window.scrollY, bottom));
    // skok na kotvu / formulář: navigace zůstává vidět (cíl je spočítaný s ní)
    if (isNavLocked()) {
      hidden = false;
      turningPoint = y;
      header.classList.remove('is-scrolled-away');
      return;
    }
    turningPoint = hidden ? Math.max(turningPoint, y) : Math.min(turningPoint, y);
    const nextHidden = y > header.offsetHeight && (hidden ? turningPoint - y < 10 : y - turningPoint >= 16);
    if (nextHidden === hidden) return;
    hidden = nextHidden;
    turningPoint = y;
    header.classList.toggle('is-scrolled-away', hidden);
  }, { passive: true });

  const mobile = window.matchMedia('(max-width: 960px)');
  const setOpen = (open: boolean) => {
    btn.setAttribute('aria-expanded', String(open));
    list.classList.toggle('is-open', open);
    list.inert = mobile.matches && !open;
  };
  const close = () => setOpen(false);
  close();
  mobile.addEventListener('change', close);

  btn.addEventListener('click', () => {
    const open = btn.getAttribute('aria-expanded') !== 'true';
    setOpen(open);
    if (open) list.querySelector('a')?.focus();
  });
  list.addEventListener('click', (e) => {
    if ((e.target as HTMLElement).closest('a')) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') {
      close();
      btn.focus();
    }
  });
  document.addEventListener('click', (e) => {
    if (!(e.target as HTMLElement).closest('.nav-pill')) close();
  });
}
