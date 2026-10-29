/**
 * Project inquiry questionnaire (Czech). Single source for the fullscreen form
 * (InquiryDialog.astro + scripts/inquiry.ts) and the server check (api/inquiry.ts):
 * the endpoint only accepts option values listed here.
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

const HAS_SITE = ['Web máme, ale potřebuje změnu', 'Web máme a chceme ho rozšířit'];

export const inquirySteps: InquiryStep[] = [
  {
    id: 'project',
    title: 'Co spolu budeme tvořit?',
    lead: 'Vyberte, co je nejblíž. Doladíme to spolu.',
    blocks: [
      {
        kind: 'single',
        name: 'project',
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
    ],
  },
  {
    id: 'situation',
    title: 'Kde jste teď a co má projekt změnit?',
    blocks: [
      {
        kind: 'single',
        name: 'stage',
        label: 'Kde jste teď?',
        options: ['Web zatím nemáme', ...HAS_SITE],
        required: true,
        error: 'Vyberte prosím, kde teď jste.',
      },
      {
        kind: 'field',
        field: {
          name: 'currentUrl',
          label: 'Adresa současného webu',
          type: 'url',
          placeholder: 'www.vasefirma.cz',
          autocomplete: 'url',
          maxLength: 200,
          showWhen: { name: 'stage', values: HAS_SITE },
        },
      },
      {
        kind: 'multi',
        name: 'goals',
        label: 'Co má projekt především změnit?',
        hint: 'Nejvýš dvě věci, na kterých záleží nejvíc.',
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
        error: 'Vyberte prosím aspoň jednu věc.',
      },
    ],
  },
  {
    id: 'help',
    title: 'S čím budete potřebovat pomoct?',
    lead: 'Klidně vyberte víc možností.',
    blocks: [
      {
        kind: 'multi',
        name: 'help',
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
    ],
  },
  {
    id: 'scope',
    title: 'Jaký máte pro projekt rámec?',
    lead: 'Stačí orientačně. Odpovědi mi jen pomůžou navrhnout rozsah, který dává smysl, nic vás nezavazují.',
    blocks: [
      {
        kind: 'single',
        name: 'budget',
        label: 'Rozpočet',
        options: ['Do 50 000 Kč', '50–100 000 Kč', '100–200 000 Kč', 'Nad 200 000 Kč', 'Zatím nevím'],
        required: true,
        error: 'Vyberte prosím jednu možnost, klidně „Zatím nevím“.',
      },
      {
        kind: 'single',
        name: 'timing',
        label: 'Kdy začít',
        options: ['Co nejdříve', 'Během 1–3 měsíců', 'Později', 'Termín zatím neřešíme'],
        required: true,
        error: 'Vyberte prosím jednu možnost, klidně „Termín zatím neřešíme“.',
      },
    ],
  },
  {
    id: 'notes',
    title: 'Co bych měl o projektu vědět?',
    lead: 'Nepovinné. Pár vět stačí.',
    blocks: [
      {
        kind: 'field',
        field: {
          name: 'note',
          label: 'Poznámka k projektu',
          type: 'textarea',
          help: 'Například komu web slouží, co vás teď brzdí nebo co už máte připravené.',
          maxLength: 2000,
        },
      },
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
      { kind: 'field', field: { name: 'phone', label: 'Telefon', type: 'tel', autocomplete: 'tel', maxLength: 40 } },
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
