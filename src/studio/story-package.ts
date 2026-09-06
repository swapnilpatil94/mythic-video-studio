import type {ProductionManifest} from '../pipeline/types';
import {validateProductionManifest} from '../pipeline/validate-manifest';
import {
  ProjectMetaSchema, StorySchema, ScriptSchema, CharactersSchema, MetadataSchema,
  type ProjectMeta, type Story, type Script, type Characters, type Metadata,
} from './schemas';

export type StoryPackageFiles = {
  project: ProjectMeta;
  story: Story;
  script: Script;
  manifest: ProductionManifest;
  characters: Characters;
  metadata: Metadata;
};

export type SplitResult =
  | {ok: true; files: StoryPackageFiles; warnings: string[]}
  | {ok: false; errors: string[]};

function isManifestShaped(value: unknown): value is ProductionManifest {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return Array.isArray(v.beats) && typeof v.duration_seconds === 'number';
}

/**
 * Accepts one pasted JSON blob in either of two shapes and splits it into the six project files:
 *   1. A flat manifest (the existing `examples/*.json` shape: project_id/title/duration_seconds/
 *      beats/...) — treated as `manifest.json` directly, with story/script/characters/metadata
 *      best-effort synthesized from its beats so nothing is lost.
 *   2. A nested package: `{project?, story?, script?, manifest, characters?, metadata?}` — each
 *      section is pulled out directly; only `manifest` (or enough to build one) is required.
 * Never invents narrative content — synthesis only ever copies fields that already exist in the
 * pasted JSON (a beat's own `text`/`narration`, a character id) into the new file layout.
 */
export function splitStoryPackage(raw: unknown, context: {projectId: string; fallbackName?: string}): SplitResult {
  if (typeof raw !== 'object' || raw === null) {
    return {ok: false, errors: ['Pasted content is not a JSON object.']};
  }
  const warnings: string[] = [];
  const v = raw as Record<string, unknown>;

  let manifestSource: unknown;
  let nested = false;
  if (isManifestShaped(v.manifest)) {
    manifestSource = v.manifest;
    nested = true;
  } else if (isManifestShaped(raw)) {
    manifestSource = raw;
  } else {
    return {ok: false, errors: [
      'Could not recognize this as a story package. Expected either a full manifest ' +
      '(project_id, title, language, duration_seconds, beats[]) or a package with a "manifest" section in that shape.',
    ]};
  }

  const manifestErrors = validateProductionManifest(manifestSource as ProductionManifest);
  if (manifestErrors.length) return {ok: false, errors: manifestErrors.map((e) => `manifest: ${e}`)};
  const manifest = {...(manifestSource as ProductionManifest), project_id: context.projectId};

  const now = new Date().toISOString();
  const projectRaw = nested && typeof v.project === 'object' && v.project !== null ? v.project as Record<string, unknown> : {};
  const project = ProjectMetaSchema.parse({
    project_id: context.projectId,
    name: (projectRaw.name as string) || manifest.title || context.fallbackName || context.projectId,
    format: (projectRaw.format as string) || (manifest.duration_seconds > 120 ? 'LONGFORM' : 'SHORT'),
    language: (projectRaw.language as string) || manifest.language,
    target_duration_seconds: (projectRaw.target_duration_seconds as number) || manifest.duration_seconds,
    platform_profiles: (projectRaw.platform_profiles as string[]) || ['youtube_shorts'],
    status: 'draft',
    created_at: now,
    updated_at: now,
  });

  let story: Story;
  if (nested && typeof v.story === 'object' && v.story !== null) {
    story = StorySchema.parse(v.story);
  } else {
    // Best-effort synthesis from the manifest alone: nothing invented, only reshaped.
    story = StorySchema.parse({
      hook: manifest.beats[0]?.text || manifest.beats[0]?.narration || '',
      summary: manifest.beats.map((b) => b.narration).filter(Boolean).join(' '),
    });
    if (!nested) warnings.push('No "story" section found — hook/summary were auto-derived from the manifest beats. Review and edit in the Story tab.');
  }

  let script: Script;
  if (nested && typeof v.script === 'object' && v.script !== null) {
    script = ScriptSchema.parse(v.script);
  } else {
    const narrationBeats = manifest.beats.map((b) => ({beat_id: b.beat_id, text: b.text ?? '', narration: b.narration ?? ''}));
    script = ScriptSchema.parse({
      narration_beats: narrationBeats,
      full_narration: narrationBeats.map((b) => b.narration).filter(Boolean).join(' '),
    });
  }

  let characters: Characters;
  if (nested && (Array.isArray(v.characters) || (typeof v.characters === 'object' && v.characters !== null))) {
    const list = Array.isArray(v.characters) ? v.characters : (v.characters as Record<string, unknown>).characters;
    characters = CharactersSchema.parse({characters: list ?? []});
  } else {
    characters = CharactersSchema.parse({
      characters: manifest.characters.map((id) => ({
        character_id: id,
        name: id,
        type: 'generic' as const,
        visual_rules: [],
        required_poses: [],
        generation_prompt: `TODO: describe the visual generation prompt for "${id}" (auto-created placeholder — edit in the Characters tab).`,
      })),
    });
    if (!nested && manifest.characters.length) warnings.push('No "characters" section found — placeholder character records were created from manifest.characters. Fill in generation prompts before generating assets.');
  }

  const metadata = nested && typeof v.metadata === 'object' && v.metadata !== null
    ? MetadataSchema.parse(v.metadata)
    : MetadataSchema.parse({});

  return {ok: true, warnings, files: {project, story, script, manifest, characters, metadata}};
}

export type FileValidation = Record<string, string[]>;

/** Validates each split file independently (so the UI can point at exactly which section has a
 * problem) — reuses the same per-file schemas the persistence layer enforces on write, plus the
 * pipeline's own manifest validator, so "validate" here can never pass something a save would reject. */
export function validateStoryPackageFiles(files: StoryPackageFiles): FileValidation {
  const result: FileValidation = {};
  const project = ProjectMetaSchema.safeParse(files.project);
  if (!project.success) result['project.json'] = project.error.issues.map((i) => i.message);
  const story = StorySchema.safeParse(files.story);
  if (!story.success) result['story.json'] = story.error.issues.map((i) => i.message);
  const script = ScriptSchema.safeParse(files.script);
  if (!script.success) result['script.json'] = script.error.issues.map((i) => i.message);
  const characters = CharactersSchema.safeParse(files.characters);
  if (!characters.success) result['characters.json'] = characters.error.issues.map((i) => i.message);
  const metadata = MetadataSchema.safeParse(files.metadata);
  if (!metadata.success) result['metadata.json'] = metadata.error.issues.map((i) => i.message);
  const manifestErrors = validateProductionManifest(files.manifest);
  if (manifestErrors.length) result['manifest.json'] = manifestErrors;
  return result;
}
