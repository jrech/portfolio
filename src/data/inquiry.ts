/**
 * Project inquiry questionnaire (Czech). Single source for the fullscreen form
 * (InquiryDialog.astro + scripts/inquiry.ts) and the server check (api/inquiry.ts):
 * the endpoint only accepts option values listed here.
 */

interface StepBase {
  id: string;
  title: string;
  lead?: string;
}

export interface ChoiceStep extends StepBase {
  kind: 'single' | 'multi';
  name: string;
  options: string[];
  /** Multi choice: maximum number of selections. */
  max?: number;
  /** Option that reveals `other` when selected. */
  otherOption?: string;
  other?: TextField;
  /** Optional field shown under the choices. */
  field?: TextField;
  note?: string;
  required: true;
  error: string;
}

export interface ContactStep extends StepBase {
  kind: 'contact';
  fields: TextField[];
}

export interface TextField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'tel' | 'url' | 'textarea';
  required?: boolean;
  autocomplete?: string;
  placeholder?: string;
  help?: string;
  maxLength: number;
  error?: string;
}

export type InquiryStep = ChoiceStep | ContactStep;

export const inquirySteps: InquiryStep[] = [
  {
    id: 'project',
    kind: 'single',
    name: 'project',
    title: 'Co spolu budeme tvořit?',
    lead: 'Vyberte, co je nejblíž. Doladíme to spolu.',
    options: [
      'Nový web',
      'Úprava nebo redesign stávajícího webu',
      'Vizuální identita značky',
      'Web i vizuální identita',
      'Ještě si nejsem jistý/á',
    ],
    required: true,
    error: 'Vyberte prosím jednu možnost.',
  },
  {
    id: 'stage',
    kind: 'single',
    name: 'stage',
    title: 'Kde jste teď?',
    options: ['Web zatím nemáme', 'Web máme, ale potřebuje změnu', 'Web máme a chceme ho rozšířit'],
    field: {
      name: 'currentUrl',
      label: 'Adresa současného webu',
      type: 'url',
      placeholder: 'www.vasefirma.cz',
      autocomplete: 'url',
      maxLength: 200,
    },
    required: true,
    error: 'Vyberte prosím jednu možnost.',
  },
  {
    id: 'goals',
    kind: 'multi',
    name: 'goals',
    title: 'Co má projekt především změnit?',
    lead: 'Vyberte nejvýš dvě věci, na kterých záleží nejvíc.',
    max: 2,
    options: [
      'Přivádět více relevantních poptávek',
      'Lépe představit firmu a její služby',
      'Působit důvěryhodněji',
      'Zjednodušit orientaci a kontakt',
      'Sjednotit vzhled značky',
      'Něco jiného',
    ],
    otherOption: 'Něco jiného',
    other: { name: 'goalsOther', label: 'Co konkrétně?', type: 'text', maxLength: 200 },
    required: true,
    error: 'Vyberte prosím aspoň jednu možnost.',
  },
  {
    id: 'help',
    kind: 'multi',
    name: 'help',
    title: 'S čím budete potřebovat pomoct?',
    lead: 'Klidně vyberte víc možností.',
    options: [
      'Strategie a struktura webu',
      'Design webu',
      'Vývoj webu',
      'Texty a obsah',
      'Vizuální identita',
      'Nejsem si jistý/á, rád/a si nechám poradit',
    ],
    required: true,
    error: 'Vyberte prosím aspoň jednu možnost.',
  },
  {
    id: 'budget',
    kind: 'single',
    name: 'budget',
    title: 'Jaký máte pro projekt rámec?',
    options: ['Do 50 000 Kč', '50–100 000 Kč', '100–200 000 Kč', 'Nad 200 000 Kč', 'Zatím nevím'],
    note: 'Je to jen orientační odhad. Pomůže mi navrhnout rozsah, který dává smysl, nic vás nezavazuje.',
    required: true,
    error: 'Vyberte prosím jednu možnost.',
  },
  {
    id: 'timing',
    kind: 'single',
    name: 'timing',
    title: 'Kdy byste chtěli začít?',
    options: ['Co nejdříve', 'Během 1–3 měsíců', 'Později', 'Termín zatím neřešíme'],
    field: {
      name: 'note',
      label: 'Je něco, co bych měl o projektu vědět?',
      type: 'textarea',
      help: 'Například komu web slouží, co vás teď brzdí nebo co už máte připravené.',
      maxLength: 2000,
    },
    required: true,
    error: 'Vyberte prosím jednu možnost.',
  },
  {
    id: 'contact',
    kind: 'contact',
    title: 'Kam se vám mám ozvat?',
    lead: 'Poslední krok. Stačí jméno a e-mail.',
    fields: [
      { name: 'name', label: 'Jméno', type: 'text', required: true, autocomplete: 'name', maxLength: 120, error: 'Napište prosím své jméno.' },
      { name: 'email', label: 'E-mail', type: 'email', required: true, autocomplete: 'email', maxLength: 200, error: 'Zkontrolujte prosím e-mail, takhle mi nedojde.' },
      { name: 'company', label: 'Firma', type: 'text', autocomplete: 'organization', maxLength: 160 },
      { name: 'phone', label: 'Telefon', type: 'tel', autocomplete: 'tel', maxLength: 40 },
    ],
  },
];

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type InquiryAnswers = Record<string, string | string[]>;

/** Server-side check: known option values only, required answers present, sane lengths. */
export function validateInquiry(input: unknown): { ok: true; answers: InquiryAnswers } | { ok: false } {
  if (!input || typeof input !== 'object') return { ok: false };
  const data = input as Record<string, unknown>;
  const answers: InquiryAnswers = {};
  const text = (value: unknown, max: number) =>
    typeof value === 'string' ? value.trim().slice(0, max) : '';

  for (const step of inquirySteps) {
    if (step.kind === 'contact') {
      for (const field of step.fields) {
        const value = text(data[field.name], field.maxLength);
        if (field.required && !value) return { ok: false };
        if (field.type === 'email' && !EMAIL_PATTERN.test(value)) return { ok: false };
        answers[field.name] = value;
      }
      continue;
    }
    const raw = data[step.name];
    const picked = (Array.isArray(raw) ? raw : [raw]).filter(
      (v): v is string => typeof v === 'string' && step.options.includes(v),
    );
    const unique = [...new Set(picked)];
    if (!unique.length || (step.kind === 'single' && unique.length !== 1)) return { ok: false };
    if (step.max && unique.length > step.max) return { ok: false };
    answers[step.name] = step.kind === 'single' ? unique[0] : unique;
    if (step.other) answers[step.other.name] = text(data[step.other.name], step.other.maxLength);
    if (step.field) answers[step.field.name] = text(data[step.field.name], step.field.maxLength);
  }
  return { ok: true, answers };
}
