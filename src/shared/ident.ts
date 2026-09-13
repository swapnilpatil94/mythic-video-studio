/** Shared between the Remotion composition (KathaayaFeature.tsx) and the Node-side pipeline
 * (check-output.ts) so the opening-ident length is defined once — the rendered MP4 is always this
 * many seconds longer than `manifest.duration_seconds`, and any code checking the final video's
 * duration against the manifest needs to account for it.
 *
 * LONGFORM keeps the full cinematic studio ident (a viewer who chose a long watch has already
 * committed and a real "who made this" beat before a feature is normal, the same job a production
 * logo bumper does in a real film). SHORT does not: a cold Shorts/Reels viewer decides whether to
 * keep watching within the first second or two, so 3 full seconds of pure logo before any story
 * content is a real drop-off risk, not just a stylistic choice — the ident there is compressed to
 * a quick brand flash (see KathaayaOpeningIdent's `compact` prop) rather than removed outright, so
 * the identity is still visible without delaying the story. */
const LONGFORM_IDENT_SECONDS = 3;
const SHORT_IDENT_SECONDS = 0.6;

export const IDENT_DURATION_SECONDS = LONGFORM_IDENT_SECONDS;

export function identDurationSeconds(format?: 'SHORT' | 'LONGFORM'): number {
  return format === 'LONGFORM' ? LONGFORM_IDENT_SECONDS : SHORT_IDENT_SECONDS;
}
