import {mkdir, access} from 'node:fs/promises';
import {join, resolve} from 'node:path';

export type ProjectPaths = {
  root: string;
  assets: string;
  characters: string;
  environments: string;
  props: string;
  audio: string;
  renders: string;
  logs: string;
};

export function projectPaths(projectId: string): ProjectPaths {
  const root = resolve('projects', projectId);
  return {
    root,
    assets: join(root, 'assets'),
    characters: join(root, 'assets', 'characters'),
    environments: join(root, 'assets', 'environments'),
    props: join(root, 'assets', 'props'),
    audio: join(root, 'audio'),
    renders: join(root, 'renders'),
    logs: join(root, 'logs'),
  };
}

export async function ensureProjectPaths(paths: ProjectPaths) {
  await Promise.all(Object.values(paths).map((dir) => mkdir(dir, {recursive: true})));
}

export async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
