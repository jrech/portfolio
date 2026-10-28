/**
 * Vercel Routing Middleware — first-visit language redirect.
 *
 * Czech pages live at `/`, English under `/en/`. A visitor on a Czech page is sent to
 * the English one when their preferred language is EN:
 *   1. the `lang` cookie (set by the EN / CZ switch, and by this redirect), otherwise
 *   2. their country (`x-vercel-ip-country`): anything except CZ and SK means EN.
 * Crawlers are never redirected, so both language versions stay indexable (hreflang).
 * English pages are never redirected back: anyone can open /en/ from anywhere.
 */
export const config = {
  // Pages only: skip /en, built assets, Vercel internals and files with an extension.
  matcher: ['/((?!en(?:/|$)|_astro/|_vercel/|.*\\.[a-z0-9]+$).*)'],
};

const CZECH_COUNTRIES = new Set(['CZ', 'SK']);
const BOT = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|embedly|whatsapp|telegram|lighthouse|headless/i;
const ONE_YEAR = 60 * 60 * 24 * 365;

function cookie(request: Request, name: string): string | undefined {
  const match = request.headers.get('cookie')?.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match?.[1];
}

export default function middleware(request: Request): Response | undefined {
  if (request.method !== 'GET' && request.method !== 'HEAD') return;
  if (BOT.test(request.headers.get('user-agent') ?? '')) return;

  const chosen = cookie(request, 'lang');
  if (chosen === 'cs') return;

  const country = request.headers.get('x-vercel-ip-country')?.toUpperCase();
  const wantsEnglish = chosen === 'en' || (country !== undefined && !CZECH_COUNTRIES.has(country));
  if (!wantsEnglish) return;

  const url = new URL(request.url);
  url.pathname = `/en${url.pathname === '/' ? '/' : url.pathname}`;
  return new Response(null, {
    status: 307,
    headers: {
      Location: url.toString(),
      'Set-Cookie': `lang=en; Path=/; Max-Age=${ONE_YEAR}; SameSite=Lax`,
      Vary: 'Cookie, X-Vercel-IP-Country',
    },
  });
}
