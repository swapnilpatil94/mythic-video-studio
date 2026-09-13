import React, {useMemo} from 'react';
import {AbsoluteFill, Audio, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {runtimeAssets} from './runtime-assets';
import {runtimeAudio} from './runtime-audio';
import {runtimeCaptions} from './runtime-captions';
import {brandLogoAvailable} from './runtime-brand';
import {InkConstructionOverlay} from './InkConstructionOverlay';
import {subjectRelativeConstruction, type ConstructionRegion} from './artwork-construction';
import {CutoutPuppet} from './CutoutPuppet';
import {PUPPET_REGIONS} from './puppet-regions';
import {KathayaCinematic} from './KathayaCinematic';
import {AtmosphereParticles, type ParticleVariant} from './AtmosphereParticles';
import {cameraMotion, parallaxOffset, revealProgress, entranceExitOpacity, entranceExitShiftY, type MotionFrame} from './motion';
import {keywordFor, importantWordFor, subShotSequence, type ShotPreset} from './shots';
import {profileFor, type FormatProfile} from './format';
import {platformProfile, resolveSubtitleCenterY} from '../shared/platform-profiles';
import {BRAND_NAME, BRAND_TAGLINE, BRAND_LOGO_PATH} from '../shared/brand';

const DEFAULT_PLATFORM = 'youtube_shorts';
const INK = '#171510';
const CREAM = '#F4E8CF';
const GOLD = '#B8872D';
const RED = '#8E2F24';
const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

type Psychology = {tension_level?: number; emotional_level?: number; pattern_interrupt?: boolean};
type ManifestBeat = {beat_id: string; duration_seconds: number; visual_role: string; asset_refs: string[]; camera?: string; animation?: string; text?: string; narration?: string; psychology?: Psychology};
type Manifest = {title: string; duration_seconds: number; platform?: string; format?: 'SHORT' | 'LONGFORM'; asset_kinds?: Record<string, string>; beats: ManifestBeat[]};
type Beat = ManifestBeat & {start: number; end: number; label: string};
type Direction = {x: number; y: number};
type CaptionWord = {word: string; start: number; end: number; score: number};

const labelForRole = (role: string) => role.replaceAll('_', ' ').toUpperCase();

/** Which atmosphere reads right for a beat's dramatic function — danger/tension gets embers, a
 * reveal/payoff gets sparkle, a quiet establishing/context beat gets mist, everything else gets a
 * neutral dust so even beats with no specific match still get some depth rather than a flat scene.
 * Keyed on `visual_role`/`scene_role` substrings so it works across different stories' own beat
 * vocabularies without a hardcoded per-story lookup table. */
function particleVariantForRole(role: string): ParticleVariant {
  const r = role.toLowerCase();
  if (/threat|stakes|sacrifice|danger|poison|panic|urgency|escalat/.test(r)) return 'ember';
  if (/reveal|climax|payoff|wonder|micro.?payoff/.test(r)) return 'sparkle';
  if (/hook|context|backstory|decision|curiosity|resolve|held/.test(r)) return 'dust';
  return 'mist';
}

function primaryCharacterRef(beat: Beat, assetKinds?: Record<string, string>) {
  return beat.asset_refs.find((ref) => assetKinds?.[ref] === 'character' || /character|\.master/i.test(ref) || /karna|indra/i.test(ref));
}

/**
 * Cut count used to come from `shots.length` alone (2-4 curated presets) split evenly across
 * whatever the beat's duration happened to be — fine for a 6s short beat, but a 40s longform beat
 * then held each shot for 15-20s, which is exactly the "still and boring" problem: the psychology
 * model already specifies a target visual-change cadence per format (`visualBeatRange` in
 * psychology.ts — 2-5s for LONGFORM, 0.5-2s for SHORT) but nothing actually read it to decide how
 * many cuts a beat should have. `targetCutSeconds` (the midpoint of that range) now drives the real
 * cut count; when a beat needs more cuts than there are curated presets, the sequence cycles back
 * through them with a small incremental focus/zoom jitter per cycle (`cycle`-based, deterministic)
 * so a repeated preset reads as a different angle on the same master art, not an identical repeat.
 */
function activeSubShot(shots: ShotPreset[], progress: number, beatDurationSeconds: number, targetCutSeconds: number) {
  const desiredCount = Math.max(shots.length, Math.round(beatDurationSeconds / Math.max(0.1, targetCutSeconds)));
  const count = Math.max(1, desiredCount);
  const segDur = 1 / count;
  const index = Math.min(count - 1, Math.floor(progress / segDur));
  const segLocal = clamp01((progress - index * segDur) / segDur);
  const cycle = Math.floor(index / shots.length);
  const base = shots[index % shots.length];
  const jitterSign = cycle % 2 === 0 ? 1 : -1;
  const jitterSteps = Math.min(cycle, 3);
  const shot: ShotPreset = cycle === 0 ? base : {
    ...base,
    focusX: Math.max(20, Math.min(80, base.focusX + jitterSteps * 5 * jitterSign)),
    focusY: Math.max(12, Math.min(68, base.focusY + jitterSteps * 3 * -jitterSign)),
    zoom: Math.min(1.78, base.zoom + jitterSteps * 0.04 * jitterSign),
  };
  return {shot, index, segLocal, segDur};
}

function cutSnapZoom(segLocal: number) {
  return interpolate(segLocal, [0, 0.18], [1.06, 1], {extrapolateRight: 'clamp'});
}

/** Environment establishing shots (`environment ? ... : null` in GeneratedArtwork) had NO sub-shot
 * cutting at all — a single fixed zoom/focus held for the entire beat, so an environment-only beat
 * (no character in frame) was one static crop for its whole 15-45s LONGFORM duration regardless of
 * `activeSubShot`'s fix above, since that function was only ever wired into the character layers.
 * This is a parallel cycle sized the same way (beat duration / target cut seconds), through
 * environment-appropriate framing (wide/push/pan variety, not face/hand framing) rather than
 * character shot presets. */
const ENV_SHOT_CYCLE: Array<{zoomMul: number; focusX: number; focusY: number}> = [
  {zoomMul: 1.0, focusX: 50, focusY: 48},
  {zoomMul: 1.28, focusX: 32, focusY: 40},
  {zoomMul: 1.32, focusX: 68, focusY: 55},
  {zoomMul: 1.15, focusX: 50, focusY: 62},
];

function environmentSubShot(progress: number, beatDurationSeconds: number, targetCutSeconds: number) {
  const count = Math.max(1, Math.round(beatDurationSeconds / Math.max(0.1, targetCutSeconds)));
  const segDur = 1 / count;
  const index = Math.min(count - 1, Math.floor(progress / segDur));
  const segLocal = clamp01((progress - index * segDur) / segDur);
  const shot = ENV_SHOT_CYCLE[index % ENV_SHOT_CYCLE.length];
  return {shot, index, segLocal, segDur};
}

function cutFlashOpacity(segLocal: number, index: number) {
  if (index === 0) return 1;
  return interpolate(segLocal, [0, 0.05, 0.12], [0.3, 1, 1], {extrapolateRight: 'clamp'});
}

function FramedLayer({src, zoom, focusY, focusX = 50, camera, depth, progress, direction, reveal, opacity = 1, shiftY = 0, box, fit = 'cover', cameraWeight = 0.35, sway = 0, swayX = 28, swayY = 30, idleScale = 1, seed = 'layer', showPen = false, constructionRegions, puppetRef}: {
  src: string; zoom: number; focusY: number; focusX?: number; camera: MotionFrame; depth: number; progress: number; direction: Direction; reveal?: number; opacity?: number; shiftY?: number; box?: React.CSSProperties; fit?: 'cover' | 'contain'; cameraWeight?: number; sway?: number; swayX?: number; swayY?: number; idleScale?: number; seed?: string; showPen?: boolean; constructionRegions?: ConstructionRegion[]; puppetRef?: string;
}) {
  const offset = parallaxOffset(depth, progress, direction);
  const idlePhase = focusY * 0.11 + depth * 2.4;
  const idleAmp = (3 + depth * 6) * idleScale;
  const idleX = Math.sin(progress * Math.PI * 2 * 1.3 + idlePhase) * idleAmp * 0.5;
  const idleY = Math.sin(progress * Math.PI * 2 * 0.9 + idlePhase * 1.4) * idleAmp;
  const effectiveZoom = zoom * (1 + progress * 0.05) * (1 + (camera.scale - 1) * cameraWeight);
  const swayDeg = sway > 0 ? Math.sin(progress * Math.PI * 2 * 0.6 + idlePhase * 0.8) * sway : 0;

  const hasConstruction = reveal !== undefined && Boolean(constructionRegions?.length);
  const drawing = hasConstruction ? clamp01(reveal as number) : 0;
  const wash = hasConstruction ? (drawing <= 0.42 ? 0 : clamp01((drawing - 0.42) / 0.58)) : 1;
  const masterOpacity = hasConstruction ? wash : 1;
  const masterFilter = hasConstruction ? `grayscale(${1 - wash}) saturate(${0.18 + wash * 0.82}) contrast(${1.04 + (1 - wash) * 0.08})` : undefined;

  // Only refs with hand-authored regions (see puppet-regions.ts) get real per-part motion — a
  // whole-image <Img> with the existing camera pan/zoom/sway remains the fallback for everything
  // else, unchanged from before. Also fall back to <Img> during an active construction-drawing
  // reveal: InkConstructionOverlay traces stroke geometry off a real <img> DOM element found by
  // `parent.querySelector('img')`, and CutoutPuppet renders an SVG <image> instead — swapping it in
  // during the reveal breaks that lookup outright (verified: it throws "could not find the master
  // artwork <img>" the moment a reveal beat tries to use both together). The puppet warp only ever
  // applies to a character's later, already-drawn appearances, never its hand-drawn introduction.
  const puppet = puppetRef && !hasConstruction ? PUPPET_REGIONS[puppetRef] : undefined;

  const transform = `translate(${idleX}px, ${shiftY + idleY}px) translate(${camera.translateX + offset.x}px, ${camera.translateY + offset.y}px) rotate(${camera.rotate}deg) scale(${effectiveZoom})`;
  const masterStyle: React.CSSProperties = {position: 'absolute', inset: 0, width: '100%', height: '100%', transform, transformOrigin: `${focusX}% ${focusY}%`, opacity: opacity * masterOpacity, filter: masterFilter};

  // "Face angle" — a slow perspective head-turn so a character reads as looking toward/away from
  // camera instead of being a flat card panned around behind it. Kept subtle (a few degrees) and
  // slow (well under one full turn per beat): flat 2D art has no back-side information, so anything
  // more aggressive would look like a card flipping rather than a head turning. Only characters get
  // this (`puppet.kind === 'character'`) — an environment has no face, and tilting one would read
  // as the ground tipping rather than anything alive. This is a SEPARATE nested transform (its own
  // wrapper div, its own transform-origin at `faceAnchor`) rather than folded into `masterStyle`
  // above — that transform's origin is the shot's framing focus point (`focusX`/`focusY`), which
  // the existing zoom/pan/rotate chain needs to keep pivoting around unchanged; reusing it for the
  // face tilt too would make zooms drift sideways whenever the head-turn phase didn't happen to
  // line up with the framing center.
  const isCharacterPuppet = puppet?.kind === 'character';
  const faceAnchor = puppet?.faceAnchor ?? {cx: focusX, cy: focusY};
  const faceTiltDeg = isCharacterPuppet ? Math.sin(progress * Math.PI * 2 * 0.32 + idlePhase * 0.7) * 6.5 : 0;
  const faceTiltStyle: React.CSSProperties = isCharacterPuppet
    ? {position: 'absolute', inset: 0, transform: `perspective(1400px) rotateY(${faceTiltDeg}deg)`, transformOrigin: `${faceAnchor.cx}% ${faceAnchor.cy}%`}
    : {position: 'absolute', inset: 0};

  const frame = useCurrentFrame();
  const {fps, width: compositionWidth, height: compositionHeight} = useVideoConfig();
  // CutoutPuppet's 'cover' fit only computes an exact crop when it knows the pixel size of the box
  // it fills (see the comment on its `boxWidth`/`boxHeight` props) — that's knowable here without
  // parsing arbitrary CSS whenever this layer is full-bleed (no `box` override), since a full-bleed
  // box is exactly the composition's own dimensions. A percentage sub-region `box` is left
  // undefined/unfixed rather than guessed at.
  const puppetBoxSize = box ? undefined : {boxWidth: compositionWidth, boxHeight: compositionHeight};

  return <div style={{position: 'absolute', inset: 0, overflow: 'hidden', ...box}}>
    <div style={{position: 'absolute', inset: 0, transform: `rotate(${swayDeg}deg)`, transformOrigin: `${swayX}% ${swayY}%`}}>
      <div style={faceTiltStyle}>
        {puppet ? (
          <CutoutPuppet
            src={src}
            regions={puppet.regions}
            naturalWidth={puppet.naturalWidth}
            naturalHeight={puppet.naturalHeight}
            fit={fit}
            focusX={focusX}
            focusY={focusY}
            progress={frame / fps}
            style={masterStyle}
            boxWidth={puppetBoxSize?.boxWidth}
            boxHeight={puppetBoxSize?.boxHeight}
          />
        ) : (
          <Img src={src} style={{...masterStyle, objectFit: fit, objectPosition: `${focusX}% ${focusY}%`}} />
        )}
      </div>
      {hasConstruction ? <InkConstructionOverlay regions={constructionRegions as ConstructionRegion[]} progress={drawing} showGuide={drawing < 0.84} /> : null}
      {showPen && hasConstruction && drawing > 0.04 && drawing < 0.88 ? <div aria-hidden style={{position: 'absolute', left: `${38 + drawing * 22}%`, top: `${18 + drawing * 64}%`, width: 10, height: 30, borderRadius: '2px 2px 8px 8px', background: INK, opacity: 0.72 * (1 - drawing * 0.55), transform: `rotate(${18 + drawing * 18}deg)`, boxShadow: '0 2px 5px rgba(23,21,16,.28)', pointerEvents: 'none'}}/> : null}
    </div>
  </div>;
}

function ShotFrameTreatment({label, opacity}: {label: string; opacity: number}) {
  if (opacity <= 0.001) return null;
  if (label.startsWith('wide') || label.startsWith('entrance')) return <div style={{position: 'absolute', inset: 0, pointerEvents: 'none', opacity}}><div style={{position: 'absolute', top: 0, left: 0, right: 0, height: '5.5%', background: INK, opacity: 0.82}}/><div style={{position: 'absolute', bottom: 0, left: 0, right: 0, height: '5.5%', background: INK, opacity: 0.82}}/></div>;
  if (label.startsWith('face') || label.startsWith('eyes')) return <div style={{position: 'absolute', inset: 0, pointerEvents: 'none', opacity, background: `radial-gradient(ellipse 78% 62% at 50% 42%, transparent 58%, ${INK} 100%)`}}/>;
  if (label.startsWith('hand') || label.includes('armor-detail')) return <div style={{position: 'absolute', inset: 0, pointerEvents: 'none', opacity}}><div style={{position: 'absolute', left: '50%', top: '46%', width: 920, height: 920, transform: 'translate(-50%, -50%)', borderRadius: '50%', border: `3px solid ${GOLD}`, boxShadow: '0 0 0 3000px rgba(23,21,16,0.5)'}}/></div>;
  return null;
}

function GeneratedArtwork({beat, progress, beatIndex, format, variant, assetKinds}: {beat: Beat; progress: number; beatIndex: number; format: FormatProfile; variant: number; assetKinds?: Record<string, string>}) {
  const refs = beat.asset_refs.filter((ref) => runtimeAssets[ref]);
  if (refs.length === 0) return null;
  const kindOf = (ref: string) => assetKinds?.[ref];
  const glow = refs.find((ref) => kindOf(ref) === 'overlay' || /sun|symbol|glow/i.test(ref));
  const environment = refs.find((ref) => ref !== glow && (kindOf(ref) === 'environment' || /environment|background|battlefield|location/i.test(ref)));
  const characters = refs.filter((ref) => kindOf(ref) === 'character' || /character|\.master/i.test(ref) || /karna|indra/i.test(ref));
  const detail = refs.find((ref) => ref !== environment && ref !== glow && !characters.includes(ref));
  const camera = cameraMotion(beat.camera, progress);
  const direction: Direction = beat.camera === 'pan' ? {x: 130, y: 30} : {x: 84, y: 48};
  const shot = subShotSequence(beat.visual_role, variant)[0];
  const cameraWeight = 0.35 * format.cameraIntensity;
  const revealF = format.revealFraction;
  const envOpacity = entranceExitOpacity(progress, 0.06, 0.92);
  // The psychology model's own pacing target (2-5s/cut for LONGFORM, 0.5-2s for SHORT — see
  // psychology.ts) drives the actual cut count now, not just the curated preset array length.
  const targetCutSeconds = (format.visualBeatRange.minSeconds + format.visualBeatRange.maxSeconds) / 2;

  return <div style={{position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden'}}>
    {environment ? (() => {
      const isRiver = environment === 'ashwa_river';
      const {shot: envShot, segLocal: envSegLocal} = environmentSubShot(progress, beat.duration_seconds, targetCutSeconds);
      const baseZoom = isRiver ? 2.6 : Math.max(1.02, shot.zoom * 0.62);
      return <FramedLayer key={`${beat.beat_id}-env`} src={staticFile(runtimeAssets[environment])} zoom={baseZoom * envShot.zoomMul * cutSnapZoom(envSegLocal)} focusY={isRiver ? 92 : envShot.focusY} focusX={isRiver ? 50 : envShot.focusX} camera={camera} depth={0.16} progress={progress} direction={direction} opacity={envOpacity * 0.92} cameraWeight={cameraWeight} idleScale={format.idleAmpScale} seed={`${beat.beat_id}-env`} puppetRef={environment} />;
    })() : null}

    {glow ? <div key={`${beat.beat_id}-glow`} style={{position: 'absolute', left: '60%', top: '18%', width: 560, height: 560, transform: `translate(-50%, -50%) scale(${1 + Math.sin(progress * Math.PI * 2.4) * 0.05})`, borderRadius: '50%', background: `radial-gradient(circle, ${GOLD}cc 0%, ${GOLD}66 32%, transparent 70%)`, filter: 'blur(34px)', opacity: entranceExitOpacity(progress, 0.08, 0.9) * 0.6, mixBlendMode: 'screen'}}/> : null}

    {characters.length >= 2 ? characters.slice(0, 2).map((ref, index) => {
      const staggered = clamp01(progress - index * 0.05);
      const leftSide = (index === 0) !== (beatIndex % 2 === 1);
      const subShots = subShotSequence(beat.visual_role, variant + index);
      const {shot: subShot, index: cutIndex, segLocal, segDur} = activeSubShot(subShots, staggered, beat.duration_seconds, targetCutSeconds);
      const reveal = cutIndex === 0 ? revealProgress(staggered, Math.min(revealF, segDur * 0.85)) : undefined;
      const regions = cutIndex === 0 ? subjectRelativeConstruction({focusX: subShot.focusX, focusY: subShot.focusY}) : undefined;
      return <FramedLayer key={`${beat.beat_id}-${ref}`} src={staticFile(runtimeAssets[ref])} fit="contain" zoom={Math.min(subShot.zoom * cutSnapZoom(segLocal), 1.3)} focusY={subShot.focusY} focusX={leftSide ? 38 : 62} camera={camera} depth={0.72 - index * 0.06} progress={progress} direction={direction} reveal={reveal} opacity={entranceExitOpacity(staggered) * cutFlashOpacity(segLocal, cutIndex)} shiftY={entranceExitShiftY(staggered)} sway={1.35 * format.swayScale} swayX={30} swayY={26} cameraWeight={cameraWeight} idleScale={format.idleAmpScale} seed={`${beat.beat_id}-${ref}`} showPen={index === 0 && cutIndex === 0} constructionRegions={regions} puppetRef={ref} box={{left: leftSide ? '-8%' : '38%', width: '70%', top: '12%', bottom: '2%'}}/>;
    }) : null}

    {characters.length >= 2 ? <div style={{position: 'absolute', left: '50%', top: '7%', bottom: '7%', width: 2, background: INK, opacity: entranceExitOpacity(progress) * 0.22}}/> : null}

    {characters.length < 2 ? characters.slice(0, 1).map((ref) => {
      const fullBleed = !environment;
      const subShots = subShotSequence(beat.visual_role, variant);
      const {shot: subShot, index: cutIndex, segLocal, segDur} = activeSubShot(subShots, progress, beat.duration_seconds, targetCutSeconds);
      const reveal = cutIndex === 0 ? revealProgress(progress, Math.min(revealF, segDur * 0.85)) : undefined;
      const regions = cutIndex === 0 ? subjectRelativeConstruction({focusX: subShot.focusX, focusY: subShot.focusY}) : undefined;
      const layerOpacity = entranceExitOpacity(progress) * cutFlashOpacity(segLocal, cutIndex);
      return <React.Fragment key={`${beat.beat_id}-${ref}-frame`}><FramedLayer key={`${beat.beat_id}-${ref}`} src={staticFile(runtimeAssets[ref])} fit={fullBleed ? 'cover' : 'contain'} zoom={subShot.zoom * cutSnapZoom(segLocal)} focusY={subShot.focusY} focusX={subShot.focusX} camera={camera} depth={0.68} progress={progress} direction={direction} reveal={reveal} opacity={layerOpacity} shiftY={entranceExitShiftY(progress)} sway={2.1 * format.swayScale} swayX={28} swayY={24} cameraWeight={cameraWeight} idleScale={format.idleAmpScale} seed={`${beat.beat_id}-${ref}`} showPen={cutIndex === 0} constructionRegions={regions} puppetRef={ref} box={fullBleed ? undefined : {left: beatIndex % 2 === 1 ? '2%' : '26%', width: '72%', top: '8%', bottom: '0%'}}/><ShotFrameTreatment label={subShot.label} opacity={layerOpacity}/></React.Fragment>;
    }) : null}

    {detail ? (() => {
      const detailStart = 0.42;
      const detailLocal = clamp01((progress - detailStart) / (1 - detailStart));
      // No border/boxShadow here (a prior version drew a literal comic-panel frame — a hard black
      // outline plus an offset drop shadow — which read as a picture pasted onto the screen rather
      // than a shot in the same film as everything around it). A soft radial mask feathers this
      // inset's edges into the frame instead, so it blends the way a real camera insert would.
      return <FramedLayer key={`${beat.beat_id}-detail`} src={staticFile(runtimeAssets[detail])} fit="cover" zoom={1.35 * cutSnapZoom(detailLocal)} focusY={40} camera={camera} depth={0.5} progress={progress} direction={direction} opacity={entranceExitOpacity(detailLocal, 0.05, 0.85)} cameraWeight={cameraWeight} idleScale={format.idleAmpScale} seed={`${beat.beat_id}-detail`} box={{right: '3%', left: 'auto', width: '50%', bottom: '6%', top: 'auto', height: '52%', maskImage: 'radial-gradient(ellipse 78% 78% at 50% 50%, black 62%, transparent 100%)', WebkitMaskImage: 'radial-gradient(ellipse 78% 78% at 50% 50%, black 62%, transparent 100%)'}}/>;
    })() : null}

    {/* Depth/atmosphere layer — embers/sparkle/dust/mist keyed to the beat's dramatic role (see
       particleVariantForRole). This is the piece that made static backgrounds read as "just a
       moving window over a still picture": real foreground motion independent of the camera. */}
    <AtmosphereParticles seed={beat.beat_id} variant={particleVariantForRole(beat.visual_role)} opacity={envOpacity} />
  </div>;
}

function HandDrawnUnderline({progress, width}: {progress: number; width: number}) {
  const p = clamp01(progress);
  return <svg width={width} height={22} viewBox="0 0 300 22" style={{display: 'block', overflow: 'visible'}}><path d="M4 14 Q60 4 110 12 T220 10 Q260 8 296 15" fill="none" stroke={RED} strokeWidth="5" strokeLinecap="round" strokeDasharray="300" strokeDashoffset={300 * (1 - p)}/></svg>;
}

function KeywordFlourish({text, t, triggerAt, altSide, holdSeconds}: {text: string; t: number; triggerAt: number; altSide: boolean; holdSeconds: number}) {
  const rel = t - triggerAt;
  const opacity = interpolate(rel, [-0.05, 0.08, holdSeconds, holdSeconds + 0.6], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  if (opacity <= 0.001) return null;
  const scale = interpolate(rel, [-0.05, 0.12], [0.72, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const underlineProgress = interpolate(rel, [0.15, 0.55], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return <div style={{position: 'absolute', left: 0, right: 0, top: '15%', display: 'flex', justifyContent: altSide ? 'flex-end' : 'flex-start', padding: '0 64px', pointerEvents: 'none'}}><div style={{opacity, transform: `scale(${scale}) rotate(${altSide ? 2 : -2}deg)`, display: 'inline-flex', flexDirection: 'column', alignItems: altSide ? 'flex-end' : 'flex-start'}}><div style={{fontSize: 128, fontWeight: 800, color: INK, letterSpacing: 2, textShadow: `3px 3px 0 ${GOLD}66, 0 0 40px rgba(244,232,207,0.9)`}}>{text}</div><div style={{marginTop: -18, width: '92%'}}><HandDrawnUnderline progress={underlineProgress} width={280}/></div></div></div>;
}

function KineticCaption({words, t, importantWord, centerY}: {words: CaptionWord[]; t: number; importantWord?: CaptionWord; centerY: number}) {
  if (words.length === 0) return null;
  const beatStart = words[0].start;
  const beatEnd = words[words.length - 1].end;
  const wrapOpacity = interpolate(t, [beatStart - 0.3, beatStart - 0.1, beatEnd + 0.15, beatEnd + 0.55], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  if (wrapOpacity <= 0.001) return null;
  const rawIdx = words.findIndex((word) => t < word.end);
  const activeIdx = rawIdx === -1 ? words.length - 1 : rawIdx;
  const visible = words.slice(Math.max(0, activeIdx - 1), Math.min(words.length, activeIdx + 3));
  // Adapt to how much text is actually on screen at once: a burst of short words can afford to run
  // bigger for impact, while a run of long words needs to shrink so it doesn't overflow the safe
  // margins or wrap into a second line mid-sentence. 760px is the available width (1080 minus the
  // 160px side margins below); 0.6 is a rough average glyph-width-to-fontsize ratio for this bold
  // weight, tuned empirically rather than measured per-character.
  const totalChars = visible.reduce((sum, word) => sum + word.word.length, 0) || 1;
  const baseFontSize = Math.max(24, Math.min(36, 760 / (totalChars * 0.6)));
  return <div style={{position: 'absolute', left: 160, right: 160, top: centerY - 70, height: 140, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignContent: 'center', gap: '2px 10px', pointerEvents: 'none', opacity: wrapOpacity, textShadow: '0 2px 4px rgba(23,21,16,0.8)'}}>{visible.map((word) => {const upcoming = t < word.start - 0.02; const active = t >= word.start && t < word.end; const isImportant = importantWord !== undefined && word.start === importantWord.start && word.word === importantWord.word; let scale = 1; let color = CREAM; let opacity = 1; let y = 0; if (upcoming) {opacity = 0; scale = 0.55; y = 10;} else if (active) {const p = clamp01((t - word.start) / Math.max(0.05, word.end - word.start)); scale = interpolate(p, [0, 0.35, 1], [0.8, 1.24, 1.06]); color = GOLD;} else {opacity = 0.75; if (isImportant) color = '#D9A544';} return <span key={`${word.word}-${word.start}`} style={{display: 'inline-block', opacity, color, transform: `translateY(${y}px) scale(${scale})`, fontSize: isImportant ? baseFontSize * 1.19 : baseFontSize, fontWeight: 800, lineHeight: 1.2, borderBottom: isImportant && !upcoming ? `3px solid ${RED}` : 'none', paddingBottom: isImportant ? 2 : 0}}>{word.word}</span>;})}</div>;
}

function EdgeInkWipe({local}: {local: number}) {
  const progress = interpolate(local, [0, 0.14], [1, 0], {extrapolateRight: 'clamp'});
  if (progress <= 0.002) return null;
  return <g opacity={interpolate(progress, [0, 1], [0, 0.5])}><circle cx="0" cy="0" r={230 * progress} fill={INK} style={{filter: 'blur(20px)'}}/><circle cx="1080" cy="0" r={190 * progress} fill={INK} style={{filter: 'blur(20px)'}}/><circle cx="0" cy="1920" r={210 * progress} fill={INK} style={{filter: 'blur(20px)'}}/><circle cx="1080" cy="1920" r={250 * progress} fill={INK} style={{filter: 'blur(20px)'}}/></g>;
}

function BrandWatermark({t}: {t: number}) {
  if (!brandLogoAvailable) {
    const opacity = t < 1.1 ? Math.min(interpolate(t, [0, 0.25], [0, 1], {extrapolateRight: 'clamp'}), interpolate(t, [0.85, 1.1], [1, 0.4], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})) : 0.4;
    return <div style={{position: 'absolute', top: 56, right: 40, textAlign: 'right', opacity, pointerEvents: 'none'}}><div style={{fontSize: 22, fontWeight: 800, letterSpacing: 4, color: INK}}>{BRAND_NAME}</div></div>;
  }
  const opacity = interpolate(t, [1.3, 1.7], [0, 0.5], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return <div style={{position: 'absolute', top: 48, right: 40, width: 56, height: 56, borderRadius: '50%', overflow: 'hidden', opacity, pointerEvents: 'none'}}><Img src={staticFile(BRAND_LOGO_PATH)} style={{width: '100%', height: '100%', objectFit: 'cover'}}/></div>;
}

function OpeningLogoSplash({t}: {t: number}) {
  if (!brandLogoAvailable || t > 2.1) return null;
  const end = 2;
  const blackOpacity = interpolate(t, [end - 0.55, end], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const markOpacity = interpolate(t, [0, 0.3, end - 0.35, end], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const size = interpolate(t, [0.3, end], [360, 56], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const top = interpolate(t, [0.3, end], [780, 48], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const left = interpolate(t, [0.3, end], [360, 1080 - 40 - size], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return <div style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}><div style={{position: 'absolute', inset: 0, backgroundColor: '#0B0A08', opacity: blackOpacity}}/><div style={{position: 'absolute', top, left, width: size, height: size, borderRadius: '50%', overflow: 'hidden', opacity: markOpacity, boxShadow: size > 100 ? '0 0 60px rgba(184,135,45,0.35)' : 'none'}}><Img src={staticFile(BRAND_LOGO_PATH)} style={{width: '100%', height: '100%', objectFit: 'cover'}}/></div></div>;
}

function EndCard({t, totalDuration}: {t: number; totalDuration: number}) {
  const start = totalDuration - 1.6;
  const opacity = interpolate(t, [start, start + 0.5], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  if (opacity <= 0.001) return null;
  return <div style={{position: 'absolute', inset: 0, backgroundColor: CREAM, opacity, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18}}>{brandLogoAvailable ? <div style={{width: 220, height: 220, borderRadius: '50%', overflow: 'hidden', boxShadow: '0 8px 30px rgba(23,21,16,0.25)'}}><Img src={staticFile(BRAND_LOGO_PATH)} style={{width: '100%', height: '100%', objectFit: 'cover'}}/></div> : <div style={{fontSize: 84, fontWeight: 800, letterSpacing: 6, color: INK}}>{BRAND_NAME}</div>}<div style={{fontSize: 24, fontWeight: 600, letterSpacing: 3, color: GOLD, textAlign: 'center', maxWidth: 780}}>{BRAND_TAGLINE}</div></div>;
}

export const MythicShort: React.FC<{manifest: Manifest}> = ({manifest}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const format = useMemo(() => profileFor(manifest.duration_seconds), [manifest]);
  // A manifest with no explicit `platform` still needs a sensible default — and that default
  // depends on `format`, not a single global constant: a LONGFORM manifest (1920x1080) defaulting
  // to youtube_shorts' vertical safe zones would place captions and branding for the wrong canvas
  // entirely.
  const defaultPlatform = manifest.format === 'LONGFORM' ? 'youtube_longform' : DEFAULT_PLATFORM;
  const subtitleCenterY = useMemo(() => resolveSubtitleCenterY(platformProfile(manifest.platform ?? defaultPlatform)).centerY, [manifest, defaultPlatform]);
  const beats = useMemo<Beat[]>(() => { let cursor = 0; return manifest.beats.map((beat) => {const start = cursor; cursor += beat.duration_seconds; return {...beat, start, end: cursor, label: labelForRole(beat.visual_role)};}); }, [manifest]);
  const variantByBeatId = useMemo(() => { const counts: Record<string, number> = {}; const map: Record<string, number> = {}; for (const beat of beats) {const key = primaryCharacterRef(beat, manifest.asset_kinds) ?? beat.visual_role; const variant = counts[key] ?? 0; map[beat.beat_id] = variant; counts[key] = variant + 1;} return map; }, [beats, manifest.asset_kinds]);
  if (beats.length === 0) return <AbsoluteFill style={{backgroundColor: CREAM}}/>;
  const beatIndex = Math.max(0, beats.findIndex((beat) => t >= beat.start && t < beat.end));
  const beat = beats[beatIndex] ?? beats[beats.length - 1];
  const local = clamp01((t - beat.start) / Math.max(0.1, beat.end - beat.start));
  const camera = cameraMotion(beat.camera, local);
  const caption = (beat.narration ?? beat.text ?? '').trim();
  const beatWords = (runtimeCaptions as Record<string, CaptionWord[]>)[beat.beat_id] ?? [];
  const showStaticCaption = Boolean(caption && beatWords.length === 0 && beat.duration_seconds >= 6);
  const importantWord = importantWordFor(beatWords);
  const keywordText = importantWord ? importantWord.word.replace(/[।,.!?"'()]/g, '') : keywordFor(beat.visual_role);
  const keywordTriggerAt = importantWord ? importantWord.start : beat.start + beat.duration_seconds * 0.05;
  const psychology = beat.psychology;
  const variant = variantByBeatId[beat.beat_id] ?? 0;

  return <AbsoluteFill style={{backgroundColor: CREAM, fontFamily: 'Noto Sans Devanagari, Noto Sans, sans-serif', color: INK}}>
    {runtimeAudio ? <Audio src={staticFile(runtimeAudio)} volume={1}/> : null}
    <GeneratedArtwork beat={beat} progress={local} beatIndex={beatIndex} format={format} variant={variant} assetKinds={manifest.asset_kinds}/>
    <AbsoluteFill
style={{transform: `translate(${camera.translateX * 0.18}px, ${camera.translateY * 0.18}px) scale(${camera.scale * 0.985})`, transformOrigin: '50% 50%'}}
from={-150}>
      <svg width="100%" height="100%" viewBox="0 0 1080 1920"><rect width="1080" height="1920" fill={CREAM} opacity={runtimeAssets[beat.asset_refs[0]] ? 0.18 : 1}/><path d="M70 90 Q540 40 1010 90 M70 1830 Q540 1880 1010 1830" fill="none" stroke={INK} strokeWidth="4" opacity="0.25"/><EdgeInkWipe local={local}/></svg>
    </AbsoluteFill>
    {keywordText ? <KeywordFlourish text={keywordText} t={t} triggerAt={keywordTriggerAt} altSide={beatIndex % 2 === 1} holdSeconds={format.keywordHoldSeconds}/> : null}
    {beatWords.length > 0 ? <KineticCaption words={beatWords} t={t} importantWord={importantWord} centerY={subtitleCenterY}/> : null}
    {showStaticCaption ? <div style={{position: 'absolute', left: 56, right: 56, top: subtitleCenterY - 90, height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: interpolate(local, [0.1, 0.2, 0.86, 0.96], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}), textAlign: 'center'}}><div style={{display: 'inline-block', maxWidth: 940, padding: '10px 22px', borderRadius: 10, background: 'rgba(23,21,16,0.72)', fontSize: 32, lineHeight: 1.24, fontWeight: 600, color: CREAM}}>{caption}</div></div> : null}
    <KathayaCinematic progress={local} tension={psychology?.tension_level ?? 5} emotional={psychology?.emotional_level ?? 5} patternInterrupt={Boolean(psychology?.pattern_interrupt)}/>
    <BrandWatermark t={t}/>
    <EndCard t={t} totalDuration={manifest.duration_seconds}/>
    <OpeningLogoSplash t={t}/>
  </AbsoluteFill>;
};
