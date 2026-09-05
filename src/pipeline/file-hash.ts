import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';

export async function sha256File(path: string): Promise<string> {
  const hash = createHash('sha256');
  hash.update(await readFile(path));
  return hash.digest('hex');
}
