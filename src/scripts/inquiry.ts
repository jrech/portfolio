/**
 * Project inquiry dialog (markup: components/site/InquiryDialog.astro).
 * Opens from every `a.cta[href="#contact"]`; keeps a draft in localStorage so an
 * unfinished questionnaire can be resumed; validates each step; sends the answers
 * to Formspree as labelled fields (straight from the browser, Formspree's AJAX mode).
 * Step transitions use GSAP (loaded on first open), skipped for reduced motion.
 */
import { EMAIL_PATTERN, FORMSPREE_ENDPOINT, inquiryRows, inquirySteps, validateInquiry } from '@/data/inquiry';

type Answers = Record<string, string | string[]>;
interface Draft {
  step: number;
  answers: Answers;
  startedAt: number;
}

// v3: seven single-choice steps (2026-10-29). Older drafts are discarded, not migrated.
const STORAGE_KEY = 'jr-inquiry-draft-v3';
const OLD_KEYS = ['jr-inquiry-draft-v1', 'jr-inquiry-draft-v2'];
const dialog = document.getElementById('inquiry') as HTMLDialogElement | null;

if (dialog) {
  const form = dialog.querySelector<HTMLFormElement>('[data-inq-form]')!;
  const steps = [...dialog.querySelectorAll<HTMLElement>('[data-inq-step]')];
  const resume = dialog.querySelector<HTMLElement>('[data-inq-resume]')!;
  const done = dialog.querySelector<HTMLElement>('[data-inq-done]')!;
  const failed = dialog.querySelector<HTMLElement>('[data-inq-failed]')!;
  const nav = dialog.querySelector<HTMLElement>('[data-inq-nav]')!;
  const prev = dialog.querySelector<HTMLButtonElement>('[data-inq-prev]')!;
  const next = dialog.querySelector<HTMLButtonElement>('[data-inq-next]')!;
  const nextLabel = dialog.querySelector<HTMLElement>('[data-inq-next-label]')!;
  const count = dialog.querySelector<HTMLElement>('[data-inq-count]')!;
  const countNav = dialog.querySelector<HTMLElement>('[data-inq-count-nav]');
  const progress = dialog.querySelector<HTMLElement>('.inq__progress')!;
  const body = dialog.querySelector<HTMLElement>('.inq__body')!;
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

  let current = 0;
  let startedAt = Date.now();
  let opener: HTMLElement | null = null;
  let sending = false;
  let gsapModule: typeof import('gsap') | null = null;

  /* ---------- Draft storage (best effort; private mode may throw) ---------- */
  const readDraft = (): Draft | null => {
    try {
      OLD_KEYS.forEach((key) => localStorage.removeItem(key));
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as Draft) : null;
    } catch {
      return null;
    }
  };
  const writeDraft = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ step: current, answers: collect(), startedAt }));
    } catch {
      /* storage unavailable: the questionnaire still works, it just won't resume */
    }
  };
  const clearDraft = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  };
  const hasContent = (draft: Draft | null) =>
    !!draft && Object.values(draft.answers).some((v) => (Array.isArray(v) ? v.length : String(v).trim()));

  /* ---------- Form state ---------- */
  function collect(): Answers {
    const answers: Answers = {};
    for (const el of form.elements) {
      const input = el as HTMLInputElement;
      if (!input.name || input.name === 'website') continue;
      if (input.type === 'radio') {
        if (input.checked) answers[input.name] = input.value;
      } else if (input.type === 'checkbox') {
        const list = (answers[input.name] as string[] | undefined) ?? [];
        if (input.checked) list.push(input.value);
        answers[input.name] = list;
      } else {
        answers[input.name] = input.value;
      }
    }
    return answers;
  }

  function restore(answers: Answers) {
    for (const el of form.elements) {
      const input = el as HTMLInputElement;
      if (!input.name || !(input.name in answers)) continue;
      const value = answers[input.name];
      if (input.type === 'radio' || input.type === 'checkbox') {
        input.checked = Array.isArray(value) ? value.includes(input.value) : value === input.value;
      } else {
        input.value = Array.isArray(value) ? value.join(', ') : value;
      }
    }
    steps.forEach(syncStepUi);
  }

  /** Max-choice limits, "Něco jiného" fields and conditional fields follow the selection. */
  function syncStepUi(step: HTMLElement) {
    step.querySelectorAll<HTMLElement>('[data-inq-group]').forEach((group) => {
      const boxes = [...group.querySelectorAll<HTMLInputElement>('.inq__options input')];
      const picked = boxes.filter((b) => b.checked);
      const max = Number(group.dataset.max) || 0;
      if (max) {
        boxes.forEach((b) => (b.disabled = !b.checked && picked.length >= max));
        const counter = group.querySelector('[data-inq-picked]');
        if (counter) counter.textContent = String(picked.length);
      }
      const other = group.querySelector<HTMLElement>('[data-inq-other]');
      if (other) other.hidden = !picked.some((b) => b.value === other.dataset.inqOther);
    });
    step.querySelectorAll<HTMLElement>('[data-show-name]').forEach((field) => {
      const values = (field.dataset.showValues ?? '').split('|');
      const checked = form.querySelector<HTMLInputElement>(`[name="${field.dataset.showName}"]:checked`);
      field.hidden = !checked || !values.includes(checked.value);
    });
  }

  /* ---------- Validation ---------- */
  function validate(index: number): boolean {
    const step = steps[index];
    let firstInvalid: HTMLElement | null = null;
    for (const block of inquirySteps[index].blocks) {
      if (block.kind === 'field') {
        const f = block.field;
        const input = step.querySelector<HTMLInputElement>(`[name="${f.name}"]`)!;
        const value = input.value.trim();
        const bad = (!!f.required && !value) || (f.type === 'email' && value !== '' && !EMAIL_PATTERN.test(value));
        const fieldError = step.querySelector<HTMLElement>(`#inq-${f.name}-error`);
        input.setAttribute('aria-invalid', String(bad));
        if (fieldError) fieldError.textContent = bad ? (f.error ?? '') : '';
        if (bad && !firstInvalid) firstInvalid = input;
        continue;
      }
      const group = step.querySelector<HTMLElement>(`[data-inq-group="${block.name}"]`)!;
      const bad = block.required && !group.querySelector('.inq__options input:checked');
      group.querySelector<HTMLElement>('.inq__error')!.textContent = bad ? block.error : '';
      group.setAttribute('aria-invalid', String(bad));
      if (bad && !firstInvalid) firstInvalid = group.querySelector<HTMLInputElement>('.inq__options input');
    }
    if (firstInvalid) {
      firstInvalid.focus();
      return false;
    }
    return true;
  }

  /* ---------- Views ---------- */
  const panels = [resume, done, failed];

  async function swap(show: HTMLElement, focusTarget: HTMLElement | null) {
    const visible = [...steps, ...panels].find((el) => !el.hidden);
    const g = !reduced() ? (gsapModule ??= await import('gsap')).gsap : null;
    if (g && visible && visible !== show) {
      await g.to(visible, { opacity: 0, y: -12, duration: 0.22, ease: 'power2.in' });
      g.set(visible, { clearProps: 'opacity,transform' });
    }
    [...steps, ...panels].forEach((el) => (el.hidden = el !== show));
    body.scrollTop = 0;
    if (g) g.fromTo(show, { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out', clearProps: 'opacity,transform' });
    focusTarget?.focus({ preventScroll: true });
  }

  function updateChrome() {
    const total = steps.length;
    count.textContent = String(current + 1);
    if (countNav) countNav.textContent = String(current + 1);
    progress.style.setProperty('--inq-progress', String((current + 1) / total));
    prev.hidden = current === 0;
    nextLabel.textContent = current === total - 1 ? 'Odeslat poptávku' : 'Další';
    dialog!.setAttribute('aria-labelledby', `inq-title-${current + 1}`);
  }

  async function goTo(index: number) {
    current = Math.max(0, Math.min(steps.length - 1, index));
    nav.hidden = false;
    updateChrome();
    await swap(steps[current], steps[current].querySelector<HTMLElement>('.inq__title'));
    writeDraft();
  }

  async function showPanel(panel: HTMLElement, withNav = false) {
    nav.hidden = !withNav;
    dialog!.setAttribute('aria-labelledby', panel.querySelector('.inq__title')!.id);
    await swap(panel, panel.querySelector<HTMLElement>('.inq__title'));
  }

  /* ---------- Submit ---------- */
  async function submit() {
    if (sending) return;
    sending = true;
    next.disabled = true;
    nextLabel.textContent = 'Odesílám…';
    try {
      // Same check the form already enforced; it also drops fields that were hidden.
      const checked = validateInquiry(collect());
      if (!checked.ok) throw new Error('invalid');
      const { answers } = checked;
      const payload: Record<string, string> = {
        _subject: `Nová poptávka: ${answers.name}`,
        _replyto: String(answers.email),
        // Formspree's honeypot: filled only by bots, then silently dropped.
        _gotcha: (form.elements.namedItem('website') as HTMLInputElement).value,
        email: String(answers.email),
        ...Object.fromEntries(inquiryRows(answers)),
      };
      const response = await fetch(FORMSPREE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(String(response.status));
      clearDraft();
      form.reset();
      steps.forEach(syncStepUi);
      current = 0;
      count.textContent = String(steps.length);
      progress.style.setProperty('--inq-progress', '1');
      await showPanel(done);
    } catch {
      writeDraft();
      await showPanel(failed);
    } finally {
      sending = false;
      next.disabled = false;
      // Not updateChrome(): it would relabel the dialog with a hidden step title.
      nextLabel.textContent = current === steps.length - 1 ? 'Odeslat poptávku' : 'Další';
    }
  }

  /* ---------- Open / close ---------- */
  async function open(from: HTMLElement | null) {
    opener = from;
    dialog!.showModal();
    const g = !reduced() ? (gsapModule ??= await import('gsap')).gsap : null;
    if (g) {
      g.fromTo(
        dialog,
        { clipPath: 'inset(0% 0% 100% 0%)' },
        { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.8, ease: 'expo.inOut', clearProps: 'clipPath' },
      );
    }
    const draft = readDraft();
    if (done.hidden === false) return showPanel(done);
    if (hasContent(draft)) {
      startedAt = draft!.startedAt || Date.now();
      return showPanel(resume);
    }
    startedAt = Date.now();
    return goTo(0);
  }

  async function close() {
    if (!dialog!.open) return;
    if (done.hidden) writeDraft();
    const g = !reduced() ? gsapModule?.gsap : null;
    if (g) {
      await g.fromTo(
        dialog,
        { clipPath: 'inset(0% 0% 0% 0%)' },
        { clipPath: 'inset(0% 0% 100% 0%)', duration: 0.6, ease: 'expo.inOut' },
      );
      g.set(dialog, { clearProps: 'clipPath' });
    }
    dialog!.close();
    if (!done.hidden) done.hidden = true; // next open starts fresh
    opener?.focus({ preventScroll: true });
  }

  /* ---------- Events ---------- */
  document.querySelectorAll<HTMLAnchorElement>('a.cta[href="#contact"], [data-inquiry-open]').forEach((link) =>
    link.addEventListener('click', (e) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      open(link);
    }),
  );

  dialog.querySelectorAll('[data-inq-close]').forEach((b) => b.addEventListener('click', () => close()));
  dialog.addEventListener('cancel', (e) => {
    e.preventDefault();
    close();
  });

  form.addEventListener('change', (e) => {
    const step = (e.target as HTMLElement).closest<HTMLElement>('[data-inq-step]');
    if (step) {
      syncStepUi(step);
      // Clear a group's error as soon as a choice is made in it.
      const group = (e.target as HTMLElement).closest<HTMLElement>('[data-inq-group]');
      if (group?.querySelector('.inq__options input:checked')) {
        group.querySelector<HTMLElement>('.inq__error')!.textContent = '';
        group.setAttribute('aria-invalid', 'false');
      }
    }
    writeDraft();
  });
  form.addEventListener('input', (e) => {
    // A text field's error goes away once the visitor starts fixing it.
    const input = e.target as HTMLInputElement;
    if (input.getAttribute('aria-invalid') === 'true' && input.value.trim()) {
      input.setAttribute('aria-invalid', 'false');
      const error = form.querySelector<HTMLElement>(`#inq-${input.name}-error`);
      if (error) error.textContent = '';
    }
    writeDraft();
  });

  // Enter = next (submit event); Shift+Enter keeps working inside the textarea.
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validate(current)) return;
    if (current === steps.length - 1) submit();
    else goTo(current + 1);
  });
  form.addEventListener('keydown', (e) => {
    const target = e.target as HTMLElement;
    if (e.key !== 'Enter' || target.tagName === 'TEXTAREA' || target.tagName === 'BUTTON') return;
    if (target instanceof HTMLInputElement && (target.type === 'radio' || target.type === 'checkbox')) {
      e.preventDefault();
      form.requestSubmit();
    }
  });

  prev.addEventListener('click', () => goTo(current - 1));

  resume.querySelector('[data-inq-resume-continue]')!.addEventListener('click', () => {
    const draft = readDraft();
    if (draft) restore(draft.answers);
    goTo(draft?.step ?? 0);
  });
  resume.querySelector('[data-inq-resume-restart]')!.addEventListener('click', () => {
    clearDraft();
    form.reset();
    steps.forEach(syncStepUi);
    startedAt = Date.now();
    goTo(0);
  });
  failed.querySelector('[data-inq-retry]')!.addEventListener('click', () => submit());
  failed.querySelector('[data-inq-back-to-form]')!.addEventListener('click', () => goTo(steps.length - 1));
}
