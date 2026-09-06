import {z} from 'zod';
import type {ProductionManifest} from '../pipeline/types';
import {validateProductionManifest} from '../pipeline/validate-manifest';

export const FORMAT_VALUES = ['SHORT', 'LONGFORM'] as const;
export type ProjectFormat = (typeof FORMAT_VALUES)[number];

export const ProjectMetaSchema = z.object({
  project_id: z.string().min(1),
  name: z.string().min(1),
  format: z.enum(FORMAT_VALUES),
  language: z.string().min(2).default('hi-IN'),
  target_duration_seconds: z.number().positive(),
  platform_profiles: z.array(z.string()).default(['youtube_shorts']),
  status: z.enum(['draft', 'ready', 'rendered', 'failed']).default('draft'),
  created_at: z.string(),
  updated_at: z.string(),
});
export type ProjectMeta = z.infer<typeof ProjectMetaSchema>;

// Mirrors the story-package contract's STORY section (schemas/story-package.schema.json /
// prompts/story-package.md) field for field, so a validated import round-trips losslessly.
export const StorySchema = z.object({
  title: z.string().default(''),
  hook: z.string().default(''),
  premise: z.string().default(''),
  conflict: z.string().default(''),
  reveal: z.string().default(''),
  climax: z.string().default(''),
  payoff: z.string().default(''),
  emotional_core: z.string().default(''),
  story_arc: z.string().default(''),
  facts: z.array(z.string()).default([]),
  interpretations: z.array(z.string()).default([]),
  // Reliable references, kept alongside facts/interpretations since they're the evidence for that
  // fact/interpretation split (see the mythology rule: never invent canon).
  sources: z.array(z.object({
    source: z.string().min(1),
    claim_supported: z.string().default(''),
    fact_or_interpretation: z.enum(['fact', 'interpretation']),
  })).default([]),
});
export type Story = z.infer<typeof StorySchema>;

export const ScriptSchema = z.object({
  full_narration: z.string().default(''),
  target_wpm: z.number().positive().optional(),
  beats: z.array(z.object({
    id: z.string().min(1),
    narration: z.string().default(''),
    emotion: z.string().default(''),
    pace: z.string().default(''),
    duration_seconds: z.number().positive(),
  })).default([]),
});
export type Script = z.infer<typeof ScriptSchema>;

const VIEW_HINT = z.array(z.string()).default([]);

export const CharacterSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  role: z.string().default(''),
  importance: z.enum(['primary', 'secondary', 'minor']).default('secondary'),
  visual_direction: z.string().default(''),
  required_views: VIEW_HINT,
  required_actions: VIEW_HINT,
  sacred_or_respected: z.boolean().default(false),
}).strict();
export type Character = z.infer<typeof CharacterSchema>;

export const EnvironmentSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  visual_direction: z.string().default(''),
  important_layers: VIEW_HINT,
}).strict();
export type Environment = z.infer<typeof EnvironmentSchema>;

export const PropSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  required_views: VIEW_HINT,
  required_actions: VIEW_HINT,
}).strict();
export type Prop = z.infer<typeof PropSchema>;

// One file (characters.json) holds all three "cast & asset" lists — they're small, edited
// together in the Studio's Characters tab, and none of them warrant their own project file.
export const CharactersSchema = z.object({
  characters: z.array(CharacterSchema).default([]),
  environments: z.array(EnvironmentSchema).default([]),
  props: z.array(PropSchema).default([]),
});
export type Characters = z.infer<typeof CharactersSchema>;

const PlatformMetaSchema = z.object({
  title: z.string().default(''),
  description: z.string().default(''),
  caption: z.string().default(''),
  tags: z.array(z.string()).default([]),
  hashtags: z.array(z.string()).default([]),
});
export const MetadataSchema = z.object({
  youtube_shorts: PlatformMetaSchema.partial().default({}),
  instagram_reels: PlatformMetaSchema.partial().default({}),
  thumbnail_concept: z.string().default(''),
  seo_keywords: z.array(z.string()).default([]),
});
export type Metadata = z.infer<typeof MetadataSchema>;

export type ManifestValidation = {ok: boolean; errors: string[]};

/** Structural + semantic manifest validation, reusing the pipeline's own validator (the same one
 * `npm run validate`/`check-pipeline` use) rather than a second parallel set of rules. */
export function validateManifestFile(value: unknown): ManifestValidation {
  if (typeof value !== 'object' || value === null) return {ok: false, errors: ['manifest must be a JSON object']};
  const errors = validateProductionManifest(value as ProductionManifest);
  return {ok: errors.length === 0, errors};
}

export const PROJECT_FILE_SCHEMAS = {
  'project.json': ProjectMetaSchema,
  'story.json': StorySchema,
  'script.json': ScriptSchema,
  'characters.json': CharactersSchema,
  'metadata.json': MetadataSchema,
} as const;
export type ProjectFileName = keyof typeof PROJECT_FILE_SCHEMAS | 'manifest.json';
