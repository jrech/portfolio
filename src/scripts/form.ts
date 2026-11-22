/* Kontaktní formulář: otevření z CTA, validace, odeslání.
   - POST JSON na /api/contact (Vercel funkce, krátký formulář: `form: 'short'`, viz src/data/inquiry.ts)
   - když odeslání selže: chybová hláška s odkazem na e-mail s předvyplněnou zprávou (mailto) */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { centeredScrollY, getLenis, headerSpace, lockNav, scrollToY } from './smooth';

const EMAIL = 'hello@jonasrech.com';

export function initForm() {
  const form = document.querySelector<HTMLFormElement>('[data-form]');
  const openWrap = document.querySelector<HTMLElement>('[data-form-open]');
  const success = document.querySelector<HTMLElement>('[data-form-success]');
  const errorBox = document.querySelector<HTMLElement>('[data-form-error]');
  if (!form || !openWrap || !success || !errorBox) return;

  const openBtn = openWrap.querySelector<HTMLAnchorElement>('a');
  openWrap.hidden = false;
  openBtn?.setAttribute('aria-controls', 'formular');
  openBtn?.setAttribute('aria-expanded', 'false');

  const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const firstInput = () => form.querySelector<HTMLInputElement>('input');
  const afterLayout = () => {
    getLenis()?.resize();
    ScrollTrigger.refresh();
  };
  let opened = false;

  // okamžité otevření (reduced-motion, #kontakt v adrese)
  const open = (focus = true) => {
    opened = true;
    form.classList.add('is-open');
    openWrap.hidden = true;
    openBtn?.setAttribute('aria-expanded', 'true');
    if (focus) firstInput()?.focus({ preventScroll: true });
    afterLayout();
  };

  /* Plynulé otevření: tlačítko zmizí, formulář se roztáhne a pole postupně vyjedou.
     Scroll jede současně s výškou (v každém snímku ze stejného průběhu), takže formulář
     doroste rovnou do středu obrazovky – žádné dorovnávání po skončení. Výška startuje
     z výšky tlačítka, aby karta neposkočila. */
  const openAnimated = (onDone?: () => void) => {
    if (opened) return onDone?.();
    if (reduceMotion()) {
      open(false);
      return onDone?.();
    }
    opened = true;
    openBtn?.setAttribute('aria-expanded', 'true');
    const startHeight = Math.max(0, openWrap.offsetHeight - 16); // 16 = margin-top formuláře
    gsap.to(openWrap, {
      opacity: 0,
      scale: 0.96,
      duration: 0.2,
      ease: 'power2.in',
      onComplete: () => {
        // vše v jednom synchronním bloku → mezi tím se nic nevykreslí
        openWrap.hidden = true;
        gsap.set(openWrap, { clearProps: 'opacity,transform' });
        form.classList.add('is-open');
        const items = Array.from(form.children).filter((el) => !el.matches('.hp, [hidden]'));
        const endHeight = form.offsetHeight;
        gsap.set(form, { height: startHeight, overflow: 'hidden' });
        gsap.set(items, { y: 16, opacity: 0 });

        const lenis = getLenis();
        const formDocTop = form.getBoundingClientRect().top + window.scrollY;
        const startScroll = window.scrollY;
        // stejný výpočet jako kotvy v navigaci; bez ořezu na výšku stránky – ta teprve naroste
        const targetScroll = centeredScrollY(formDocTop, endHeight, false);
        lockNav(true);
        const state = { p: 0 };
        gsap
          .timeline({
            onComplete: () => {
              gsap.set(form, { clearProps: 'height,overflow' });
              afterLayout();
              lockNav(false);
              onDone?.();
            },
          })
          .to(state, {
            p: 1,
            duration: 0.7,
            ease: 'power3.inOut',
            onUpdate: () => {
              form.style.height = `${startHeight + (endHeight - startHeight) * state.p}px`;
              const y = startScroll + (targetScroll - startScroll) * state.p;
              if (lenis) {
                lenis.resize(); // stránka roste, Lenis musí znát nový limit
                lenis.scrollTo(y, { immediate: true, force: true });
              } else window.scrollTo(0, y);
            },
          })
          .to(items, { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out', stagger: 0.06, clearProps: 'transform,opacity' }, 0.2);
      },
    });
  };

  // formulář doprostřed obrazovky (když už je otevřený)
  const centerForm = (onDone?: () => void) => {
    const top = form.getBoundingClientRect().top + window.scrollY;
    scrollToY(centeredScrollY(top, form.offsetHeight), { duration: 0.9, onComplete: onDone });
  };

  const inView = (el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    return r.top >= headerSpace() && r.bottom <= window.innerHeight;
  };

  // všechna CTA na stránce vedou sem a rovnou otevřou formulář:
  // když tlačítko v kartě není vidět, nejdřív k němu dojet; pak otevřít (scroll do středu jede současně)
  document.querySelectorAll<HTMLAnchorElement>('a[data-open-form]').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      const focusFirst = () => firstInput()?.focus({ preventScroll: true });
      if (reduceMotion()) {
        open(false);
        scrollToY(centeredScrollY(form.getBoundingClientRect().top + window.scrollY, form.offsetHeight), { immediate: true });
        return focusFirst();
      }
      if (opened) return centerForm(focusFirst);
      const lenis = getLenis();
      const run = () => openAnimated(focusFirst);
      if (lenis && !inView(openWrap)) {
        const top = openWrap.getBoundingClientRect().top + window.scrollY;
        scrollToY(centeredScrollY(top, openWrap.offsetHeight), { duration: 1, onComplete: run });
      } else run();
    });
  });

  if (location.hash === '#formular' || location.hash === '#kontakt') open(false);

  // „Zatím web nemám“ vypne pole s odkazem
  const noweb = form.querySelector<HTMLInputElement>('[data-noweb]');
  const url = form.querySelector<HTMLInputElement>('#f-url');
  noweb?.addEventListener('change', () => {
    if (!url) return;
    url.disabled = noweb.checked;
    if (noweb.checked) url.value = '';
  });

  const required = ['name', 'contact'] as const;
  // jedno ID na vyplnění: opakované odeslání po chybě nevytvoří v Notionu druhý lead
  const submissionId = crypto.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  // ochrana proti botům na serveru: odeslání dřív než 4 s po otevření stránky se odmítne
  const startedAt = performance.now();
  // telefon (aspoň 9 číslic) nebo e-mail – stejné pravidlo jako contactKind na serveru
  const contactOk = (v: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) || (/^\+?[\d\s()./-]+$/.test(v) && v.replace(/\D/g, '').length >= 9);

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorBox.hidden = true;

    let firstInvalid: HTMLInputElement | null = null;
    for (const key of required) {
      const field = form.querySelector<HTMLElement>(`[data-field="${key}"]`);
      const input = field?.querySelector<HTMLInputElement>('input');
      const value = input?.value.trim() ?? '';
      const bad = !value || (key === 'contact' && !contactOk(value));
      field?.classList.toggle('invalid', bad);
      input?.setAttribute('aria-invalid', String(bad));
      if (bad && !firstInvalid && input) firstInvalid = input;
    }
    if (firstInvalid) {
      firstInvalid.focus();
      return;
    }

    const data = Object.fromEntries(new FormData(form)) as Record<string, string>;
    const en = document.documentElement.lang === 'en';
    const endpoint = form.dataset.endpoint || '/api/contact';
    const submit = form.querySelector<HTMLButtonElement>('button[type="submit"]');

    // záloha při chybě: e-mail s předvyplněnou zprávou
    const mailto = errorBox.querySelector<HTMLAnchorElement>('[data-form-mailto]');
    if (mailto) {
      const body = [
        `${en ? 'Name' : 'Jméno'}: ${data.name}`,
        `${en ? 'Contact' : 'Kontakt'}: ${data.contact}`,
        `${en ? 'Website' : 'Web'}: ${data.noweb ? (en ? 'No website yet' : 'zatím nemám') : data.url || '–'}`,
        `${en ? 'What I do and where' : 'Co dělám a kde'}: ${data.what || '–'}`,
      ].join('\n');
      mailto.href = `mailto:${EMAIL}?subject=${encodeURIComponent(en ? 'Website enquiry' : 'Poptávka webu')}&body=${encodeURIComponent(body)}`;
    }

    // tvar, který čeká api/contact.ts (validateShortForm v src/data/inquiry.ts)
    const payload = {
      form: 'short',
      locale: en ? 'en' : 'cs',
      submissionId,
      elapsedMs: Math.round(performance.now() - startedAt),
      website: data.website ?? '', // honeypot
      name: data.name,
      contact: data.contact,
      currentUrl: data.noweb ? '' : data.url ?? '',
      ...(data.noweb ? { noWebsite: 'Ano' } : {}),
      note: data.what ?? '',
    };

    try {
      submit?.setAttribute('disabled', '');
      submit?.setAttribute('aria-busy', 'true');
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean };
      if (!res.ok || !json.ok) throw new Error(String(res.status));
      showSuccess();
    } catch {
      errorBox.hidden = false;
    } finally {
      submit?.removeAttribute('disabled');
      submit?.removeAttribute('aria-busy');
    }
  });

  function showSuccess(text?: string) {
    if (text) {
      const t = success!.querySelector('[data-success-text]');
      if (t) t.textContent = text;
    }
    form!.hidden = true;
    success!.hidden = false;
    success!.focus();
  }
}
