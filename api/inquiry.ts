/**
 * POST /api/inquiry — Vercel Function for the project questionnaire. The Astro site
 * stays fully static; Vercel deploys files in /api as functions next to it (same as the
 * root middleware.ts). Validates against src/data/inquiry.ts and emails the answers
 * to Jonas through Resend. Credentials live in Vercel env vars only:
 *   RESEND_API_KEY      Resend API key (required for delivery)
 *   INQUIRY_TO_EMAIL    recipient, defaults to hello@jonasrech.com
 *   INQUIRY_FROM_EMAIL  sender on a domain verified in Resend
 */
import { inquirySteps, validateInquiry, type InquiryAnswers } from '../src/data/inquiry';

declare const process: { env: Record<string, string | undefined> };
const DEFAULT_TO = 'hello@jonasrech.com';

const MIN_FILL_MS = 4000; // faster than any human can finish seven steps
const MAX_BODY = 20_000;
const RATE = { windowMs: 10 * 60 * 1000, max: 5 };
const hits = new Map<string, number[]>(); // best effort: per serverless instance

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function rateLimited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE.windowMs);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > RATE.max;
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Ordered rows (question, answer) for the email, following the questionnaire. */
function rows(answers: InquiryAnswers): [string, string][] {
  const out: [string, string][] = [];
  const value = (key: string) => {
    const v = answers[key];
    return Array.isArray(v) ? v.join(', ') : v || '—';
  };
  for (const step of inquirySteps) {
    if (step.kind === 'contact') {
      step.fields.forEach((f) => out.push([f.label, value(f.name)]));
      continue;
    }
    out.push([step.title, value(step.name)]);
    if (step.other && answers[step.other.name]) out.push([`${step.title} — ${step.other.label}`, value(step.other.name)]);
    if (step.field) out.push([step.field.label, value(step.field.name)]);
  }
  return out;
}

function buildEmail(answers: InquiryAnswers) {
  const contact = ['name', 'email', 'company', 'phone'];
  const all = rows(answers);
  const contactRows = all.slice(-contact.length);
  const projectRows = all.slice(0, -contact.length);
  const block = (title: string, list: [string, string][]) =>
    `${title}\n${'-'.repeat(title.length)}\n` + list.map(([q, a]) => `${q}\n  ${a}`).join('\n\n');
  const text = `${block('Kontakt', contactRows)}\n\n${block('Projekt', projectRows)}\n`;
  const table = (title: string, list: [string, string][]) =>
    `<h2 style="font:600 16px/1.3 system-ui,sans-serif;margin:28px 0 8px">${title}</h2>` +
    '<table style="border-collapse:collapse;width:100%;font:14px/1.5 system-ui,sans-serif">' +
    list
      .map(
        ([q, a]) =>
          `<tr><td style="padding:8px 12px 8px 0;border-top:1px solid #ddd;color:#666;vertical-align:top;width:40%">${escapeHtml(q)}</td>` +
          `<td style="padding:8px 0;border-top:1px solid #ddd;vertical-align:top;white-space:pre-wrap">${escapeHtml(a)}</td></tr>`,
      )
      .join('') +
    '</table>';
  const html = `<div>${table('Kontakt', contactRows)}${table('Projekt', projectRows)}</div>`;
  const project = Array.isArray(answers.project) ? answers.project[0] : answers.project;
  const subject = `Nová poptávka: ${answers.name} — ${project}`;
  return { subject, text, html };
}

export async function POST(request: Request): Promise<Response> {
  // Same-origin only (works for www, apex and Vercel preview hosts).
  const origin = request.headers.get('origin');
  if (!origin || new URL(origin).host !== new URL(request.url).host) return json(403, { ok: false });
  if (!request.headers.get('content-type')?.includes('application/json')) return json(415, { ok: false });

  const raw = await request.text();
  if (raw.length > MAX_BODY) return json(413, { ok: false });
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw);
  } catch {
    return json(400, { ok: false });
  }

  // Honeypot filled: pretend success so bots learn nothing.
  if (typeof data.website === 'string' && data.website.trim()) return json(200, { ok: true });
  const startedAt = Number(data.startedAt);
  if (!Number.isFinite(startedAt) || Date.now() - startedAt < MIN_FILL_MS) return json(400, { ok: false });

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (rateLimited(ip)) return json(429, { ok: false });

  const result = validateInquiry(data);
  if (!result.ok) return json(400, { ok: false });

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.INQUIRY_FROM_EMAIL;
  const to = process.env.INQUIRY_TO_EMAIL || DEFAULT_TO;
  if (!apiKey || !from) {
    console.error('Inquiry not sent: RESEND_API_KEY or INQUIRY_FROM_EMAIL is not configured.');
    return json(503, { ok: false });
  }

  const email = buildEmail(result.answers);
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: result.answers.email,
      subject: email.subject,
      text: email.text,
      html: email.html,
    }),
  });
  if (!response.ok) {
    console.error('Inquiry not sent: Resend responded', response.status, await response.text());
    return json(502, { ok: false });
  }
  return json(200, { ok: true });
}
