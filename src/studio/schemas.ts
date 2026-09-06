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

export const StorySchema = z.object({
  title_candidates: z.array(z.string()).default([]),
  hook: z.string().default(''),
  summary: z.string().default(''),
  source_notes: z.string().default(''),
  locations: z.array(z.string()).default([]),
  props: z.array(z.string()).default([]),
  visual_opportunities: z.array(z.string()).default([]),
  continuity_notes: z.string().default(''),
});
export type Story = z.infer<typeof StorySchema>;

export const ScriptSchema = z.object({
  narration_beats: z.array(z.object({
    beat_id: z.string(),
    text: z.string().default(''),
    narration: z.string().default(''),
  })).default([]),
  full_narration: z.string().default(''),
});
export type Script = z.infer<typeof ScriptSchema>;

// Mirrors schemas/character.schema.json (the pipeline's own character contract), wrapped in a list
// so the Studio can manage every character for a project as one file.
export const CharacterSchema = z.object({
  character_id: z.string().min(1),
  name: z.string().min(1),
  type: z.enum(['revered_mythological', 'historical', 'generic', 'creature', 'symbolic']),
  visual_rules: z.array(z.string()).default([]),
  required_poses: z.array(z.string()).default([]),
  generation_prompt: z.string().min(1),
});
export const CharactersSchema = z.object({characters: z.array(CharacterSchema).default([])});
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
  thumbnail_notes: z.string().default(''),
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
