import {existsSync} from 'node:fs';
import {mkdir, readFile, readdir, rm, writeFile, cp} from 'node:fs/promises';
import {join} from 'node:path';
import type {ProductionManifest} from '../pipeline/types';
import {validateProductionManifest} from '../pipeline/validate-manifest';
import {
  ProjectMetaSchema, StorySchema, ScriptSchema, CharactersSchema, MetadataSchema,
  type ProjectMeta, type Story, type Script, type Characters, type Metadata, type ProjectFormat,
} from './schemas';

export const PROJECTS_ROOT = 'projects';

export function slugify(name: string): string {
  const base = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return base || 'untitled-project';
}

export async function uniqueProjectId(name: string): Promise<string> {
  const base = slugify(name);
  let candidate = base;
  let n = 2;
  while (existsSync(join(PROJECTS_ROOT, candidate))) {
    candidate = `${base}-${n}`;
    n += 1;
  }
  return candidate;
}

function projectDir(projectId: string): string {
  return join(PROJECTS_ROOT, projectId);
}

async function readJson<T>(path: string): Promise<T | undefined> {
  if (!existsSync(path)) return undefined;
  try {
    return JSON.parse(await readFile(path, 'utf8')) as T;
  } catch {
    return undefined;
  }
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

/** A minimal, immediately-valid starter manifest — passes `validateProductionManifest` (>=5 beats,
 * >=1 character, beat durations summing to the target) as soon as a project is created, so a brand
 * new project is real/runnable rather than a placeholder that fails validation until hand-edited. */
export function starterManifest(projectId: string, name: string, targetDurationSeconds: number): ProductionManifest {
  const beatCount = 5;
  const each = Math.round((targetDurationSeconds / beatCount) * 100) / 100;
  const beats = Array.from({length: beatCount}).map((_, i) => {
    const isLast = i === beatCount - 1;
    const duration = isLast ? Math.round((targetDurationSeconds - each * (beatCount - 1)) * 100) / 100 : each;
    return {
      beat_id: `B0${i + 1}`,
      duration_seconds: duration,
      visual_role: ['hook', 'stakes', 'threat', 'decision', 'payoff'][i],
      asset_refs: ['character.master'],
      new_asset_required: i === 0,
      camera: 'push_in',
      animation: 'draw_reveal',
      text: '',
      narration: '',
    };
  });
  return {
    project_id: projectId,
    title: name,
    language: 'hi-IN',
    duration_seconds: targetDurationSeconds,
    characters: ['character.master'],
    beats,
  };
}

export type ProjectFiles = {
  project: ProjectMeta;
  story: Story;
  script: Script;
  manifest: ProductionManifest;
  characters: Characters;
  metadata: Metadata;
};

export type ProjectSummary = {
  project_id: string;
  name: string;
  format: ProjectFormat;
  status: string;
  duration_seconds: number;
  updated_at: string;
  latest_render: {path: string; exists: boolean} | null;
};

async function latestRenderInfo(projectId: string): Promise<ProjectSummary['latest_render']> {
  const path = join(projectDir(projectId), 'renders', `${projectId}.mp4`);
  return {path, exists: existsSync(path)};
}

export async function listProjects(): Promise<ProjectSummary[]> {
  if (!existsSync(PROJECTS_ROOT)) return [];
  const entries = await readdir(PROJECTS_ROOT, {withFileTypes: true});
  const summaries: ProjectSummary[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const project = await readJson<ProjectMeta>(join(projectDir(entry.name), 'project.json'));
    const manifest = await readJson<ProductionManifest>(join(projectDir(entry.name), 'manifest.json'));
    if (!project && !manifest) continue; // not a Studio- or pipeline-managed project directory
    summaries.push({
      project_id: entry.name,
      name: project?.name ?? manifest?.title ?? entry.name,
      format: project?.format ?? (manifest && manifest.duration_seconds > 120 ? 'LONGFORM' : 'SHORT'),
      status: project?.status ?? 'unknown',
      duration_seconds: project?.target_duration_seconds ?? manifest?.duration_seconds ?? 0,
      updated_at: project?.updated_at ?? '',
      latest_render: await latestRenderInfo(entry.name),
    });
  }
  summaries.sort((a, b) => b.updated_at.localeCompare(a.updated_at));
  return summaries;
}

export async function createProject(input: {name: string; format: ProjectFormat; language: string; target_duration_seconds: number; platform_profiles?: string[]}): Promise<ProjectFiles> {
  const projectId = await uniqueProjectId(input.name);
  const dir = projectDir(projectId);
  await Promise.all(['assets', 'audio', 'renders', 'qa'].map((sub) => mkdir(join(dir, sub), {recursive: true})));

  const now = new Date().toISOString();
  const project = ProjectMetaSchema.parse({
    project_id: projectId,
    name: input.name,
    format: input.format,
    language: input.language,
    target_duration_seconds: input.target_duration_seconds,
    platform_profiles: input.platform_profiles?.length ? input.platform_profiles : ['youtube_shorts'],
    status: 'draft',
    created_at: now,
    updated_at: now,
  });
  const story = StorySchema.parse({});
  const script = ScriptSchema.parse({});
  const characters = CharactersSchema.parse({});
  const metadata = MetadataSchema.parse({});
  const manifest = starterManifest(projectId, input.name, input.target_duration_seconds);

  await Promise.all([
    writeJson(join(dir, 'project.json'), project),
    writeJson(join(dir, 'story.json'), story),
    writeJson(join(dir, 'script.json'), script),
    writeJson(join(dir, 'characters.json'), characters),
    writeJson(join(dir, 'metadata.json'), metadata),
    writeJson(join(dir, 'manifest.json'), manifest),
  ]);

  return {project, story, script, manifest, characters, metadata};
}

export async function readProject(projectId: string): Promise<ProjectFiles | undefined> {
  const dir = projectDir(projectId);
  if (!existsSync(dir)) return undefined;
  const [project, story, script, manifest, characters, metadata] = await Promise.all([
    readJson<ProjectMeta>(join(dir, 'project.json')),
    readJson<Story>(join(dir, 'story.json')),
    readJson<Script>(join(dir, 'script.json')),
    readJson<ProductionManifest>(join(dir, 'manifest.json')),
    readJson<Characters>(join(dir, 'characters.json')),
    readJson<Metadata>(join(dir, 'metadata.json')),
  ]);
  if (!manifest) return undefined;
  return {
    project: project ?? ProjectMetaSchema.parse({
      project_id: projectId, name: manifest.title, format: manifest.duration_seconds > 120 ? 'LONGFORM' : 'SHORT',
      language: manifest.language, target_duration_seconds: manifest.duration_seconds,
      status: 'draft', created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }),
    story: story ?? StorySchema.parse({}),
    script: script ?? ScriptSchema.parse({}),
    manifest,
    characters: characters ?? CharactersSchema.parse({}),
    metadata: metadata ?? MetadataSchema.parse({}),
  };
}

const FILE_SCHEMAS = {
  'project.json': ProjectMetaSchema,
  'story.json': StorySchema,
  'script.json': ScriptSchema,
  'characters.json': CharactersSchema,
  'metadata.json': MetadataSchema,
} as const;
type WritableFileName = keyof typeof FILE_SCHEMAS;

export async function writeProjectFile(projectId: string, file: WritableFileName, value: unknown): Promise<{ok: true; value: unknown} | {ok: false; errors: string[]}> {
  const dir = projectDir(projectId);
  if (!existsSync(dir)) return {ok: false, errors: [`project not found: ${projectId}`]};
  const schema = FILE_SCHEMAS[file];
  const parsed = schema.safeParse(value);
  if (!parsed.success) return {ok: false, errors: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`)};
  const toWrite = file === 'project.json' ? {...parsed.data, updated_at: new Date().toISOString()} : parsed.data;
  await writeJson(join(dir, file), toWrite);
  return {ok: true, value: toWrite};
}

export async function writeManifestFile(projectId: string, manifest: unknown): Promise<{ok: true} | {ok: false; errors: string[]}> {
  const dir = projectDir(projectId);
  if (!existsSync(dir)) return {ok: false, errors: [`project not found: ${projectId}`]};
  if (typeof manifest !== 'object' || manifest === null) return {ok: false, errors: ['manifest must be a JSON object']};
  const errors = validateProductionManifest(manifest as ProductionManifest);
  if (errors.length) return {ok: false, errors};
  await writeJson(join(dir, 'manifest.json'), manifest);
  const touchProject = await readJson<ProjectMeta>(join(dir, 'project.json'));
  if (touchProject) await writeJson(join(dir, 'project.json'), {...touchProject, updated_at: new Date().toISOString()});
  return {ok: true};
}

export async function deleteProject(projectId: string): Promise<void> {
  const dir = projectDir(projectId);
  if (!existsSync(dir)) return;
  await rm(dir, {recursive: true, force: true});
}

export async function duplicateProject(projectId: string, newName?: string): Promise<ProjectFiles | undefined> {
  const source = await readProject(projectId);
  if (!source) return undefined;
  const name = newName?.trim() || `${source.project.name} copy`;
  const newId = await uniqueProjectId(name);
  const sourceDir = projectDir(projectId);
  const destDir = projectDir(newId);
  // Copy everything (including any already-generated assets/audio/renders) so "duplicate" is a
  // real, immediately-explorable clone, not just the six JSON files.
  await cp(sourceDir, destDir, {recursive: true});
  const now = new Date().toISOString();
  const project = {...source.project, project_id: newId, name, status: 'draft' as const, created_at: now, updated_at: now};
  const manifest = {...source.manifest, project_id: newId, title: name};
  await writeJson(join(destDir, 'project.json'), project);
  await writeJson(join(destDir, 'manifest.json'), manifest);
  return {...source, project, manifest};
}
