import {existsSync} from 'node:fs';
import {mkdir, readFile, appendFile, writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {join} from 'node:path';
import {PROJECTS_ROOT} from './project-store';

export type RunStatus = 'idle' | 'running' | 'passed' | 'failed';

export type RunState = {
  status: RunStatus;
  startedAt?: string;
  endedAt?: string;
  exitCode?: number | null;
  manifestPath: string;
  outputPath: string;
  logPath: string;
  strictGates: Record<string, boolean>;
};

const runs = new Map<string, RunState>();

export const STRICT_GATES = [
  'REQUIRE_GENERATED_ASSETS', 'REQUIRE_ASSET_REQUIREMENTS', 'REQUIRE_TTS',
  'REQUIRE_AUDIO_MIX', 'REQUIRE_OUTPUT_QA', 'REQUIRE_RELEASE_EVIDENCE',
] as const;

export function getRunState(projectId: string): RunState | undefined {
  return runs.get(projectId);
}

export async function readLastLog(projectId: string): Promise<string> {
  const logPath = join(PROJECTS_ROOT, projectId, 'logs', 'studio-last-run.log');
  if (!existsSync(logPath)) return '';
  return readFile(logPath, 'utf8');
}

/**
 * Runs the existing `run.sh` for one project — the same one-command entry point documented in
 * README.md, not a parallel invocation path. `run.sh` was given a small backward-compatible
 * optional second (output path) argument so per-project renders don't collide under the pipeline's
 * default `renders/<manifest-basename>.mp4` naming (every project's manifest is named
 * `manifest.json`, so without this every project would render to the same `renders/manifest.mp4`).
 */
export function startRun(projectId: string, gateOverrides: Partial<Record<string, boolean>> = {}): RunState {
  const existing = runs.get(projectId);
  if (existing?.status === 'running') return existing;

  const projectDir = join(PROJECTS_ROOT, projectId);
  const manifestPath = join(projectDir, 'manifest.json');
  const outputPath = join(projectDir, 'renders', `${projectId}.mp4`);
  const logPath = join(projectDir, 'logs', 'studio-last-run.log');
  if (!existsSync(manifestPath)) throw new Error(`manifest.json not found for project ${projectId}`);

  const strictGates: Record<string, boolean> = {};
  for (const gate of STRICT_GATES) strictGates[gate] = gateOverrides[gate] ?? false;

  const state: RunState = {status: 'running', startedAt: new Date().toISOString(), manifestPath, outputPath, logPath, strictGates};
  runs.set(projectId, state);

  void (async () => {
    await mkdir(join(projectDir, 'logs'), {recursive: true});
    await writeFile(logPath, `[studio] run started ${state.startedAt}\n[studio] manifest=${manifestPath}\n[studio] output=${outputPath}\n\n`, 'utf8');

    const env: NodeJS.ProcessEnv = {...process.env};
    for (const gate of STRICT_GATES) env[gate] = strictGates[gate] ? '1' : '0';

    const child = spawn('bash', ['run.sh', manifestPath, outputPath], {cwd: process.cwd(), env, stdio: ['ignore', 'pipe', 'pipe']});
    const onData = (chunk: Buffer) => { void appendFile(logPath, chunk); };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.on('error', (err) => {
      state.status = 'failed';
      state.endedAt = new Date().toISOString();
      void appendFile(logPath, `\n[studio] failed to start: ${err.message}\n`);
    });
    child.on('close', (code) => {
      state.status = code === 0 ? 'passed' : 'failed';
      state.exitCode = code;
      state.endedAt = new Date().toISOString();
      void appendFile(logPath, `\n[studio] run ended ${state.endedAt} exit=${code}\n`);
    });
  })();

  return state;
}
