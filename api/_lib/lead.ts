/**
 * Lead pipeline behind POST /api/contact: map validated questionnaire answers to the
 * Notion "Leads" data source, then email the client and Jonas through Resend.
 * Files in api/_lib are not deployed as functions (leading underscore).
 *
 * Plain fetch against the official REST APIs, no SDKs: two small calls each.
 */
import { getInquiry, inquiryRows, type InquiryAnswers, type InquiryLocale } from '../../src/data/inquiry.js';

export const NOTION_VERSION = '2025-09-03'; // first version with data sources
const NOTION_API = 'https://api.notion.com/v1';
const RESEND_API = 'https://api.resend.com/emails';

/** Values every new web lead starts with (Jonas's brief, 2026-10-30). */
export const LEAD_DEFAULTS = {
  status: 'New',
  source: 'Webový formulář',
  nextStep: 'Prověřit poptávku a odpovědět',
  nextStepConfirmationFailed: 'Prověřit poptávku a odpovědět (pozor: potvrzovací e-mail klientovi neodešel)',
  followUpBusinessDays: 2, // matches "ozvu se do 2 pracovních dnů" in the confirmation
};

/** Notion property names, exactly as they are in the database. */
export const PROP = {
  company: 'Firma',
  contact: 'Kontakt',
  email: 'Email',
  status: 'Stav',
  source: 'Zdroj poptávky',
  projectType: 'Typ projektu',
  budget: 'Rozpočet klienta',
  timing: 'Požadovaný termín',
  brief: 'Brief poptávky',
  nextStep: 'Další krok',
  followUp: 'Follow-up',
  submissionId: 'ID webové poptávky',
  confirmed: 'Potvrzení odesláno',
  web: 'Web',
} as const;

export interface Config {
  notionKey: string;
  dataSourceId: string;
  resendKey?: string;
  from?: string;
  notifyTo?: string;
  replyTo?: string;
  /** Preview/testing only: every client confirmation goes here instead of the visitor. */
  testRecipient?: string;
  /** Link to the collaboration guide (PDF). Without it the guide paragraph is left out. */
  guideUrl?: string;
}

const httpsUrl = (value?: string) => {
  try {
    return value && new URL(value).protocol === 'https:' ? value : undefined;
  } catch {
    return undefined;
  }
};

export function readConfig(env: Record<string, string | undefined>): Config | null {
  const notionKey = env.NOTION_API_KEY?.trim();
  const dataSourceId = env.NOTION_DATA_SOURCE_ID?.trim();
  if (!notionKey || !dataSourceId) return null;
  const notifyTo = env.CONTACT_NOTIFICATION_EMAIL?.trim();
  return {
    notionKey,
    dataSourceId,
    resendKey: env.RESEND_API_KEY?.trim() || undefined,
    from: env.CONTACT_FROM_EMAIL?.trim() || undefined,
    notifyTo,
    replyTo: env.CONTACT_REPLY_TO_EMAIL?.trim() || notifyTo,
    testRecipient: env.CONTACT_TEST_RECIPIENT?.trim() || undefined,
    guideUrl: httpsUrl(env.CONTACT_GUIDE_URL?.trim()),
  };
}

/* ---------- Mapping ---------- */

/**
 * English answers carry English option labels; the CRM keeps one (Czech) set of select
 * options, so choices are mapped to the Czech option at the same position.
 */
export function toCzechAnswers(answers: InquiryAnswers, locale: InquiryLocale): InquiryAnswers {
  if (locale === 'cs') return answers;
  const en = getInquiry('en').steps;
  const cs = getInquiry('cs').steps;
  const out: InquiryAnswers = { ...answers };
  en.forEach((step, s) =>
    step.blocks.forEach((block, b) => {
      if (block.kind === 'field') return;
      const target = cs[s].blocks[b];
      if (target.kind === 'field') return;
      const map = (v: string) => target.options[block.options.indexOf(v)] ?? v;
      const v = answers[block.name];
      if (v) out[block.name] = Array.isArray(v) ? v.map(map) : map(v);
    }),
  );
  return out;
}

const str = (answers: InquiryAnswers, key: string) => {
  const v = answers[key];
  return (Array.isArray(v) ? v.join(', ') : v ?? '').trim();
};

/** "www.firma.cz" → "https://www.firma.cz/"; anything that isn't an http(s) URL → null. */
export function normalizeUrl(value: string): string | null {
  if (!value) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    return /^https?:$/.test(url.protocol) && url.hostname.includes('.') ? url.toString() : null;
  } catch {
    return null;
  }
}

export function addBusinessDays(from: Date, days: number): string {
  const d = new Date(from);
  let left = days;
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    const day = d.getUTCDay();
    if (day !== 0 && day !== 6) left--;
  }
  return d.toISOString().slice(0, 10);
}

/** Notion rich text: one text object holds at most 2000 characters. */
const richText = (value: string) => {
  const chunks = value.match(/[\s\S]{1,2000}/g) ?? [];
  return chunks.slice(0, 100).map((content) => ({ type: 'text', text: { content } }));
};
// Select option names may not contain commas.
const select = (value: string) => (value ? { select: { name: value.replace(/,/g, ' ').slice(0, 100) } } : { select: null });

export interface Lead {
  id: string;
  locale: InquiryLocale;
  company: string;
  name: string;
  email: string;
  projectType: string;
  budget: string;
  timing: string;
  web: string | null;
  /** Every answer in question order, Czech labels: [question, answer]. */
  rows: [string, string][];
  brief: string;
}

export function buildLead(id: string, answers: InquiryAnswers, locale: InquiryLocale): Lead {
  const cz = toCzechAnswers(answers, locale);
  const steps = getInquiry('cs').steps;
  const rows = inquiryRows(cz, steps);
  const contactFields = new Set(['Jméno', 'E-mail', 'Firma', 'Zpráva']);
  const project = rows.filter(([q]) => !contactFields.has(q));
  const note = str(cz, 'note');
  const brief = [
    ...project.map(([q, a]) => (q.endsWith('?') ? `${q} ${a}` : `${q}: ${a}`)),
    ...(note ? ['', 'Zpráva:', note] : []),
    ...(locale === 'en' ? ['', 'Jazyk formuláře: EN'] : []),
  ].join('\n');
  const name = str(cz, 'name');
  return {
    id,
    locale,
    company: str(cz, 'company') || name,
    name,
    email: str(cz, 'email'),
    projectType: str(cz, 'need'),
    budget: str(cz, 'budget'),
    timing: str(cz, 'timing'),
    web: normalizeUrl(str(cz, 'currentUrl')),
    rows,
    brief,
  };
}

export function notionProperties(lead: Lead, now = new Date()) {
  return {
    [PROP.company]: { title: richText(lead.company) },
    [PROP.contact]: { rich_text: richText(lead.name) },
    [PROP.email]: { email: lead.email },
    [PROP.status]: select(LEAD_DEFAULTS.status),
    [PROP.source]: select(LEAD_DEFAULTS.source),
    [PROP.projectType]: select(lead.projectType),
    [PROP.budget]: select(lead.budget),
    [PROP.timing]: { rich_text: richText(lead.timing) },
    [PROP.brief]: { rich_text: richText(lead.brief) },
    [PROP.nextStep]: { rich_text: richText(LEAD_DEFAULTS.nextStep) },
    [PROP.followUp]: { date: { start: addBusinessDays(now, LEAD_DEFAULTS.followUpBusinessDays) } },
    [PROP.submissionId]: { rich_text: richText(lead.id) },
    [PROP.confirmed]: { checkbox: false },
    ...(lead.web ? { [PROP.web]: { url: lead.web } } : {}),
  };
}

/* ---------- Notion ---------- */

export interface NotionPage {
  id: string;
  url: string;
  confirmed: boolean;
}

async function notion(config: Config, path: string, method: string, body?: unknown) {
  const response = await fetch(`${NOTION_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${config.notionKey}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  });
  const data = (await response.json().catch(() => ({}))) as Record<string, any>;
  if (!response.ok) throw new Error(`Notion ${method} ${path} → ${response.status} ${data.code ?? ''} ${data.message ?? ''}`.trim());
  return data;
}

const toPage = (page: Record<string, any>): NotionPage => ({
  id: page.id,
  url: page.url,
  confirmed: page.properties?.[PROP.confirmed]?.checkbox === true,
});

/** The lead already saved under this submission ID, if any (duplicate / retried submit). */
export async function findLead(config: Config, id: string): Promise<NotionPage | null> {
  const data = await notion(config, `/data_sources/${config.dataSourceId}/query`, 'POST', {
    filter: { property: PROP.submissionId, rich_text: { equals: id } },
    page_size: 1,
  });
  return data.results?.[0] ? toPage(data.results[0]) : null;
}

export async function createLead(config: Config, lead: Lead): Promise<NotionPage> {
  const page = await notion(config, '/pages', 'POST', {
    parent: { type: 'data_source_id', data_source_id: config.dataSourceId },
    properties: notionProperties(lead),
  });
  return toPage(page);
}

export async function markLead(config: Config, pageId: string, confirmationSent: boolean) {
  await notion(config, `/pages/${pageId}`, 'PATCH', {
    properties: confirmationSent
      ? { [PROP.confirmed]: { checkbox: true } }
      : { [PROP.nextStep]: { rich_text: richText(LEAD_DEFAULTS.nextStepConfirmationFailed) } },
  });
}

/* ---------- Resend ---------- */

export const emailReady = (config: Config) => !!(config.resendKey && config.from && config.notifyTo);

interface Email {
  to: string;
  replyTo?: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * True only when Resend accepted the email (2xx with an id). The idempotency key makes
 * a retried submission reuse the first send instead of mailing twice (Resend keeps
 * keys for 24 hours).
 */
export async function sendEmail(config: Config, email: Email, idempotencyKey: string): Promise<boolean> {
  try {
    const response = await fetch(RESEND_API, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.resendKey}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({
        from: config.from,
        to: [email.to],
        reply_to: email.replyTo,
        subject: email.subject,
        text: email.text,
        html: email.html,
      }),
      signal: AbortSignal.timeout(8000),
    });
    const data = (await response.json().catch(() => ({}))) as { id?: string; message?: string };
    if (response.ok && data.id) return true;
    console.error(`Resend rejected "${email.subject}": ${response.status} ${data.message ?? ''}`);
  } catch (error) {
    console.error(`Resend unreachable for "${email.subject}":`, error);
  }
  return false;
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
// Visitor text ends up in subjects: no line breaks, sane length.
const oneLine = (value: string) => value.replace(/\s+/g, ' ').trim().slice(0, 80);
const paragraphsHtml = (blocks: Block[]) =>
  `<div style="font:15px/1.6 system-ui,sans-serif;color:#111">${blocks
    .map((b) =>
      typeof b === 'string'
        ? `<p style="margin:0 0 16px">${escapeHtml(b).replace(/\n/g, '<br>')}</p>`
        : `<p style="margin:0 0 16px"><a href="${escapeHtml(b.url)}" style="color:#111;font-weight:600">${escapeHtml(b.label)}</a></p>`,
    )
    .join('')}</div>`;

/** A paragraph of plain text, or a labelled link. */
type Block = string | { label: string; url: string };

const WORDS = {
  cs: {
    subject: 'Díky za zprávu — Jonáš Rech',
    greeting: (name: string) => `Dobrý den, ${name},`,
    thanks: 'díky, že jste se mi ozvali a napsali mi něco o svém projektu.',
    received:
      'Vaše zpráva dorazila v pořádku. Během 1–2 pracovních dnů si projdu zadání a ozvu se vám, abychom se domluvili, co dál.',
    guide:
      'Mezitím vám posílám krátkého průvodce spoluprací. Najdete v něm něco málo o mně, jak pracuji a co můžete během celého projektu očekávat.',
    guideLink: 'Mrknout na průvodce spoluprací →',
    reply: 'A pokud vás mezitím napadne něco, co jste do poptávky nenapsali, klidně mi odpovězte přímo na tento e-mail.',
    signoff: 'Mějte se hezky,\nJonáš Rech\nWeb Design & Development\njonasrech.com',
  },
  en: {
    subject: 'Thanks for your message — Jonáš Rech',
    greeting: (name: string) => `Hello ${name},`,
    thanks: 'thank you for getting in touch and telling me a bit about your project.',
    received:
      'Your message arrived safely. Within 1–2 business days I’ll go through your brief and get back to you so we can agree on the next steps.',
    guide:
      'In the meantime, here is a short guide to working together. It covers a little about me, how I work and what you can expect throughout the project.',
    guideLink: 'Have a look at the collaboration guide →',
    reply: 'And if anything comes to mind that you didn’t put in your enquiry, just reply directly to this email.',
    signoff: 'All the best,\nJonáš Rech\nWeb Design & Development\njonasrech.com',
  },
};

export function confirmationEmail(config: Config, lead: Lead): Email {
  const w = WORDS[lead.locale];
  const blocks: Block[] = [
    w.greeting(lead.name),
    w.thanks,
    w.received,
    ...(config.guideUrl ? [w.guide, { label: w.guideLink, url: config.guideUrl }] : []),
    w.reply,
    w.signoff,
  ];
  const text = blocks.map((b) => (typeof b === 'string' ? b : `${b.label} ${b.url}`)).join('\n\n');
  return {
    to: config.testRecipient ?? lead.email,
    replyTo: config.replyTo,
    subject: w.subject,
    text,
    html: paragraphsHtml(blocks),
  };
}

export function notificationEmail(
  config: Config,
  lead: Lead,
  status: { notionUrl: string | null; confirmationSent: boolean | null },
): Email {
  const warning =
    status.notionUrl === null
      ? 'POZOR: lead se NEPODAŘILO uložit do Notion. Všechny odpovědi jsou níže, přidej ho ručně.'
      : status.confirmationSent === false
        ? 'Pozor: potvrzovací e-mail klientovi se nepodařilo odeslat.'
        : '';
  const summary: [string, string][] = [
    ['Firma', lead.company],
    ['Kontakt', lead.name],
    ['E-mail', lead.email],
    ['Typ projektu', lead.projectType || '—'],
    ['Notion', status.notionUrl ?? 'neuloženo'],
    ['ID poptávky', lead.id],
  ];
  const block = (list: [string, string][]) => list.map(([q, a]) => `${q}: ${a}`).join('\n');
  const text = [warning, block(summary), 'Odpovědi', block(lead.rows)].filter(Boolean).join('\n\n');
  const row = ([q, a]: [string, string]) =>
    `<tr><td style="padding:6px 12px 6px 0;border-top:1px solid #ddd;color:#666;vertical-align:top;width:40%">${escapeHtml(q)}</td>` +
    `<td style="padding:6px 0;border-top:1px solid #ddd;vertical-align:top;white-space:pre-wrap">${
      q === 'Notion' && status.notionUrl ? `<a href="${escapeHtml(status.notionUrl)}">Otevřít lead v Notion</a>` : escapeHtml(a)
    }</td></tr>`;
  const table = (list: [string, string][]) =>
    `<table style="border-collapse:collapse;width:100%;font:14px/1.5 system-ui,sans-serif">${list.map(row).join('')}</table>`;
  const html =
    (warning ? `<p style="font:600 15px/1.5 system-ui,sans-serif;color:#b00020">${escapeHtml(warning)}</p>` : '') +
    table(summary) +
    '<h2 style="font:600 16px/1.3 system-ui,sans-serif;margin:28px 0 8px">Odpovědi</h2>' +
    table(lead.rows);
  const prefix = status.notionUrl === null ? '[NEULOŽENO] ' : '';
  return {
    to: config.notifyTo!,
    replyTo: lead.email,
    subject: `${prefix}Nová poptávka: ${oneLine(lead.company)}${lead.projectType ? ` — ${lead.projectType}` : ''}`,
    text,
    html,
  };
}
