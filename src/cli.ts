import {readFile} from 'node:fs/promises';
import type {ProductionManifest} from './pipeline/types';
import {validateProductionManifest} from './pipeline/validate-manifest';
import {buildAssetPlan} from './pipeline/asset-plan';

async function load(file: string): Promise<ProductionManifest> {
  return JSON.parse(await readFile(file, 'utf8')) as ProductionManifest;
}

async function main() {
  const [, , command, file = 'examples/karna-short.json'] = process.argv;
  if (!command) {
    console.error('Usage: npm run validate -- <file> | npm run inspect -- <file>');
    process.exit(1);
  }
  const manifest = await load(file);
  const errors = validateProductionManifest(manifest);

  if (command === 'validate') {
    if (errors.length) {
      console.error('FAIL');
      errors.forEach((e) => console.error(`- ${e}`));
      process.exit(1);
    }
    console.log(`PASS: ${manifest.project_id}`);
    console.log(`Title: ${manifest.title}`);
    console.log(`Duration: ${manifest.duration_seconds}s`);
    console.log(`Beats: ${manifest.beats.length}`);
    console.log(`Characters: ${manifest.characters.length}`);
    console.log(`Unique assets: ${buildAssetPlan(manifest).length}`);
    return;
  }

  if (command === 'inspect') {
    console.log(JSON.stringify({
      project_id: manifest.project_id,
      title: manifest.title,
      duration_seconds: manifest.duration_seconds,
      beats: manifest.beats.length,
      unique_assets: buildAssetPlan(manifest).length,
      new_assets: manifest.beats.filter((b) => b.new_asset_required).length,
      validation: errors.length ? {status: 'FAIL', errors} : {status: 'PASS'},
    }, null, 2));
    return;
  }
  throw new Error(`Unknown command: ${command}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
