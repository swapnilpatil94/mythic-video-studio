import type {ProductionManifest} from './types';

export function validateProductionManifest(m: ProductionManifest): string[] {
  const errors: string[] = [];
  if (!m.project_id?.trim()) errors.push('project_id is required');
  if (!m.title?.trim()) errors.push('title is required');
  if (m.language !== 'hi-IN') errors.push('language must be hi-IN');
  // 45-120s covers a Short; above 120s is treated as long-form (see src/remotion/format.ts's
  // `profileFor`, which already branches purely on this same duration_seconds field — no separate
  // "format" field on the manifest itself). 1200s (20min) is a generous outer bound matching the
  // product goal's "8-12 minute long-form episodes".
  if (!Number.isFinite(m.duration_seconds) || m.duration_seconds < 45 || m.duration_seconds > 1200) {
    errors.push('duration_seconds must be 45–1200 seconds (45–120s Short, up to 1200s/20min long-form)');
  }
  if (!Array.isArray(m.characters) || m.characters.length === 0) errors.push('at least one character is required');
  if (!Array.isArray(m.beats) || m.beats.length < 5) errors.push('at least 5 beats are required');

  const sum = Array.isArray(m.beats) ? m.beats.reduce((n, b) => n + Number(b.duration_seconds || 0), 0) : 0;
  if (Math.abs(sum - m.duration_seconds) > 0.01) {
    errors.push(`beat duration sum ${sum.toFixed(2)}s must equal manifest duration ${m.duration_seconds}s`);
  }

  const ids = new Set<string>();
  for (const [i, b] of (m.beats ?? []).entries()) {
    if (!b.beat_id) errors.push(`beat[${i}] missing beat_id`);
    if (ids.has(b.beat_id)) errors.push(`duplicate beat_id: ${b.beat_id}`);
    ids.add(b.beat_id);
    if (!(b.duration_seconds > 0)) errors.push(`beat[${i}] duration must be > 0`);
    if (!b.visual_role) errors.push(`beat[${i}] missing visual_role`);
    if (!Array.isArray(b.asset_refs)) errors.push(`beat[${i}] asset_refs must be an array`);
  }
  return errors;
}
