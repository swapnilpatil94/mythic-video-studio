import {createServer, type IncomingMessage, type ServerResponse} from 'node:http';
import {createReadStream, existsSync, statSync} from 'node:fs';
import {resolve, extname, join} from 'node:path';
import {
  listProjects, createProject, readProject, deleteProject, duplicateProject,
  writeProjectFile, writeManifestFile, PROJECTS_ROOT,
} from './project-store';
import {splitStoryPackage, validateStoryPackageFiles} from './story-package';
import {resolveFormatProfile, listPlatformProfiles, getPlatformProfile} from './format-profiles';
import {startRun, getRunState, readLastLog, STRICT_GATES} from './run-pipeline';
import {runCommand} from '../adapters/command';
import {validateProductionManifest} from '../pipeline/validate-manifest';
import {FORMAT_VALUES} from './schemas';

const PORT = Number(process.env.STUDIO_API_PORT ?? 4321);

function sendJson(res: ServerResponse, status: number, body: unknown) {
  const data = JSON.stringify(body, null, 2);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type',
    'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
  });
  res.end(data);
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  if (chunks.length === 0) return undefined;
  const text = Buffer.concat(chunks).toString('utf8');
  if (!text.trim()) return undefined;
  return JSON.parse(text);
}

const CONTENT_TYPES: Record<string, string> = {
  '.json': 'application/json', '.mp4': 'video/mp4', '.wav': 'audio/wav', '.mp3': 'audio/mpeg',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml',
  '.vtt': 'text/vtt', '.srt': 'text/plain', '.log': 'text/plain; charset=utf-8',
};

/** Streams a file from inside a project directory only — resolves the requested relative path and
 * refuses anything that escapes the project's own root, so this endpoint can't be used to read
 * arbitrary files elsewhere on disk. */
function serveProjectFile(res: ServerResponse, projectId: string, relPath: string) {
  const root = resolve(PROJECTS_ROOT, projectId);
  const target = resolve(root, relPath);
  if (!target.startsWith(`${root}/`) && target !== root) {
    sendJson(res, 400, {error: 'invalid path'});
    return;
  }
  if (!existsSync(target) || !statSync(target).isFile()) {
    sendJson(res, 404, {error: 'file not found', path: relPath});
    return;
  }
  const ext = extname(target).toLowerCase();
  res.writeHead(200, {'content-type': CONTENT_TYPES[ext] ?? 'application/octet-stream', 'access-control-allow-origin': '*'});
  createReadStream(target).pipe(res);
}

const WRITABLE_FILES = ['project.json', 'story.json', 'script.json', 'characters.json', 'metadata.json'] as const;

async function handle(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const path = url.pathname;
  const method = req.method ?? 'GET';

  if (method === 'OPTIONS') {
    res.writeHead(204, {'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS'});
    res.end();
    return;
  }

  try {
    if (path === '/api/health') return sendJson(res, 200, {ok: true, brand: 'KATHAAYA'});

    if (path === '/api/format-profiles' && method === 'GET') {
      const duration = Number(url.searchParams.get('duration') ?? '77');
      return sendJson(res, 200, resolveFormatProfile(duration));
    }

    if (path === '/api/platform-profiles' && method === 'GET') {
      return sendJson(res, 200, listPlatformProfiles().map((p) => getPlatformProfile(p.id)));
    }

    if (path === '/api/projects' && method === 'GET') {
      return sendJson(res, 200, await listProjects());
    }

    if (path === '/api/projects' && method === 'POST') {
      const body = (await readBody(req)) as Record<string, unknown> | undefined;
      if (!body?.name || typeof body.name !== 'string') return sendJson(res, 400, {error: 'name is required'});
      const format = body.format === 'LONGFORM' ? 'LONGFORM' : 'SHORT';
      if (body.format && !FORMAT_VALUES.includes(body.format as never)) return sendJson(res, 400, {error: `format must be one of ${FORMAT_VALUES.join('/')}`});
      const language = typeof body.language === 'string' && body.language ? body.language : 'hi-IN';
      if (language !== 'hi-IN') {
        return sendJson(res, 400, {error: 'Only hi-IN is currently supported by the production pipeline (Chatterbox Hindi voice cloning). Other languages will be rejected by the existing pipeline\'s manifest validator.'});
      }
      const defaultDuration = format === 'SHORT' ? 77 : 480;
      const target = Number(body.target_duration_seconds) || defaultDuration;
      const files = await createProject({name: body.name, format, language, target_duration_seconds: target, platform_profiles: body.platform_profiles as string[] | undefined});
      return sendJson(res, 201, files);
    }

    if (path === '/api/projects/import' && method === 'POST') {
      const body = (await readBody(req)) as {json?: unknown; name?: string} | undefined;
      if (body?.json === undefined) return sendJson(res, 400, {error: 'json is required'});
      const raw = typeof body.json === 'string' ? JSON.parse(body.json) : body.json;
      const {uniqueProjectId} = await import('./project-store');
      const rawObj = raw as Record<string, unknown>;
      const rawProject = rawObj?.project as Record<string, unknown> | undefined;
      // project_id (already meant to be a valid kebab-case slug) takes priority over project_name/
      // title, which may be Hindi/Devanagari text that slugify() would strip to nothing.
      const slugSource = body.name || rawProject?.project_id || rawProject?.project_name || rawObj?.title || 'imported-story';
      const projectId = await uniqueProjectId(String(slugSource));
      const split = splitStoryPackage(raw, {projectId});
      if (!split.ok) return sendJson(res, 422, {error: 'validation failed', errors: split.errors});
      const {mkdir} = await import('node:fs/promises');
      const dir = join(PROJECTS_ROOT, projectId);
      await Promise.all(['assets', 'audio', 'renders', 'qa', 'logs'].map((sub) => mkdir(join(dir, sub), {recursive: true})));
      const {writeFile} = await import('node:fs/promises');
      const writeJson = (name: string, value: unknown) => writeFile(join(dir, name), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
      await Promise.all([
        writeJson('project.json', split.files.project),
        writeJson('story.json', split.files.story),
        writeJson('script.json', split.files.script),
        writeJson('characters.json', split.files.characters),
        writeJson('metadata.json', split.files.metadata),
        writeJson('manifest.json', split.files.manifest),
      ]);
      return sendJson(res, 201, {files: split.files, warnings: split.warnings});
    }

    if (path === '/api/story-package/validate' && method === 'POST') {
      const body = (await readBody(req)) as {json?: unknown} | undefined;
      if (body?.json === undefined) return sendJson(res, 400, {error: 'json is required'});
      const raw = typeof body.json === 'string' ? JSON.parse(body.json) : body.json;
      const split = splitStoryPackage(raw, {projectId: 'preview'});
      if (!split.ok) return sendJson(res, 200, {ok: false, errors: split.errors});
      const perFile = validateStoryPackageFiles(split.files);
      return sendJson(res, 200, {ok: Object.keys(perFile).length === 0, files: split.files, warnings: split.warnings, fileErrors: perFile});
    }

    const projectMatch = path.match(/^\/api\/projects\/([^/]+)(\/.*)?$/);
    if (projectMatch) {
      const projectId = decodeURIComponent(projectMatch[1]);
      const sub = projectMatch[2] ?? '';

      if (sub === '' && method === 'GET') {
        const project = await readProject(projectId);
        if (!project) return sendJson(res, 404, {error: 'project not found'});
        return sendJson(res, 200, project);
      }

      if (sub === '' && method === 'DELETE') {
        await deleteProject(projectId);
        return sendJson(res, 200, {ok: true});
      }

      if (sub === '/duplicate' && method === 'POST') {
        const body = (await readBody(req)) as {name?: string} | undefined;
        const dup = await duplicateProject(projectId, body?.name);
        if (!dup) return sendJson(res, 404, {error: 'project not found'});
        return sendJson(res, 201, dup);
      }

      if (sub === '/import' && method === 'POST') {
        const body = (await readBody(req)) as {json?: unknown} | undefined;
        if (body?.json === undefined) return sendJson(res, 400, {error: 'json is required'});
        const raw = typeof body.json === 'string' ? JSON.parse(body.json) : body.json;
        const split = splitStoryPackage(raw, {projectId});
        if (!split.ok) return sendJson(res, 422, {error: 'validation failed', errors: split.errors});
        const {writeFile} = await import('node:fs/promises');
        const dir = join(PROJECTS_ROOT, projectId);
        if (!existsSync(dir)) return sendJson(res, 404, {error: 'project not found'});
        const writeJson = (name: string, value: unknown) => writeFile(join(dir, name), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
        await Promise.all([
          writeJson('project.json', split.files.project),
          writeJson('story.json', split.files.story),
          writeJson('script.json', split.files.script),
          writeJson('characters.json', split.files.characters),
          writeJson('metadata.json', split.files.metadata),
          writeJson('manifest.json', split.files.manifest),
        ]);
        return sendJson(res, 200, {files: split.files, warnings: split.warnings});
      }

      if (sub === '/manifest' && method === 'PUT') {
        const body = await readBody(req);
        const result = await writeManifestFile(projectId, body);
        if (!result.ok) return sendJson(res, 422, {error: 'validation failed', errors: result.errors});
        return sendJson(res, 200, {ok: true});
      }

      const fileMatch = sub.match(/^\/file\/(project|story|script|characters|metadata)\.json$/);
      if (fileMatch && method === 'PUT') {
        const file = `${fileMatch[1]}.json` as (typeof WRITABLE_FILES)[number];
        const body = await readBody(req);
        const result = await writeProjectFile(projectId, file, body);
        if (!result.ok) return sendJson(res, 422, {error: 'validation failed', errors: result.errors});
        return sendJson(res, 200, {ok: true, value: result.value});
      }

      if (sub === '/validate' && method === 'POST') {
        const project = await readProject(projectId);
        if (!project) return sendJson(res, 404, {error: 'project not found'});
        const errors = validateProductionManifest(project.manifest);
        return sendJson(res, 200, {ok: errors.length === 0, errors});
      }

      if (sub === '/preflight' && method === 'POST') {
        const dir = join(PROJECTS_ROOT, projectId);
        const manifestPath = join(dir, 'manifest.json');
        if (!existsSync(manifestPath)) return sendJson(res, 404, {error: 'manifest.json not found'});
        const result = await runCommand('npx', ['tsx', 'src/preflight.ts', manifestPath]);
        const reportPath = join(dir, 'logs', 'preflight-report.json');
        let report: unknown;
        if (existsSync(reportPath)) {
          const {readFile} = await import('node:fs/promises');
          try { report = JSON.parse(await readFile(reportPath, 'utf8')); } catch { /* leave undefined */ }
        }
        return sendJson(res, 200, {exitCode: result.code, stdout: result.stdout, stderr: result.stderr, report});
      }

      if (sub === '/run' && method === 'POST') {
        const body = (await readBody(req)) as {gates?: Record<string, boolean>} | undefined;
        try {
          const state = startRun(projectId, body?.gates ?? {});
          return sendJson(res, 202, state);
        } catch (err) {
          return sendJson(res, 400, {error: err instanceof Error ? err.message : String(err)});
        }
      }

      if (sub === '/run' && method === 'GET') {
        const state = getRunState(projectId);
        if (!state) return sendJson(res, 200, {status: 'idle'});
        return sendJson(res, 200, state);
      }

      if (sub === '/run/log' && method === 'GET') {
        const log = await readLastLog(projectId);
        res.writeHead(200, {'content-type': 'text/plain; charset=utf-8', 'access-control-allow-origin': '*'});
        res.end(log);
        return;
      }

      if (sub === '/assets' && method === 'GET') {
        const dir = join(PROJECTS_ROOT, projectId);
        const registryPath = join(dir, 'assets', 'registry.json');
        if (!existsSync(registryPath)) return sendJson(res, 200, {assets: []});
        const {readFile} = await import('node:fs/promises');
        const registry = JSON.parse(await readFile(registryPath, 'utf8')) as {assets: Record<string, {path: string; [k: string]: unknown}>};
        const root = resolve(dir);
        const assets = Object.values(registry.assets).map((asset) => {
          const abs = resolve(asset.path);
          const relPath = abs.startsWith(`${root}/`) ? abs.slice(root.length + 1) : asset.path;
          return {...asset, relPath, exists: existsSync(abs)};
        });
        return sendJson(res, 200, {assets});
      }

      if (sub === '/qa' && method === 'GET') {
        const dir = join(PROJECTS_ROOT, projectId);
        const candidates = {
          contact_sheet: 'qa/contact-sheet.jpg',
          visual_qa_report: 'qa/visual-qa-report.json',
          output_qa_report: 'logs/output-qa-report.json',
          release_evidence_report: 'logs/release-evidence-report.json',
          audio_report: 'logs/audio-report.json',
          preflight_report: 'logs/preflight-report.json',
        };
        const {readFile} = await import('node:fs/promises');
        const entries = await Promise.all(Object.entries(candidates).map(async ([key, rel]) => {
          const full = join(dir, rel);
          const exists = existsSync(full);
          let content: unknown;
          if (exists && rel.endsWith('.json')) {
            try { content = JSON.parse(await readFile(full, 'utf8')); } catch { /* leave undefined */ }
          }
          return [key, {path: rel, exists, content}] as const;
        }));
        return sendJson(res, 200, Object.fromEntries(entries));
      }

      const fileServeMatch = sub === '/file' && method === 'GET';
      if (fileServeMatch) {
        const rel = url.searchParams.get('path');
        if (!rel) return sendJson(res, 400, {error: 'path query param required'});
        return serveProjectFile(res, projectId, rel);
      }
    }

    sendJson(res, 404, {error: 'not found', path});
  } catch (err) {
    sendJson(res, 500, {error: err instanceof Error ? err.message : String(err)});
  }
}

const server = createServer((req, res) => { void handle(req, res); });
server.listen(PORT, () => {
  console.log(`[studio-api] listening on http://localhost:${PORT}`);
  console.log(`[studio-api] projects root: ${resolve(PROJECTS_ROOT)}`);
  console.log(`[studio-api] strict gates: ${STRICT_GATES.join(', ')}`);
});
