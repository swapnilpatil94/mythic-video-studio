import {existsSync} from 'node:fs';
import {mkdir} from 'node:fs/promises';
import {spawn} from 'node:child_process';

const input = process.argv[2] ?? 'examples/karna-short.json';
const output = process.argv[3] ?? 'renders/karna-short.mp4';

await mkdir('renders', {recursive: true});

const run = (cmd: string, args: string[]) => new Promise<void>((resolve, reject) => {
  const child = spawn(cmd, args, {stdio: 'inherit'});
  child.on('error', reject);
  child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`${cmd} exited with ${code}`)));
});

if (!existsSync(input)) throw new Error(`Manifest not found: ${input}`);

await run('npx', ['tsx', 'src/cli.ts', 'validate', input]);
await run('npx', ['remotion', 'render', 'src/remotion/index.ts', 'MythicShort', output]);
console.log(`DONE: ${output}`);
