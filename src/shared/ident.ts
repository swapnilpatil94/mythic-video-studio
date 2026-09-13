/** Shared between the Remotion composition (KathaayaFeature.tsx) and the Node-side pipeline
 * (check-output.ts) so the opening-ident length is defined once — the rendered MP4 is always this
 * many seconds longer than `manifest.duration_seconds`, and any code checking the final video's
 * duration against the manifest needs to account for it. */
export const IDENT_DURATION_SECONDS = 3;
