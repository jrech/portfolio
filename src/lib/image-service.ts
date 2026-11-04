/**
 * Image service: Astro's sharp service, with one rule on top so no image comes out worse than its source.
 *
 * - Lossless sources (PNG, GIF, lossless WebP) are encoded as lossless WebP. Screenshots and device
 *   mockups are mostly flat colour and sharp text, where even quality-100 lossy WebP smears colour at
 *   edges (it always halves chroma resolution).
 * - Lossy sources (JPEG, lossy WebP) stay lossy WebP at the quality the component asks for (100 on this
 *   site). They already carry their own compression, so a lossless copy would be 2–4× the bytes for no
 *   visible gain.
 *
 * - Opt-out: a lossless source named `*.photo.<ext>` (a photographic mockup, e.g. a laptop on a table)
 *   is treated as a photo and stays lossy at quality 100. Lossless photos are ~3× heavier for no
 *   visible gain (Jonas, 2026-11-04).
 *
 * At the source's own width and format Astro serves the original file untouched either way.
 * Wired in astro.config.mjs (`image.service`).
 */
import type { ImageTransform, LocalImageService } from 'astro';
import sharpService from 'astro/assets/services/sharp';

const ascii = (buf: Uint8Array, at: number, len = 4) => String.fromCharCode(...buf.subarray(at, at + len));

/** True when the source bytes are PNG, GIF or lossless (VP8L) WebP. */
export function isLosslessSource(buf: Uint8Array): boolean {
  if (buf[0] === 0x89 && ascii(buf, 1, 3) === 'PNG') return true;
  if (ascii(buf, 0, 3) === 'GIF') return true;
  if (ascii(buf, 0) !== 'RIFF' || ascii(buf, 8) !== 'WEBP') return false;
  // Walk the RIFF chunks (VP8X files put metadata chunks before the bitstream).
  for (let at = 12; at + 8 <= buf.length; ) {
    const id = ascii(buf, at);
    if (id === 'VP8L') return true;
    if (id === 'VP8 ') return false;
    const size = buf[at + 4] | (buf[at + 5] << 8) | (buf[at + 6] << 16) | (buf[at + 7] << 24);
    at += 8 + size + (size & 1);
  }
  return false;
}

const service: LocalImageService = {
  ...(sharpService as LocalImageService),
  async transform(inputBuffer, transform: ImageTransform, config, ...rest) {
    const format = transform.format ?? 'webp';
    const isPhoto = /\.photo\./i.test(String(transform.src));
    if (format === 'webp' && !isPhoto && isLosslessSource(inputBuffer)) {
      const serviceConfig = config.service.config ?? {};
      config = {
        ...config,
        service: {
          ...config.service,
          config: { ...serviceConfig, webp: { ...serviceConfig.webp, lossless: true, effort: 6 } },
        },
      };
    }
    return (sharpService as LocalImageService).transform(inputBuffer, transform, config, ...rest);
  },
};

export default service;
