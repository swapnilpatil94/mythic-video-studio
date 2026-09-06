import {existsSync} from 'node:fs';
import {basename, extname, join} from 'node:path';

const supported = ['.png', '.jpg', '.jpeg', '.webp'];

/**
 * Resolves optional local reference art without making references mandatory.
 * Lookup order: ASSET_REFERENCE_DIR/<asset-id>.<ext>, then the project-level
 * references directory. Dots in asset IDs are preserved so filenames can map
 * directly to manifest refs (for example karna.master.png).
 */
export function resolveReferenceImage(assetId: string, projectRoot: string): string | undefined {
  const roots = [
    process.env.ASSET_REFERENCE_DIR?.trim(),
    join(projectRoot, 'references'),
  ].filter((value): value is string => Boolean(value));

  for (const root of roots) {
    for (const extension of supported) {
      const candidate = join(root, `${assetId}${extension}`);
      if (existsSync(candidate)) return candidate;
    }
    const safe = assetId.replaceAll('.', '_');
    for (const extension of supported) {
      const candidate = join(root, `${safe}${extension}`);
      if (existsSync(candidate)) return candidate;
    }
  }
  return undefined;
}

export function referenceLabel(path: string): string {
  return basename(path, extname(path));
}
