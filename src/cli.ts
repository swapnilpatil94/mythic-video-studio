import {readFile} from 'node:fs/promises';

interface Beat {
  beat_id: string;
  duration_seconds: number;
  visual_role: string;
  asset_refs: string[];
  new_asset_required?: boolean;
  camera?: string;
  animation?: string;
  text?: string;
}

interface Manifest {
  project_id: string;
  title: string;
  language: 'hi-IN';
  duration_seconds: number;
  characters: string[];
  beats: Beat[];
}

export function validateManifest(m: Manifest): string[] {
  const errors: string[] = [];
  if (!m.project_id) errors.push('project_id is required');
  if (!m.title) errors.push('title is required');
  if (m.language !== 'hi-IN') errors.push('language must be hi-IN');
  if (m.duration_seconds < 45 || m.duration_seconds > 120) errors.push('Short duration must be 45–120 seconds');
  if (!Array.isArray(m.characters) || m.characters.length === 0) errors.push('at least 1 character is required');
  if (!Array.isArray(m.beats) || m.beats.length < 5) errors.push('at least 5 beats are required');
  const sum = m.beats.reduce((n, b) => n + Number(b.duration_seconds || 0), 0);
  if (Math.abs(sum - m.duration_seconds) > 0.5) errors.push(`beat duration sum ${sum.toFixed(1)}s must match manifest duration ${m.duration_seconds}s`);
  m.beats.forEach((b, i) => {
    if (!b.beat_id) errors.push(`beat[${i}] missing beat_id`);
    if (!(b.duration_seconds > 0)) errors.push(`beat[${i}] duration must be > 0`);
    if (!b.visual_role) errors.push(`beat[${i}] missing visual_role`);
    if (!Array.isArray(b.asset_refs)) errors.push(`beat[${i}] asset_refs must be an array`);
  });
  return errors;
}

async function main() {
  const [, , command, file] = process.argv;
  if (!command || !file) {
    console.error('Usage: npm run validate -- <file> | npm run inspect -- <file>');
    process.exit(1);
  }
  const manifest = JSON.parse(await readFile(file, 'utf8')) as Manifest;
  const errors = validateManifest(manifest);
  if (command === 'validate') {
    if (errors.length) {
      console.error('FAIL');
      errors.forEach(e => console.error(`- ${e}`));
      process.exit(1);
    }
    console.log(`PASS: ${manifest.project_id}`);
    console.log(`Title: ${manifest.title}`);
    console.log(`Duration: ${manifest.duration_seconds}s`);
    console.log(`Beats: ${manifest.beats.length}`);
    console.log(`Characters: ${manifest.characters.length}`);
    return;
  }
  if (command === 'inspect') {
    console.log(JSON.stringify({
      project_id: manifest.project_id,
      title: manifest.title,
      duration_seconds: manifest.duration_seconds,
      beats: manifest.beats.length,
      new_assets: manifest.beats.filter(b => b.new_asset_required).length,
      validation: errors.length ? {status: 'FAIL', errors} : {status: 'PASS'}
    }, null, 2));
    return;
  }
  throw new Error(`Unknown command: ${command}`);
}

main().catch(err => {console.error(err); process.exit(1);});
