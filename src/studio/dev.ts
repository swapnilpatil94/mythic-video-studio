/** One-command Studio dev entry: `npm run studio` — spawns the API server and the Vite dev server
 * as two child processes with prefixed output, mirroring this repo's "one command" ethos without
 * adding a process-manager dependency (e.g. concurrently) for what's a ~20-line spawn wrapper. */
import {spawn} from 'node:child_process';

function run(label: string, command: string, args: string[]) {
  const child = spawn(command, args, {stdio: ['ignore', 'pipe', 'pipe']});
  const prefix = (chunk: Buffer) => {
    for (const line of chunk.toString().split('\n')) {
      if (line.trim()) console.log(`[${label}] ${line}`);
    }
  };
  child.stdout.on('data', prefix);
  child.stderr.on('data', prefix);
  child.on('close', (code) => console.log(`[${label}] exited (${code})`));
  return child;
}

console.log('== KATHAAYA Studio ==');
const api = run('api', 'npx', ['tsx', 'src/studio/server.ts']);
const web = run('web', 'npx', ['vite', '--config', 'web/vite.config.ts']);

const shutdown = () => { api.kill(); web.kill(); process.exit(0); };
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
