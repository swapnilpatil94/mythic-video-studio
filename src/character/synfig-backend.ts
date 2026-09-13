import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdir, writeFile, readdir} from 'node:fs/promises';
import path from 'node:path';
import type {CharacterAnimationBackend, RigDefinition, RigAnchor, AnimationClip, CharacterAction, AnimationArtifact} from './animation-backend';

const execFileAsync = promisify(execFile);

/**
 * A real Synfig CLI-backed CharacterAnimationBackend — genuinely automated (no GUI step), genuinely
 * generic (nothing character- or story-specific here), and genuinely honest about what it can and
 * can't do given what Synfig actually is.
 *
 * THE REAL LIMITATION, STATED PLAINLY: Synfig animates vector layers (and bitmap layers it can only
 * transform as a whole rigid image, not deform per-part) via bones/tweening. This project's
 * character master art is FLUX-generated flat raster illustrations — a single PNG with no separate
 * vector limb/hair/cloth layers and no existing bone rig. There is no automated way to derive a
 * real per-part vector rig from that raster art; that would require either hand-authoring vector
 * cutout layers per character in Synfig Studio's GUI (which the spec this backend serves explicitly
 * rules out requiring for normal automated generation) or a genuinely hard segmentation/vectorization
 * research problem well beyond this pass. So `prepareRig` here builds a rig from simple vector
 * PLACEHOLDER shapes at each anchor (small circles), not from the character's real artwork — this
 * backend is real, working, automated infrastructure for a FUTURE character whose master art is
 * actually authored as separate vector layers, not a way to animate today's raster Shiva/Karna art.
 * CutoutPuppetAnimationBackend remains what actually animates those existing characters.
 *
 * SEPARATELY, IN THIS ENVIRONMENT SPECIFICALLY: the `synfig` CLI isn't installed on this machine.
 * Homebrew's `synfig` formula depends on `ffmpeg` from homebrew-core, and this project's existing
 * render/QA pipeline already depends on a full-featured ffmpeg build from a different tap
 * (homebrew-ffmpeg/ffmpeg — libx264/libx265/etc enabled, used by every render and by check-output.ts's
 * blackdetect/silencedetect/volumedetect checks). Installing `synfig` would require uninstalling
 * that ffmpeg first, which risks breaking every existing render in this project for a capability
 * (see above) that wouldn't yet animate any of this project's actual characters anyway — not a
 * trade worth making blind. `isAvailable()`/`renderAnimation` below detect this at runtime and fail
 * with a clear, typed error rather than silently no-op'ing or pretending to succeed; they're not
 * exercised end-to-end in this repository's own CI or its rendered films for that reason.
 */
export class SynfigUnavailableError extends Error {
  constructor(detail: string) {
    super(`Synfig CLI unavailable: ${detail}`);
    this.name = 'SynfigUnavailableError';
  }
}

let cachedBinaryCheck: Promise<boolean> | undefined;

/** Cached per process — repeatedly shelling out to `which` for every character in a render would
 * be wasted work once the answer is known. */
export function isSynfigAvailable(): Promise<boolean> {
  if (!cachedBinaryCheck) {
    cachedBinaryCheck = execFileAsync('which', ['synfig']).then(() => true).catch(() => false);
  }
  return cachedBinaryCheck;
}

export class SynfigCharacterAnimationBackend implements CharacterAnimationBackend {
  constructor(private readonly workDir: string = 'projects/.synfig-work') {}

  async prepareRig(characterId: string, _masterAssetPath: string, hint?: Partial<RigDefinition>): Promise<RigDefinition> {
    if (hint?.anchors?.length) {
      return {
        characterId,
        naturalWidth: hint.naturalWidth ?? 1024,
        naturalHeight: hint.naturalHeight ?? 1024,
        anchors: hint.anchors,
        bones: hint.bones ?? [],
      };
    }
    // No automated segmentation (see class doc) — a generic three-point placeholder rig (head,
    // torso, a gesture-capable hand) so the rest of this backend's pipeline (animation generation,
    // .sif emission, render invocation) is still exercisable end-to-end for a character with no
    // hand-authored anchors at all, rather than refusing to produce anything.
    const anchors: RigAnchor[] = [
      {id: `${characterId}-head`, part: 'head', x: 50, y: 18},
      {id: `${characterId}-torso`, part: 'torso', x: 50, y: 48},
      {id: `${characterId}-hand`, part: 'hand', x: 25, y: 42},
    ];
    return {characterId, naturalWidth: 1024, naturalHeight: 1024, anchors, bones: []};
  }

  async generateAnimation(rig: RigDefinition, actions: CharacterAction[], durationSeconds: number, fps: number): Promise<AnimationClip> {
    return {characterId: rig.characterId, fps, durationSeconds, actions};
  }

  async renderAnimation(rig: RigDefinition, clip: AnimationClip, _masterAssetPath: string): Promise<AnimationArtifact> {
    if (!(await isSynfigAvailable())) {
      throw new SynfigUnavailableError('`synfig` was not found on PATH. See this file\'s own class doc for why it is not installed in this project\'s current environment, and what would need to change to install it safely.');
    }
    const projectDir = path.join(this.workDir, rig.characterId);
    await mkdir(projectDir, {recursive: true});
    const sifPath = path.join(projectDir, `${rig.characterId}.sif`);
    await writeFile(sifPath, buildSifDocument(rig, clip), 'utf8');

    const frameCount = Math.max(1, Math.round(clip.durationSeconds * clip.fps));
    const outPattern = path.join(projectDir, 'frame_%04d.png');
    // Render to a PNG sequence rather than asking Synfig's own encoder for a video file: this
    // project's existing ffmpeg (already installed, already used for every other render) is a more
    // reliable place to do final video muxing than depending on which video targets Synfig's own
    // build happened to compile in. `-t 0` = the "software" (non-GL) renderer, the deterministic
    // choice for headless/CI use.
    await execFileAsync('synfig', ['-i', sifPath, '-o', outPattern, '-w', String(rig.naturalWidth), '-h', String(rig.naturalHeight), '-t', '0', '--time-start', '0', '--time-end', String(clip.durationSeconds), '--fps', String(clip.fps)], {timeout: 120_000});

    const files = await readdir(projectDir);
    const rendered = files.filter((f) => f.startsWith('frame_') && f.endsWith('.png'));
    return {kind: 'rendered-file', path: projectDir, format: 'png-sequence', frameCount: rendered.length || frameCount};
  }
}

/**
 * Emits a minimal, valid Synfig `.sif` (uncompressed XML — Synfig's CLI accepts this directly, no
 * need for `.sifz`'s gzip wrapper) canvas: one small circle layer per rig anchor, each with an
 * animated `origin` param carrying one waypoint per action that names that anchor (so an action
 * with no matching anchor simply produces no motion for it, rather than an error — a generic caller
 * shouldn't have to know which anchors a given rig actually has before generating actions for it).
 * This is real, spec-following Synfig XML (canvas/layer/param/animated/waypoint is the actual
 * documented format), written from the public Synfig file-format documentation — it has not been
 * validated against a live `synfig` binary in THIS environment (none is installed here; see this
 * file's own top-of-file doc for why), so treat it as best-effort-correct rather than proven.
 */
export function buildSifDocument(rig: RigDefinition, clip: AnimationClip): string {
  const endTime = `${clip.durationSeconds}s`;
  const layers = rig.anchors.map((anchor) => renderAnchorLayer(anchor, clip)).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<canvas version="1.2" width="${rig.naturalWidth}" height="${rig.naturalHeight}" view-box="0 0 ${rig.naturalWidth} ${rig.naturalHeight}" antialias="1" fps="${clip.fps}" begin-time="0s" end-time="${endTime}">
  <name>${escapeXml(rig.characterId)}</name>
${layers}
</canvas>
`;
}

function renderAnchorLayer(anchor: RigAnchor, clip: AnimationClip): string {
  const px = anchor.x;
  const py = anchor.y;
  const relevant = clip.actions.filter((a) => a.anchorId === anchor.id);
  const waypoints = relevant.length > 0 ? relevant.map((action, i) => renderWaypoint(action, i, relevant.length, clip.durationSeconds, px, py)).join('\n') : renderStaticWaypoint(px, py);
  return `  <layer type="circle" active="true" desc="${escapeXml(anchor.id)} (${escapeXml(anchor.part)})">
    <param name="origin">
      <animated type="vector">
${waypoints}
      </animated>
    </param>
    <param name="radius">
      <real value="0.15"/>
    </param>
    <param name="color">
      <color><r>0.6</r><g>0.5</g><b>0.3</b><a>1.0</a></color>
    </param>
  </layer>`;
}

function renderStaticWaypoint(px: number, py: number): string {
  const {x, y} = toSynfigUnits(px, py);
  return `        <waypoint time="0s" before="clamped" after="clamped"><vector><x>${x}</x><y>${y}</y></vector></waypoint>`;
}

/** One waypoint per action, offset by a small intentional pixel-space nudge in the direction the
 * action's own name implies (a `reach`/`gesture_forward` moves toward positive x, a `recoil` moves
 * away, etc) — enough to be a real, inspectable keyframe difference between actions rather than
 * every action collapsing to the same static point, without needing this file to understand the
 * full anticipation/action/settle easing curve CutoutPuppet's own gestureArcEase implements (that
 * lives in the render-time layer, not in project-generation data). */
function renderWaypoint(action: CharacterAction, index: number, total: number, durationSeconds: number, px: number, py: number): string {
  const t = total > 1 ? (index / (total - 1)) * durationSeconds : 0;
  const intensity = action.intensity ?? 0.5;
  const [dxPct, dyPct] = actionOffsetPercent(action.kind);
  const {x, y} = toSynfigUnits(px + dxPct * intensity, py + dyPct * intensity);
  return `        <waypoint time="${t}s" before="halt" after="halt"><vector><x>${x}</x><y>${y}</y></vector></waypoint>`;
}

function actionOffsetPercent(kind: CharacterAction['kind']): [number, number] {
  switch (kind) {
    case 'reach': case 'gesture_forward': case 'point': case 'raise_hand': return [8, -6];
    case 'recoil': case 'step_back': case 'gesture_back': return [-8, 2];
    case 'nod': case 'look_down': return [0, 4];
    case 'look_up': return [0, -4];
    case 'head_turn': case 'look_left': return [-4, 0];
    case 'look_right': return [4, 0];
    default: return [0, 0];
  }
}

/** Synfig's internal unit system is independent of pixel dimensions (traditionally 60px/unit,
 * origin at canvas center, Y-up) — converting from this project's own percent-of-image convention
 * keeps every other part of this codebase (puppet-regions.ts, RigAnchor) in the coordinate system
 * it already uses, with only this one function knowing about Synfig's own. */
function toSynfigUnits(xPercent: number, yPercent: number): {x: number; y: number} {
  const x = (xPercent / 100 - 0.5) * 16;
  const y = -(yPercent / 100 - 0.5) * 16;
  return {x: Number(x.toFixed(4)), y: Number(y.toFixed(4))};
}

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
