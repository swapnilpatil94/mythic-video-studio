/** Shared between the Remotion composition (Root.tsx's calculateMetadata, which picks the actual
 * render resolution) and the Node-side pipeline (check-output.ts, which has to know what
 * resolution to expect) so the two can never silently disagree about which orientation a given
 * manifest should render at. */
export function resolveOrientation(manifest: {format?: 'SHORT' | 'LONGFORM'; duration_seconds: number}): {width: number; height: number} {
  // Falls back to the same duration-based heuristic story-package.ts uses when splitting a story
  // package, so a manifest written before the `format` field existed still resolves to the right
  // orientation instead of silently defaulting to vertical.
  const format = manifest.format ?? (manifest.duration_seconds > 120 ? 'LONGFORM' : 'SHORT');
  return format === 'LONGFORM' ? {width: 1920, height: 1080} : {width: 1080, height: 1920};
}
