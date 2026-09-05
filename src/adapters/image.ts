import {existsSync} from 'node:fs';
import {mkdir} from 'node:fs/promises';
import {dirname} from 'node:path';
import {runCommand} from './command';

export type ImageGenerationInput = {
  assetId: string;
  prompt: string;
  outputPath: string;
  width?: number;
  height?: number;
  seed?: number;
  referencePaths?: string[];
};

export type ImageAdapterStatus = 'ready' | 'not_configured';

/**
 * Provider-neutral image contract. The adapter intentionally does not know
 * whether the local backend is FLUX, ComfyUI, Forge, or another runner.
 * A backend receives one JSON request and is responsible for creating the
 * requested file at outputPath.
 */
export interface ImageAdapter {
  readonly name: string;
  status(): Promise<ImageAdapterStatus>;
  generate(input: ImageGenerationInput): Promise<string>;
}

export function createJsonCommandImageAdapter(options: {
  name?: string;
  commandEnv?: string;
  argsEnv?: string;
} = {}): ImageAdapter {
  const name = options.name ?? 'local-image';
  const commandEnv = options.commandEnv ?? 'MYTHIC_IMAGE_COMMAND';
  const argsEnv = options.argsEnv ?? 'MYTHIC_IMAGE_ARGS';

  return {
    name,
    async status() {
      return process.env[commandEnv]?.trim() ? 'ready' : 'not_configured';
    },
    async generate(input) {
      const command = process.env[commandEnv]?.trim();
      if (!command) throw new Error(`${name} is not configured. Set ${commandEnv}.`);
      await mkdir(dirname(input.outputPath), {recursive: true});
      const configuredArgs = process.env[argsEnv]?.trim();
      const args = configuredArgs ? configuredArgs.split(/\s+/).filter(Boolean) : [];
      const result = await runCommand(command, [...args, JSON.stringify(input)]);
      if (result.code !== 0) throw new Error(`${name} failed (${result.code})\n${result.stderr || result.stdout}`);
      if (!existsSync(input.outputPath)) throw new Error(`${name} completed but did not create ${input.outputPath}`);
      return input.outputPath;
    },
  };
}
