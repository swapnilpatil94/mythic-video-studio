import {z} from 'zod';
import type {ProductionManifest, ProductionBeat} from '../pipeline/types';
import {validateProductionManifest} from '../pipeline/validate-manifest';
import {
  ProjectMetaSchema, StorySchema, ScriptSchema, CharactersSchema, MetadataSchema,
  CharacterSchema, EnvironmentSchema, PropSchema, FORMAT_VALUES,
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

// The contract a Story Architect (ChatGPT/Claude) generates in ONE JSON object — see
// prompts/story-package.md and schemas/story-package.schema.json, which this mirrors exactly so a
// package that validates here is guaranteed to match the published schema. Field names here are
// the *authoring* names (project_name, scene_role, youtube_title, ...); `splitStoryPackage` below
// translates them into the Studio's six internal project files, which use slightly different
// internal names for consistency with the rest of the Studio (e.g. project.name, not project_name).
export const StoryPackageVisualBeatSchema = z.object({
  id: z.string().min(1),
  narration: z.string().default(''),
  scene_role: z.string().min(1),
  pace: z.string().default(''),
  shot_type: z.string().default(''),
  composition: z.string().default(''),
  visual_action: z.string().default(''),
  characters: z.array(z.string()).default([]),
  props: z.array(z.string()).default([]),
  // Not in the user-facing field list (id/narration/scene_role/pace/shot_type/composition/
  // visual_action/characters/props/camera/reveal/keyword_text/sfx/transition) but required for a
  // beat to actually resolve a backdrop through the existing asset pipeline — optional so a
  // package author can omit it for a beat with no environment change.
  environments: z.array(z.string()).default([]),
  camera: z.string().min(1),
  reveal: z.boolean().default(false),
  keyword_text: z.string().default(''),
  sfx: z.array(z.string()).default([]),
  transition: z.string().default(''),
}).strict();

export const StoryPackageSchema = z.object({
  project: z.object({
    project_id: z.string().min(1).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'project_id must be lowercase kebab-case'),
    project_name: z.string().min(1),
    format: z.enum(FORMAT_VALUES),
    language: z.string().min(2).default('hi-IN'),
    target_duration_seconds: z.number().positive(),
  }).strict(),
  story: z.object({
    title: z.string().min(1),
    hook: z.string().min(1),
    premise: z.string().default(''),
    conflict: z.string().default(''),
    reveal: z.string().default(''),
    climax: z.string().default(''),
    payoff: z.string().default(''),
    emotional_core: z.string().default(''),
    story_arc: z.string().default(''),
    facts: z.array(z.string()).default([]),
    interpretations: z.array(z.string()).default([]),
  }).strict(),
  script: z.object({
    full_narration: z.string().min(1),
    target_wpm: z.number().positive().optional(),
    beats: z.array(z.object({
      id: z.string().min(1),
      narration: z.string().min(1),
      emotion: z.string().default(''),
      pace: z.string().default(''),
      duration_seconds: z.number().positive(),
    }).strict()).min(1),
  }).strict(),
  characters: z.array(CharacterSchema).default([]),
  environments: z.array(EnvironmentSchema).default([]),
  props: z.array(PropSchema).default([]),
  visual_manifest: z.object({beats: z.array(StoryPackageVisualBeatSchema).min(1)}).strict(),
  // audio/metadata are required top-level sections (their own fields may still individually
  // default), per the story-package contract's required-field list.
  audio: z.object({
    voice_style: z.string().min(1),
    target_wpm: z.number().positive().optional(),
    music_direction: z.string().default(''),
    sfx: z.array(z.string()).default([]),
    silence_guidance: z.string().default(''),
  }).strict(),
  metadata: z.object({
    youtube_title: z.string().min(1),
    description: z.string().min(1),
    tags: z.array(z.string()).default([]),
    hashtags: z.array(z.string()).default([]),
    thumbnail_concept: z.string().default(''),
    seo_keywords: z.array(z.string()).default([]),
    social_caption: z.string().default(''),
  }).strict(),
  sources: z.array(z.object({
    source: z.string().min(1),
    claim_supported: z.string().default(''),
    fact_or_interpretation: z.enum(['fact', 'interpretation']),
  }).strict()).default([]),
}).strict();
export type StoryPackage = z.infer<typeof StoryPackageSchema>;

function zodErrors(issues: z.ZodIssue[]): string[] {
  return issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`);
}

/**
 * Validates and splits ONE story-package JSON (schemas/story-package.schema.json) into the
 * Studio's six project files. Translates the package's `visual_manifest` (visual EVENTS per beat)
 * plus `script.beats` (narration + timing per beat, joined by `id`) into `manifest.json`'s
 * `beats[]` — the same ProductionManifest the existing pipeline already consumes unmodified.
 */
export function splitStoryPackage(raw: unknown, context: {projectId?: string}): SplitResult {
  const parsed = StoryPackageSchema.safeParse(raw);
  if (!parsed.success) {
    // Fall back to accepting a flat ProductionManifest pasted directly (the same shape
    // examples/*.json uses) — a quick-import convenience distinct from the full story-package
    // contract above, kept because it's a real, already-tested path (round-trips byte-identical).
    const flat = splitFlatManifest(raw, context);
    if (flat) return flat;
    return {ok: false, errors: zodErrors(parsed.error.issues)};
  }
  const pkg = parsed.data;
  const projectId = context.projectId ?? pkg.project.project_id;
  const warnings: string[] = [];

  const scriptById = new Map(pkg.script.beats.map((b) => [b.id, b]));
  const beats: ProductionBeat[] = [];
  const beatErrors: string[] = [];
  for (const vb of pkg.visual_manifest.beats) {
    const sb = scriptById.get(vb.id);
    if (!sb) {
      beatErrors.push(`visual_manifest beat "${vb.id}" has no matching script.beats entry (joined by id) — cannot resolve its duration/narration.`);
      continue;
    }
    const assetRefs = Array.from(new Set([...vb.characters, ...vb.props, ...vb.environments]));
    beats.push({
      beat_id: vb.id,
      duration_seconds: sb.duration_seconds,
      visual_role: vb.scene_role,
      asset_refs: assetRefs,
      camera: vb.camera,
      text: vb.keyword_text || undefined,
      narration: sb.narration || vb.narration || undefined,
      sfx: vb.sfx.length ? vb.sfx : undefined,
      pace: vb.pace || undefined,
      shot_type: vb.shot_type || undefined,
      composition: vb.composition || undefined,
      visual_action: vb.visual_action || undefined,
      reveal: vb.reveal,
      keyword_text: vb.keyword_text || undefined,
      transition: vb.transition || undefined,
    });
  }
  if (beatErrors.length) return {ok: false, errors: beatErrors};
  const scriptOnlyIds = pkg.script.beats.filter((b) => !pkg.visual_manifest.beats.some((vb) => vb.id === b.id)).map((b) => b.id);
  if (scriptOnlyIds.length) warnings.push(`script.beats has entries with no matching visual_manifest beat (ignored): ${scriptOnlyIds.join(', ')}`);

  if (pkg.characters.length === 0) warnings.push('No characters were listed — asset_refs referencing character ids will have nothing to generate against.');

  const manifest: ProductionManifest = {
    project_id: projectId,
    title: pkg.story.title,
    language: pkg.project.language as 'hi-IN',
    duration_seconds: pkg.project.target_duration_seconds,
    characters: pkg.characters.map((c) => c.id),
    beats,
    audio: {
      voice_style: pkg.audio.voice_style || undefined,
      target_wpm: pkg.audio.target_wpm ?? pkg.script.target_wpm,
      music_direction: pkg.audio.music_direction || undefined,
      silence_guidance: pkg.audio.silence_guidance || undefined,
    },
  };
  const manifestErrors = validateProductionManifest(manifest);
  if (manifestErrors.length) return {ok: false, errors: manifestErrors.map((e) => `manifest: ${e}`)};

  const now = new Date().toISOString();
  const project = ProjectMetaSchema.parse({
    project_id: projectId,
    name: pkg.project.project_name,
    format: pkg.project.format,
    language: pkg.project.language,
    target_duration_seconds: pkg.project.target_duration_seconds,
    status: 'draft',
    created_at: now,
    updated_at: now,
  });

  const story = StorySchema.parse({
    title: pkg.story.title,
    hook: pkg.story.hook,
    premise: pkg.story.premise,
    conflict: pkg.story.conflict,
    reveal: pkg.story.reveal,
    climax: pkg.story.climax,
    payoff: pkg.story.payoff,
    emotional_core: pkg.story.emotional_core,
    story_arc: pkg.story.story_arc,
    facts: pkg.story.facts,
    interpretations: pkg.story.interpretations,
    sources: pkg.sources,
  });

  const script = ScriptSchema.parse({
    full_narration: pkg.script.full_narration,
    target_wpm: pkg.script.target_wpm,
    beats: pkg.script.beats,
  });

  const characters = CharactersSchema.parse({
    characters: pkg.characters,
    environments: pkg.environments,
    props: pkg.props,
  });

  const metadata = MetadataSchema.parse({
    youtube_shorts: {title: pkg.metadata.youtube_title, description: pkg.metadata.description, tags: pkg.metadata.tags},
    instagram_reels: {caption: pkg.metadata.social_caption, hashtags: pkg.metadata.hashtags},
    thumbnail_concept: pkg.metadata.thumbnail_concept,
    seo_keywords: pkg.metadata.seo_keywords,
  });

  return {ok: true, warnings, files: {project, story, script, manifest, characters, metadata}};
}

function isManifestShaped(value: unknown): value is ProductionManifest {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return Array.isArray(v.beats) && typeof v.duration_seconds === 'number' && typeof v.project_id === 'string';
}

/** Quick-import path: a flat ProductionManifest with no story/script/characters context. Synthesizes
 * the other five files best-effort from fields the manifest already has — never invents content. */
function splitFlatManifest(raw: unknown, context: {projectId?: string}): SplitResult | undefined {
  if (!isManifestShaped(raw)) return undefined;
  const manifestErrors = validateProductionManifest(raw);
  if (manifestErrors.length) return {ok: false, errors: manifestErrors.map((e) => `manifest: ${e}`)};
  const projectId = context.projectId ?? raw.project_id;
  const manifest: ProductionManifest = {...raw, project_id: projectId};
  const now = new Date().toISOString();
  const project = ProjectMetaSchema.parse({
    project_id: projectId, name: manifest.title, format: manifest.duration_seconds > 120 ? 'LONGFORM' : 'SHORT',
    language: manifest.language, target_duration_seconds: manifest.duration_seconds,
    status: 'draft', created_at: now, updated_at: now,
  });
  const story = StorySchema.parse({title: manifest.title, hook: manifest.beats[0]?.text || manifest.beats[0]?.narration || ''});
  const script = ScriptSchema.parse({
    full_narration: manifest.beats.map((b) => b.narration).filter(Boolean).join(' '),
    beats: manifest.beats.map((b) => ({id: b.beat_id, narration: b.narration ?? '', duration_seconds: b.duration_seconds})),
  });
  const characters = CharactersSchema.parse({
    characters: manifest.characters.map((id) => ({id, name: id, sacred_or_respected: false})),
  });
  const metadata = MetadataSchema.parse({});
  return {
    ok: true,
    warnings: ['Imported as a flat manifest (no story-package sections found) — story/script/characters were auto-derived from the manifest beats. Review and edit in their respective tabs.'],
    files: {project, story, script, manifest, characters, metadata},
  };
}

export type FileValidation = Record<string, string[]>;

/** Validates each split file independently (so the UI can point at exactly which section has a
 * problem) — reuses the same per-file schemas the persistence layer enforces on write, plus the
 * pipeline's own manifest validator, so "validate" here can never pass something a save would reject. */
export function validateStoryPackageFiles(files: StoryPackageFiles): FileValidation {
  const result: FileValidation = {};
  const project = ProjectMetaSchema.safeParse(files.project);
  if (!project.success) result['project.json'] = zodErrors(project.error.issues);
  const story = StorySchema.safeParse(files.story);
  if (!story.success) result['story.json'] = zodErrors(story.error.issues);
  const script = ScriptSchema.safeParse(files.script);
  if (!script.success) result['script.json'] = zodErrors(script.error.issues);
  const characters = CharactersSchema.safeParse(files.characters);
  if (!characters.success) result['characters.json'] = zodErrors(characters.error.issues);
  const metadata = MetadataSchema.safeParse(files.metadata);
  if (!metadata.success) result['metadata.json'] = zodErrors(metadata.error.issues);
  const manifestErrors = validateProductionManifest(files.manifest);
  if (manifestErrors.length) result['manifest.json'] = manifestErrors;
  return result;
}
