/// <reference types="node" />
/**
 * POST /api/contact — Vercel Function for the project questionnaire. The Astro site
 * stays fully static; Vercel deploys files in /api as functions next to it (same as the
 * root middleware.ts), so no Astro adapter is needed.
 *
 * Flow: spam checks → validation (src/data/inquiry.ts) → Notion lead (deduplicated by
 * the submission ID) → confirmation to the client → notification to Jonas → tick
 * "Potvrzení odesláno" once Resend accepted the confirmation.
 * If Notion is down, the notification still goes out with every answer, so a lead is
 * never lost silently. Secrets live in Vercel env vars only (see README).
 *
 * Responses: { ok, id?, duplicate?, stored?, confirmation?, notification?, error? }
 *   200 saved (or a duplicate / honeypot hit) · 400 invalid · 403 cross-origin
 *   409 same submission still in progress · 413/415 bad body · 429 rate limited
 *   502 nothing could be stored · 503 not configured (the browser falls back to Formspree)
 */
import { getInquiry, validateInquiry, type InquiryLocale } from '../src/data/inquiry.js';
import {
  buildLead,
  confirmationEmail,
  createLead,
  emailReady,
  findLead,
  markLead,
  notificationEmail,
  readConfig,
  sendEmail,
  type NotionPage,
} from './_lib/lead.js';

const MIN_FILL_MS = 4000; // faster than any human can finish seven steps
const MAX_BODY = 20_000;
const RATE = { windowMs: 10 * 60 * 1000, max: 5 };
const SUBMISSION_ID = /^[A-Za-z0-9-]{8,64}$/;

// Best effort, per warm serverless instance. A hard limit needs a Vercel Firewall rule.
const hits = new Map<string, number[]>();
const inFlight = new Set<string>();

type Status = 'sent' | 'failed' | 'skipped';

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

function rateLimited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE.windowMs);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear(); // keep a long-lived instance from growing forever
  return recent.length > RATE.max;
}

export async function POST(request: Request): Promise<Response> {
  // Same-origin only (works for www, apex and Vercel preview hosts).
  const origin = request.headers.get('origin');
  try {
    if (!origin || new URL(origin).host !== new URL(request.url).host) return json(403, { ok: false, error: 'forbidden' });
  } catch {
    return json(403, { ok: false, error: 'forbidden' });
  }
  if (!request.headers.get('content-type')?.includes('application/json')) return json(415, { ok: false, error: 'unsupported' });

  const raw = await request.text();
  if (raw.length > MAX_BODY) return json(413, { ok: false, error: 'too_large' });
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(raw);
    if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('not an object');
  } catch {
    return json(400, { ok: false, error: 'invalid' });
  }

  // Honeypot filled: pretend success so bots learn nothing.
  if (typeof data.website === 'string' && data.website.trim()) return json(200, { ok: true });
  const elapsed = Number(data.elapsedMs);
  if (!Number.isFinite(elapsed) || elapsed < MIN_FILL_MS) return json(400, { ok: false, error: 'invalid' });

  const ip = request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  if (rateLimited(ip)) return json(429, { ok: false, error: 'rate_limited' });

  const id = typeof data.submissionId === 'string' ? data.submissionId : '';
  if (!SUBMISSION_ID.test(id)) return json(400, { ok: false, error: 'invalid' });
  const locale: InquiryLocale = data.locale === 'en' ? 'en' : 'cs';
  const result = validateInquiry(data, getInquiry(locale).steps);
  if (!result.ok) return json(400, { ok: false, error: 'invalid' });

  const config = readConfig(process.env);
  if (!config) {
    console.error('Lead not processed: NOTION_API_KEY or NOTION_DATA_SOURCE_ID is not configured.');
    return json(503, { ok: false, error: 'unavailable' });
  }
  if (!emailReady(config)) console.error('Emails skipped: RESEND_API_KEY, CONTACT_FROM_EMAIL or CONTACT_NOTIFICATION_EMAIL is missing.');

  if (inFlight.has(id)) return json(409, { ok: false, error: 'in_progress' });
  inFlight.add(id);
  try {
    const lead = buildLead(id, result.answers, locale);

    // 1. Notion: reuse the lead a retried submission already created.
    let page: NotionPage | null = null;
    let duplicate = false;
    try {
      page = await findLead(config, id);
      duplicate = !!page;
      if (page?.confirmed) return json(200, { ok: true, id, duplicate: true, stored: true });
      page ??= await createLead(config, lead);
    } catch (error) {
      console.error(`Lead ${id} not saved to Notion:`, error);
    }

    // Notion failed: the notification carries every answer instead.
    if (!page) {
      const rescued =
        emailReady(config) &&
        (await sendEmail(config, notificationEmail(config, lead, { notionUrl: null, confirmationSent: null }), `${id}-rescue`));
      if (!rescued) console.error(`Lead ${id} LOST: Notion and the rescue email both failed.`, JSON.stringify(lead));
      return rescued
        ? json(200, { ok: true, id, stored: false, confirmation: 'skipped', notification: 'sent' })
        : json(502, { ok: false, id, error: 'failed' });
    }

    // 2. Emails, tracked separately; the lead is already safe in Notion.
    let confirmation: Status = 'skipped';
    let notification: Status = 'skipped';
    if (emailReady(config)) {
      confirmation = (await sendEmail(config, confirmationEmail(config, lead), `${id}-confirmation`)) ? 'sent' : 'failed';
      const notify = notificationEmail(config, lead, { notionUrl: page.url, confirmationSent: confirmation === 'sent' });
      notification = (await sendEmail(config, notify, `${id}-notification`)) ? 'sent' : 'failed';
    }

    // 3. Tick "Potvrzení odesláno" only after Resend accepted the confirmation;
    //    otherwise flag it in "Další krok" so it shows up in the CRM.
    if (confirmation !== 'skipped') {
      try {
        await markLead(config, page.id, confirmation === 'sent');
      } catch (error) {
        console.error(`Lead ${id}: could not update the confirmation state in Notion:`, error);
      }
    }
    if (notification === 'failed') console.error(`Lead ${id}: internal notification failed, lead is in Notion: ${page.url}`);

    return json(200, { ok: true, id, duplicate, stored: true, confirmation, notification });
  } finally {
    inFlight.delete(id);
  }
}
