/**
 * Project inquiry questionnaire (Czech). Single source for the fullscreen form
 * (InquiryDialog.astro + scripts/inquiry.ts), the final answer check and the
 * labelled fields sent to Formspree.
 *
 * Each step is an ordered list of blocks: choice groups and text fields.
 */

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
  /** Only shown (and only sent) while another group has one of these values. */
  showWhen?: { name: string; values: string[] };
}

export interface ChoiceGroup {
  kind: 'single' | 'multi';
  name: string;
  /** Question label; steps with one group use the step title instead. */
  label?: string;
  hint?: string;
  options: string[];
  /** Multi choice: maximum number of selections. */
  max?: number;
  /** Option that reveals `other` when selected. */
  otherOption?: string;
  other?: TextField;
  required: boolean;
  error: string;
}

export interface FieldBlock {
  kind: 'field';
  field: TextField;
}

export type InquiryBlock = ChoiceGroup | FieldBlock;

export interface InquiryStep {
  id: string;
  title: string;
  lead?: string;
  blocks: InquiryBlock[];
  note?: string;
  /** Lay text fields out in two columns from tablet up (contact step). */
  grid?: boolean;
}

const single = (name: string, options: string[], error = 'Vyberte prosím jednu možnost.'): ChoiceGroup => ({
  kind: 'single',
  name,
  options,
  required: true,
  error,
});

// Seven short steps, one single-choice question each (Jonas's brief, 2026-10-29).
export const inquirySteps: InquiryStep[] = [
  {
    id: 'need',
    title: 'Co potřebujete?',
    lead: 'Vyberte, co je nejblíž. Doladíme to spolu.',
    blocks: [single('need', ['Nový web', 'Vylepšit současný web', 'Vizuální identitu', 'Ještě si nejsem jistý/á'])],
  },
  {
    id: 'site',
    title: 'Máte už web?',
    blocks: [
      single('hasSite', ['Ano', 'Ne', 'Pracuji na něm']),
      {
        kind: 'field',
        field: {
          name: 'currentUrl',
          label: 'Adresa webu',
          type: 'url',
          placeholder: 'www.vasefirma.cz',
          autocomplete: 'url',
          maxLength: 200,
          showWhen: { name: 'hasSite', values: ['Ano'] },
        },
      },
    ],
  },
  {
    id: 'priority',
    title: 'Co je pro vás teď nejdůležitější?',
    blocks: [single('priority', ['Více poptávek', 'Lepší prezentace firmy', 'Modernější vzhled', 'Pomoci s celkovým směrem'])],
  },
  {
    id: 'help',
    title: 'S čím chcete pomoct?',
    blocks: [single('help', ['Návrh a realizace webu', 'Jen návrh webu', 'Vizuální identita', 'Potřebuji poradit'])],
  },
  {
    id: 'budget',
    title: 'Jaký máte přibližně rozpočet?',
    lead: 'Stačí orientačně. Je to jen odhad, který mi pomůže navrhnout rozsah, nic vás nezavazuje.',
    blocks: [
      single('budget', ['Do 50 000 Kč', '50–100 000 Kč', 'Nad 100 000 Kč', 'Zatím nevím'], 'Vyberte prosím jednu možnost, klidně „Zatím nevím“.'),
    ],
  },
  {
    id: 'timing',
    title: 'Kdy byste chtěli začít?',
    blocks: [
      single('timing', ['Co nejdříve', 'Během pár měsíců', 'Později', 'Zatím nevím'], 'Vyberte prosím jednu možnost, klidně „Zatím nevím“.'),
    ],
  },
  {
    id: 'contact',
    title: 'Kam se vám mám ozvat?',
    lead: 'Poslední krok. Stačí jméno a e-mail.',
    grid: true,
    blocks: [
      { kind: 'field', field: { name: 'name', label: 'Jméno', type: 'text', required: true, autocomplete: 'name', maxLength: 120, error: 'Napište prosím své jméno.' } },
      { kind: 'field', field: { name: 'email', label: 'E-mail', type: 'email', required: true, autocomplete: 'email', maxLength: 200, error: 'Zkontrolujte prosím e-mail, takhle mi nedojde.' } },
      { kind: 'field', field: { name: 'company', label: 'Firma', type: 'text', autocomplete: 'organization', maxLength: 160 } },
      {
        kind: 'field',
        field: {
          name: 'note',
          label: 'Zpráva',
          type: 'textarea',
          help: 'Cokoli, co bych měl vědět předem.',
          maxLength: 2000,
        },
      },
    ],
  },
];

/** Jonas's Formspree form. The ID is a public endpoint by design, not a secret. */
export const FORMSPREE_ENDPOINT = 'https://formspree.io/f/maeebnqp';

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type InquiryAnswers = Record<string, string | string[]>;

/** Server-side check: known option values only, required answers present, sane lengths. */
export function validateInquiry(input: unknown): { ok: true; answers: InquiryAnswers } | { ok: false } {
  if (!input || typeof input !== 'object') return { ok: false };
  const data = input as Record<string, unknown>;
  const answers: InquiryAnswers = {};
  const text = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '');
  const has = (name: string, values: string[]) => {
    const v = answers[name];
    return (Array.isArray(v) ? v : [v]).some((x) => typeof x === 'string' && values.includes(x));
  };

  for (const step of inquirySteps) {
    for (const block of step.blocks) {
      if (block.kind === 'field') {
        const f = block.field;
        const shown = !f.showWhen || has(f.showWhen.name, f.showWhen.values);
        const value = shown ? text(data[f.name], f.maxLength) : '';
        if (f.required && !value) return { ok: false };
        if (f.type === 'email' && !EMAIL_PATTERN.test(value)) return { ok: false };
        answers[f.name] = value;
        continue;
      }
      const raw = data[block.name];
      const picked = [
        ...new Set(
          (Array.isArray(raw) ? raw : [raw]).filter((v): v is string => typeof v === 'string' && block.options.includes(v)),
        ),
      ];
      if (block.required && !picked.length) return { ok: false };
      if (block.kind === 'single' && picked.length > 1) return { ok: false };
      if (block.max && picked.length > block.max) return { ok: false };
      answers[block.name] = block.kind === 'single' ? (picked[0] ?? '') : picked;
      if (block.other) {
        const shown = !!block.otherOption && picked.includes(block.otherOption);
        answers[block.other.name] = shown ? text(data[block.other.name], block.other.maxLength) : '';
      }
    }
  }
  return { ok: true, answers };
}

/** Answers as (Czech label, value) pairs: contact first, then the project in question order. */
export function inquiryRows(answers: InquiryAnswers): [string, string][] {
  const value = (key: string) => {
    const v = answers[key];
    return (Array.isArray(v) ? v.join(', ') : v) || '—';
  };
  const collect = (contact: boolean) =>
    inquirySteps
      .filter((step) => (step.id === 'contact') === contact)
      .flatMap((step) =>
        step.blocks.flatMap((block): [string, string][] => {
          if (block.kind === 'field') {
            const f = block.field;
            // Conditional fields that were never shown stay out.
            return f.showWhen && !answers[f.name] ? [] : [[f.label, value(f.name)]];
          }
          const label = block.label ?? step.title;
          const rows: [string, string][] = [[label, value(block.name)]];
          if (block.other && answers[block.other.name]) rows.push([`${label}: ${block.other.label}`, value(block.other.name)]);
          return rows;
        }),
      );
  return [...collect(true), ...collect(false)];
}
