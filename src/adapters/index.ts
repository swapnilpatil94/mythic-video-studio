import {existsSync} from 'node:fs';
import {mkdir} from 'node:fs/promises';
import {runCommand} from './command';

export type AdapterStatus = 'ready' | 'not_configured' | 'missing_output' | 'failed';

export type LocalAdapter = {
  name: string;
  status(): Promise<AdapterStatus>;
  run(input: Record<string, unknown>): Promise<void>;
};

function configured(value: string | undefined): boolean {
  return Boolean(value && value.trim());
}

export function createCommandAdapter(name: string, commandEnv: string, argsEnv = ''): LocalAdapter {
  return {
    name,
    async status() {
      return configured(process.env[commandEnv]) ? 'ready' : 'not_configured';
    },
    async run(input) {
      const command = process.env[commandEnv];
      if (!command) return;
      const args = argsEnv ? (process.env[argsEnv] ?? '').split(' ').filter(Boolean) : [];
      const result = await runCommand(command, [...args, JSON.stringify(input)]);
      if (result.code !== 0) throw new Error(`${name} failed: ${result.stderr || result.stdout}`);
    }
  };
}

export async function ensureProjectDirs(projectId: string): Promise<string> {
  const root = `${process.env.PROJECT_DIR ?? 'projects'}/${projectId}`;
  await mkdir(`${root}/assets`, {recursive: true});
  await mkdir(`${root}/audio`, {recursive: true});
  await mkdir(`${root}/renders`, {recursive: true});
  await mkdir(`${root}/logs`, {recursive: true});
  return root;
}

export function fileReady(path: string): boolean {
  return existsSync(path);
}
