import {mkdir, writeFile} from 'node:fs/promises';
import {loadRegistry} from './pipeline/asset-registry';
import {buildAssetPlan} from './pipeline/asset-plan';
import {buildRequirementReport, loadManifest} from './pipeline/asset-requirements';
import {ensureProjectPaths, projectPaths} from './pipeline/paths';

const input = process.argv[2] ?? 'examples/karna-short.json';
const manifest = await loadManifest(input);
const paths = projectPaths(manifest.project_id);
await ensureProjectPaths(paths);
const registry = await loadRegistry(paths, manifest.project_id);
const report = await buildRequirementReport(manifest, buildAssetPlan(manifest), registry);
await mkdir(paths.logs, {recursive: true});
await writeFile(`${paths.logs}/asset-requirements.json`, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

for (const issue of report.issues) console.error(`[${issue.severity}] ${issue.asset_id}: ${issue.message}`);
console.log(`Asset requirement check: ${report.valid ? 'PASS' : 'FAIL'}`);
console.log(`Report: ${paths.logs}/asset-requirements.json`);
if (!report.valid && process.env.REQUIRE_ASSET_REQUIREMENTS === '1') process.exit(1);
