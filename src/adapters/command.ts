import {spawn} from 'node:child_process';

export type CommandResult = {
  code: number;
  stdout: string;
  stderr: string;
};

export function runCommand(command: string, args: string[] = [], env: NodeJS.ProcessEnv = process.env): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {env, stdio: ['ignore', 'pipe', 'pipe']});
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('error', reject);
    child.on('close', (code) => resolve({code: code ?? 1, stdout, stderr}));
  });
}

export async function runRequiredCommand(label: string, command: string, args: string[] = []): Promise<void> {
  const result = await runCommand(command, args);
  if (result.code !== 0) {
    throw new Error(`${label} failed (${result.code})\n${result.stderr || result.stdout}`);
  }
}
