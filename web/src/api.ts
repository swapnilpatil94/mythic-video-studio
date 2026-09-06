import type {ProductionManifest} from '../../src/pipeline/types';
import type {ProjectMeta, Story, Script, Characters, Metadata, ProjectFormat} from '../../src/studio/schemas';

export type {ProductionManifest, ProjectMeta, Story, Script, Characters, Metadata, ProjectFormat};

export type ProjectSummary = {
  project_id: string;
  name: string;
  format: ProjectFormat;
  status: string;
  duration_seconds: number;
  updated_at: string;
  latest_render: {path: string; exists: boolean} | null;
};

export type ProjectFiles = {
  project: ProjectMeta;
  story: Story;
  script: Script;
  manifest: ProductionManifest;
  characters: Characters;
  metadata: Metadata;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    cache: 'no-store',
    headers: {'content-type': 'application/json', ...(init?.headers ?? {})},
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : undefined;
  if (!res.ok) {
    const err = new Error((data && (data.error || JSON.stringify(data.errors))) || `request failed: ${res.status}`) as Error & {payload?: unknown};
    err.payload = data;
    throw err;
  }
  return data as T;
}

export const api = {
  listProjects: () => request<ProjectSummary[]>('/projects'),
  createProject: (input: {name: string; format: ProjectFormat; language: string; target_duration_seconds: number; platform_profiles?: string[]}) =>
    request<ProjectFiles>('/projects', {method: 'POST', body: JSON.stringify(input)}),
  getProject: (id: string) => request<ProjectFiles>(`/projects/${encodeURIComponent(id)}`),
  deleteProject: (id: string) => request<{ok: true}>(`/projects/${encodeURIComponent(id)}`, {method: 'DELETE'}),
  duplicateProject: (id: string, name?: string) => request<ProjectFiles>(`/projects/${encodeURIComponent(id)}/duplicate`, {method: 'POST', body: JSON.stringify({name})}),

  writeFile: (id: string, file: 'project.json' | 'story.json' | 'script.json' | 'characters.json' | 'metadata.json', value: unknown) =>
    request<{ok: true; value: unknown}>(`/projects/${encodeURIComponent(id)}/file/${file}`, {method: 'PUT', body: JSON.stringify(value)}),
  writeManifest: (id: string, manifest: unknown) =>
    request<{ok: true}>(`/projects/${encodeURIComponent(id)}/manifest`, {method: 'PUT', body: JSON.stringify(manifest)}),

  validateProject: (id: string) => request<{ok: boolean; errors: string[]}>(`/projects/${encodeURIComponent(id)}/validate`, {method: 'POST'}),
  preflight: (id: string) => request<{exitCode: number; stdout: string; stderr: string; report: unknown}>(`/projects/${encodeURIComponent(id)}/preflight`, {method: 'POST'}),

  startRun: (id: string, gates: Record<string, boolean>) => request<unknown>(`/projects/${encodeURIComponent(id)}/run`, {method: 'POST', body: JSON.stringify({gates})}),
  getRun: (id: string) => request<{status: string; [k: string]: unknown}>(`/projects/${encodeURIComponent(id)}/run`),
  getRunLog: async (id: string): Promise<string> => {
    const res = await fetch(`/api/projects/${encodeURIComponent(id)}/run/log`);
    return res.text();
  },

  getQa: (id: string) => request<Record<string, {path: string; exists: boolean; content?: unknown}>>(`/projects/${encodeURIComponent(id)}/qa`),
  getAssets: (id: string) => request<{assets: Array<{id: string; kind: string; status: string; relPath: string; exists: boolean; width?: number; height?: number; sha256?: string}>}>(`/projects/${encodeURIComponent(id)}/assets`),
  fileUrl: (id: string, relPath: string) => `/api/projects/${encodeURIComponent(id)}/file?path=${encodeURIComponent(relPath)}`,

  importIntoProject: (id: string, json: unknown) => request<{files: ProjectFiles; warnings: string[]}>(`/projects/${encodeURIComponent(id)}/import`, {method: 'POST', body: JSON.stringify({json})}),
  importNewProject: (json: unknown, name?: string) => request<{files: ProjectFiles; warnings: string[]}>('/projects/import', {method: 'POST', body: JSON.stringify({json, name})}),
  validateStoryPackage: (json: unknown) => request<{ok: boolean; errors?: string[]; files?: ProjectFiles; warnings?: string[]; fileErrors?: Record<string, string[]>}>('/story-package/validate', {method: 'POST', body: JSON.stringify({json})}),

  formatProfile: (duration: number) => request<Record<string, unknown>>(`/format-profiles?duration=${duration}`),
  platformProfiles: () => request<Array<Record<string, unknown>>>('/platform-profiles'),
};
