/// <reference types="node" />
/**
 * POST /api/contact against a fake Notion + Resend (global fetch is replaced, nothing
 * leaves the machine). Run: npm run test:contact
 */
import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';
import { POST } from '../api/contact';
import { PROP } from '../api/_lib/lead';

const ENV = {
  NOTION_API_KEY: 'ntn_test',
  NOTION_DATA_SOURCE_ID: 'ds-test',
  RESEND_API_KEY: 're_test',
  CONTACT_FROM_EMAIL: 'Jonáš Rech <poptavka@example.test>',
  CONTACT_NOTIFICATION_EMAIL: 'studio@example.test',
};

interface Page {
  id: string;
  url: string;
  properties: Record<string, any>;
}
let pages: Page[];
let emails: { body: any; key: string }[];
let fail: { notion?: boolean; resend?: 'all' | 'confirmation' | 'notification' };
let calls: string[];

const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
  const url = String(input);
  const method = init?.method ?? 'GET';
  const body = init?.body ? JSON.parse(String(init.body)) : undefined;
  const headers = new Headers(init?.headers);
  calls.push(`${method} ${url.replace(/^https:\/\/api\.[a-z]+\.com/, '')}`);
  const reply = (status: number, data: unknown) => new Response(JSON.stringify(data), { status });

  if (url.startsWith('https://api.notion.com/')) {
    assert.equal(headers.get('Notion-Version'), '2025-09-03');
    assert.equal(headers.get('Authorization'), 'Bearer ntn_test');
    if (fail.notion) return reply(500, { code: 'internal_server_error', message: 'boom' });
    if (url.endsWith('/data_sources/ds-test/query')) {
      const id = body.filter.rich_text.equals;
      return reply(200, { results: pages.filter((p) => p.properties[PROP.submissionId].rich_text[0].text.content === id) });
    }
    if (url.endsWith('/pages') && method === 'POST') {
      assert.deepEqual(body.parent, { type: 'data_source_id', data_source_id: 'ds-test' });
      const page = { id: `page-${pages.length + 1}`, url: `https://www.notion.so/page-${pages.length + 1}`, properties: body.properties };
      pages.push(page);
      return reply(200, page);
    }
    const patch = url.match(/\/pages\/([^/]+)$/);
    if (patch && method === 'PATCH') {
      const page = pages.find((p) => p.id === patch[1])!;
      Object.assign(page.properties, body.properties);
      return reply(200, page);
    }
  }
  if (url === 'https://api.resend.com/emails') {
    const key = headers.get('Idempotency-Key')!;
    const kind = key.endsWith('-confirmation') ? 'confirmation' : 'notification';
    if (fail.resend === 'all' || fail.resend === kind) return reply(500, { message: 'resend down' });
    emails.push({ body, key });
    return reply(200, { id: `email-${emails.length}` });
  }
  return realFetch(input, init);
}) as typeof fetch;

const ANSWERS_CS = {
  need: 'Nový web',
  hasSite: 'Ano',
  currentUrl: 'www.pekarna-novak.cz',
  priority: 'Více poptávek',
  help: 'Návrh a realizace webu',
  budget: '50–100 000 Kč',
  timing: 'Během pár měsíců',
  name: 'Jana Nováková',
  email: 'delivered@resend.dev',
  company: 'Pekárna Novák',
  note: 'Potřebujeme web do jara.\nDíky!',
};

let ipCounter = 0;
function post(
  body: Record<string, unknown>,
  { origin = 'https://www.jonasrech.com', ip }: { origin?: string | null; ip?: string } = {},
) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', 'x-real-ip': ip ?? `10.0.0.${++ipCounter}` };
  if (origin) headers.Origin = origin;
  return POST(new Request('https://www.jonasrech.com/api/contact', { method: 'POST', headers, body: JSON.stringify(body) }));
}
const submission = (extra: Record<string, unknown> = {}) => ({
  ...ANSWERS_CS,
  website: '',
  locale: 'cs',
  submissionId: `test-${Math.random().toString(36).slice(2, 10)}`,
  elapsedMs: 60_000,
  ...extra,
});
const text = (prop: any) => prop.rich_text?.map((t: any) => t.text.content).join('') ?? prop.title.map((t: any) => t.text.content).join('');

beforeEach(() => {
  pages = [];
  emails = [];
  fail = {};
  calls = [];
  Object.assign(process.env, ENV);
  delete process.env.CONTACT_TEST_RECIPIENT;
  delete process.env.CONTACT_REPLY_TO_EMAIL;
});

test('valid submission: Notion lead with mapped properties, both emails, confirmation ticked', async () => {
  const res = await post(submission({ submissionId: 'abc-12345' }));
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), {
    ok: true,
    id: 'abc-12345',
    duplicate: false,
    stored: true,
    confirmation: 'sent',
    notification: 'sent',
  });

  assert.equal(pages.length, 1);
  const p = pages[0].properties;
  assert.equal(text(p[PROP.company]), 'Pekárna Novák');
  assert.equal(text(p[PROP.contact]), 'Jana Nováková');
  assert.equal(p[PROP.email].email, 'delivered@resend.dev');
  assert.equal(p[PROP.status].select.name, 'New');
  assert.equal(p[PROP.source].select.name, 'Webový formulář');
  assert.equal(p[PROP.projectType].select.name, 'Nový web');
  assert.equal(p[PROP.budget].select.name, '50–100 000 Kč');
  assert.equal(text(p[PROP.timing]), 'Během pár měsíců');
  assert.equal(text(p[PROP.nextStep]), 'Prověřit poptávku a odpovědět');
  assert.match(p[PROP.followUp].date.start, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(text(p[PROP.submissionId]), 'abc-12345');
  assert.equal(p[PROP.web].url, 'https://www.pekarna-novak.cz/');
  assert.equal(p[PROP.confirmed].checkbox, true, 'ticked after Resend accepted the confirmation');
  assert.equal('Typ leadu' in p, false);
  assert.equal('Telefon' in p, false);
  const brief = text(p[PROP.brief]);
  assert.match(brief, /Co potřebujete\? Nový web/);
  assert.match(brief, /Adresa webu: www\.pekarna-novak\.cz/);
  assert.match(brief, /Zpráva:\nPotřebujeme web do jara\.\nDíky!/);

  const [confirmation, notification] = emails;
  assert.equal(confirmation.body.subject, 'Díky za zprávu — Jonáš Rech');
  assert.deepEqual(confirmation.body.to, ['delivered@resend.dev']);
  assert.equal(confirmation.body.reply_to, 'studio@example.test');
  assert.equal(confirmation.body.from, ENV.CONTACT_FROM_EMAIL);
  assert.match(confirmation.body.text, /^Dobrý den,\n\nděkuji za zprávu a zájem o spolupráci\.\n\nVaše poptávka dorazila v pořádku\. Ozvu se vám nejpozději do 2 pracovních dnů s návrhem dalšího postupu\.\n\nMějte se hezky,\nJonáš Rech\njonasrech\.com$/);
  assert.equal(confirmation.key, 'abc-12345-confirmation');
  assert.deepEqual(notification.body.to, ['studio@example.test']);
  assert.equal(notification.body.reply_to, 'delivered@resend.dev');
  assert.equal(notification.body.subject, 'Nová poptávka: Pekárna Novák — Nový web');
  assert.match(notification.body.text, /Kontakt: Jana Nováková/);
  assert.match(notification.body.html, /href="https:\/\/www\.notion\.so\/page-1"/);
});

test('company left empty: Firma falls back to the contact name; invalid website stays out', async () => {
  await post(submission({ company: '', currentUrl: 'not a url' }));
  const p = pages[0].properties;
  assert.equal(text(p[PROP.company]), 'Jana Nováková');
  assert.equal(PROP.web in p, false);
});

test('English submission: selects mapped to the Czech options, English confirmation', async () => {
  const res = await post(
    submission({
      locale: 'en',
      need: 'Visual identity',
      hasSite: 'No',
      currentUrl: '',
      priority: 'A more modern look',
      help: 'Visual identity',
      budget: 'Over CZK 100,000',
      timing: 'Not sure yet',
    }),
  );
  assert.equal(res.status, 200);
  const p = pages[0].properties;
  assert.equal(p[PROP.projectType].select.name, 'Vizuální identitu');
  assert.equal(p[PROP.budget].select.name, 'Nad 100 000 Kč');
  assert.equal(text(p[PROP.timing]), 'Zatím nevím');
  assert.match(text(p[PROP.brief]), /Jazyk formuláře: EN/);
  assert.equal(emails[0].body.subject, 'Thanks for your message — Jonáš Rech');
});

test('required and invalid fields are rejected before anything is stored', async () => {
  for (const extra of [
    { name: '' },
    { email: '' },
    { email: 'jana@' },
    { need: 'Něco vymyšleného' },
    { budget: undefined },
    { submissionId: 'x' },
    { elapsedMs: 1200 },
  ]) {
    const res = await post(submission(extra));
    assert.equal(res.status, 400, JSON.stringify(extra));
    assert.deepEqual(await res.json(), { ok: false, error: 'invalid' });
  }
  assert.equal(calls.length, 0);
});

test('sanitizing: control characters stripped, line breaks only kept in the message', async () => {
  await post(submission({ name: 'Jana\r\nBcc: x@y.z\u0007', note: 'a\r\nb' }));
  assert.equal(text(pages[0].properties[PROP.contact]), 'Jana Bcc: x@y.z');
  assert.match(text(pages[0].properties[PROP.brief]), /Zpráva:\na\nb/);
  assert.doesNotMatch(emails[1].body.subject, /[\r\n]/);
});

test('honeypot: fake success, nothing stored or sent', async () => {
  const res = await post(submission({ website: 'https://spam.example' }));
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true });
  assert.equal(calls.length, 0);
});

test('cross-origin and non-JSON requests are refused', async () => {
  assert.equal((await post(submission(), { origin: 'https://evil.example' })).status, 403);
  assert.equal((await post(submission(), { origin: null })).status, 403);
  const res = await POST(
    new Request('https://www.jonasrech.com/api/contact', {
      method: 'POST',
      headers: { Origin: 'https://www.jonasrech.com', 'Content-Type': 'text/plain' },
      body: 'hi',
    }),
  );
  assert.equal(res.status, 415);
});

test('rate limit: the 6th request from one IP within 10 minutes gets 429', async () => {
  const statuses = [];
  for (let i = 0; i < 6; i++) statuses.push((await post(submission(), { ip: '192.0.2.77' })).status);
  assert.deepEqual(statuses, [200, 200, 200, 200, 200, 429]);
});

test('duplicate submission ID: no second Notion record, no second email', async () => {
  const body = submission({ submissionId: 'dup-12345' });
  await post(body);
  const res = await post(body);
  assert.deepEqual(await res.json(), { ok: true, id: 'dup-12345', duplicate: true, stored: true });
  assert.equal(pages.length, 1);
  assert.equal(emails.length, 2);
});

test('confirmation email fails: lead kept, checkbox stays false, flagged in Další krok; retry recovers', async () => {
  fail.resend = 'confirmation';
  const body = submission({ submissionId: 'retry-12345' });
  const res = await post(body);
  assert.equal(res.status, 200);
  const result = await res.json();
  assert.equal(result.confirmation, 'failed');
  assert.equal(result.notification, 'sent');
  const p = pages[0].properties;
  assert.equal(p[PROP.confirmed].checkbox, false);
  assert.match(text(p[PROP.nextStep]), /potvrzovací e-mail klientovi neodešel/);
  assert.match(emails[0].body.text, /potvrzovací e-mail klientovi se nepodařilo odeslat/);

  // Visitor retries with the same ID once Resend is back: same Notion page, now confirmed.
  fail = {};
  const again = await (await post(body)).json();
  assert.equal(again.duplicate, true);
  assert.equal(again.confirmation, 'sent');
  assert.equal(pages.length, 1);
  assert.equal(pages[0].properties[PROP.confirmed].checkbox, true);
});

test('Resend completely down: lead still saved and the visitor sees success', async () => {
  fail.resend = 'all';
  const res = await post(submission());
  assert.equal(res.status, 200);
  const result = await res.json();
  assert.equal(result.stored, true);
  assert.equal(result.confirmation, 'failed');
  assert.equal(result.notification, 'failed');
  assert.equal(pages[0].properties[PROP.confirmed].checkbox, false);
});

test('Notion down: Jonas gets every answer by email, no client confirmation', async () => {
  fail.notion = true;
  const res = await post(submission({ submissionId: 'rescue-12345' }));
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true, id: 'rescue-12345', stored: false, confirmation: 'skipped', notification: 'sent' });
  assert.equal(emails.length, 1);
  assert.deepEqual(emails[0].body.to, ['studio@example.test']);
  assert.match(emails[0].body.subject, /^\[NEULOŽENO\] /);
  assert.match(emails[0].body.text, /Potřebujeme web do jara/);
});

test('Notion and Resend both down: 502, so the visitor keeps the draft and sees the error state', async () => {
  fail = { notion: true, resend: 'all' };
  const res = await post(submission());
  assert.equal(res.status, 502);
});

test('not configured: 503 (the browser falls back to Formspree)', async () => {
  delete process.env.NOTION_API_KEY;
  const res = await post(submission());
  assert.equal(res.status, 503);
  assert.equal(calls.length, 0);
});

test('CONTACT_TEST_RECIPIENT redirects the client confirmation (preview testing)', async () => {
  process.env.CONTACT_TEST_RECIPIENT = 'me+test@example.test';
  await post(submission({ email: 'real-client@example.com' }));
  assert.deepEqual(emails[0].body.to, ['me+test@example.test']);
  assert.equal(pages[0].properties[PROP.email].email, 'real-client@example.com');
});
