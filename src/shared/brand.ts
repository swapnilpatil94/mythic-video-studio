/** KATHAAYA brand constants — shared by the rendered video output and the Studio UI so both pull
 * from one definition instead of hand-copied strings drifting apart. */
export const BRAND_NAME = 'KATHAAYA';
export const BRAND_TAGLINE = 'ANCIENT STORIES. REIMAGINED THROUGH INK.';

/** Path to the real KATHAAYA emblem (gold ink-brush "क" mark in a circular seal, on black),
 * resolved via Remotion's `staticFile()` against `public/`. Used for the opening ident, the
 * persistent corner watermark, and the end card — the same one file everywhere, not redrawn. */
export const BRAND_LOGO_PATH = 'brand/kathaaya-logo.png';
