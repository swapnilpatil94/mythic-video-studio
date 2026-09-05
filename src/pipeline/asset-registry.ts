import {readFile, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import type {AssetRecord} from './types';
import {ensureProjectPaths, fileExists, type ProjectPaths} from './paths';

export type AssetRegistryFile = {
  version: 1;
  project_id: string;
  assets: Record<string, AssetRecord>;
};

export async function loadRegistry(paths: ProjectPaths, projectId: string): Promise<AssetRegistryFile> {
  await ensureProjectPaths(paths);
  const registryPath = join(paths.assets, 'registry.json');
  if (!(await fileExists(registryPath))) {
    return {version: 1, project_id: projectId, assets: {}};
  }
  return JSON.parse(await readFile(registryPath, 'utf8')) as AssetRegistryFile;
}

export async function saveRegistry(paths: ProjectPaths, registry: AssetRegistryFile) {
  await writeFile(join(paths.assets, 'registry.json'), `${JSON.stringify(registry, null, 2)}\n`, 'utf8');
}

export async function registerAsset(paths: ProjectPaths, registry: AssetRegistryFile, asset: AssetRecord) {
  registry.assets[asset.id] = asset;
  await saveRegistry(paths, registry);
}

export async function resolveAsset(paths: ProjectPaths, registry: AssetRegistryFile, id: string): Promise<AssetRecord | undefined> {
  const asset = registry.assets[id];
  if (!asset) return undefined;
  if (asset.status === 'ready' && !(await fileExists(asset.path))) {
    asset.status = 'missing';
    await saveRegistry(paths, registry);
  }
  return asset;
}
