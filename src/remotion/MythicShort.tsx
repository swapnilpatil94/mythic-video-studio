import React, {useMemo} from 'react';
import {AbsoluteFill, Audio, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {runtimeAssets} from './runtime-assets';
import {runtimeAudio} from './runtime-audio';
import {runtimeCaptions} from './runtime-captions';
import {
  cameraMotion, drawRevealProgress, parallaxOffset, revealProgress, entranceExitOpacity, entranceExitShiftY,
  type MotionFrame,
} from './motion';
import {shotFor, keywordFor, importantWordFor, subShotSequence, type ShotPreset} from './shots';
import {profileFor, type FormatProfile} from './format';
import {platformProfile, resolveSubtitleCenterY} from '../shared/platform-profiles';
import {BRAND_NAME, BRAND_TAGLINE} from '../shared/brand';

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

// Burned-in captions live in the shared lower "storytelling zone" (see src/shared/platform-profiles.ts),
// not the frame's visual center and not jammed against the very bottom edge to dodge a platform's own
// caption/progress chrome — collision-checked against both supported platforms at module load, not just
// assumed. Both currently resolve to the same un-nudged center (no platform's chrome reaches this high),
// so a single constant is correct without threading a per-project platform choice through render props yet.
const SUBTITLE_CENTER_Y = Math.min(
  resolveSubtitleCenterY(platformProfile('youtube_shorts')).centerY,
  resolveSubtitleCenterY(platformProfile('instagram_reels')).centerY,
);

const INK = '#171510';
const CREAM = '#F4E8CF';
const GOLD = '#B8872D';
const RED = '#8E2F24';

type Manifest = {
  title: string;
  duration_seconds: number;
  beats: Array<{
    beat_id: string;
    duration_seconds: number;
    visual_role: string;
    asset_refs: string[];
    camera?: string;
    animation?: string;
    text?: string;
    narration?: string;
  }>;
};

type Beat = Manifest['beats'][number] & {start: number; end: number; label: string};
type Direction = {x: number; y: number};

function SketchSun({opacity = 1, pulseT = 0}: {opacity?: number; pulseT?: number}) {
  // Slow continuous breathing pulse on the global timeline (not beat-local) so the frame never
  // sits fully static even in a quiet mid-beat moment — a ~1.8s cycle keeps something visibly
  // changing every couple of seconds without competing with the main action.
  const pulse = 1 + Math.sin(pulseT * (Math.PI * 2) / 1.8) * 0.035;
  return <g opacity={opacity} style={{transform: `scale(${pulse})`, transformOrigin: '540px 390px'}}>
    <circle cx="540" cy="390" r="150" fill="none" stroke={GOLD} strokeWidth="10" opacity="0.5"/>
    <circle cx="540" cy="390" r="105" fill="none" stroke={GOLD} strokeWidth="5" opacity="0.35"/>
    {Array.from({length: 16}).map((_, i) => {
      const a = (Math.PI * 2 * i) / 16;
      const x1 = 540 + Math.cos(a) * 170;
      const y1 = 390 + Math.sin(a) * 170;
      const x2 = 540 + Math.cos(a) * 205;
      const y2 = 390 + Math.sin(a) * 205;
      return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={GOLD} strokeWidth="7"/>;
    })}
  </g>;
}

function KarnaFigure({progress}: {progress: number}) {
  const reveal = interpolate(progress, [0, 1], [900, 0]);
  return <g transform="translate(540 1120)">
    <g style={{clipPath: `inset(0 0 ${reveal}px 0)`}}>
      <ellipse cx="0" cy="430" rx="250" ry="35" fill={INK} opacity="0.15"/>
      <path d="M-190 390 Q-170 40 0-30 Q170 40 190 390" fill="none" stroke={INK} strokeWidth="18" strokeLinecap="round"/>
      <circle cx="0" cy="-170" r="125" fill={CREAM} stroke={INK} strokeWidth="16"/>
      <path d="M-120-220 Q0-350 120-220" fill="none" stroke={INK} strokeWidth="18"/>
      <path d="M-105-170 Q0-110 105-170" fill="none" stroke={INK} strokeWidth="12"/>
      <circle cx="-48" cy="-185" r="10" fill={INK}/><circle cx="48" cy="-185" r="10" fill={INK}/>
      <path d="M-120-70 Q0 10 120-70 L145 210 Q0 290-145 210Z" fill={GOLD} opacity="0.72" stroke={INK} strokeWidth="15"/>
      <path d="M-145 0 L-260 170 M145 0 L260 170" stroke={INK} strokeWidth="22" strokeLinecap="round"/>
      <path d="M-260 170 L-290 330 M260 170 L290 330" stroke={INK} strokeWidth="18" strokeLinecap="round"/>
      <path d="M-120 240 L-70 470 M120 240 L70 470" stroke={INK} strokeWidth="24" strokeLinecap="round"/>
      <path d="M-150 230 Q0 330 150 230" fill="none" stroke={RED} strokeWidth="16"/>
    </g>
  </g>;
}

function Visitor({progress}: {progress: number}) {
  const x = interpolate(progress, [0, 1], [1250, 700]);
  return <g transform={`translate(${x} 1220)`}>
    <circle cx="0" cy="-120" r="95" fill={CREAM} stroke={INK} strokeWidth="14"/>
    <path d="M-110-145 Q0-260 110-145" fill="none" stroke={INK} strokeWidth="16"/>
    <path d="M-125-10 Q0-100 125-10 L145 360 Q0 450-145 360Z" fill={CREAM} stroke={INK} strokeWidth="18"/>
    <path d="M-130 60 L-280 230" stroke={INK} strokeWidth="20" strokeLinecap="round"/>
    <path d="M130 60 L280 230" stroke={INK} strokeWidth="20" strokeLinecap="round"/>
    <circle cx="-275" cy="230" r="25" fill={GOLD} stroke={INK} strokeWidth="8"/>
  </g>;
}

const labelForRole = (role: string) => role.replaceAll('_', ' ').toUpperCase();

/** Real generated character art for this beat, if any (used to suppress the procedural sketch fallback). */
function realCharacterRefs(beat: Beat): string[] {
  const refs = beat.asset_refs.filter((ref) => runtimeAssets[ref]);
  return refs.filter((ref) => /character|\.master/i.test(ref) || ref.includes('karna') || ref.includes('indra'));
}

/**
 * Deterministic (seeded, not per-frame-random) pseudo-random generator — the same seed always
 * produces the same jitter sequence, so a layer's hand-torn reveal edge is stable across frames
 * instead of flickering, and reproducible run to run.
 */
function seededRandom(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(h, 31) + seed.charCodeAt(i)) | 0;
  return () => {
    h = (Math.imul(h, 1103515245) + 12345) | 0;
    return ((h >>> 0) % 10000) / 10000;
  };
}

/**
 * The actual reveal boundary as an irregular, hand-torn curve (percent space, 0-100 both axes) —
 * not a mechanically straight line. Modeled on how real sketchy-rendering tools (e.g. Rough.js)
 * build a wobbly line from a handful of randomly-offset control points rather than one clean
 * stroke; here the offsets are fixed per `seed` so the same layer always tears the same way.
 * `edgeY` (0-100) is how far down the sweep has progressed; returns points top-to-bottom.
 */
function roughBoundary(edgeY: number, seed: string, count = 6): Array<{x: number; y: number}> {
  const rand = seededRandom(seed);
  const pts: Array<{x: number; y: number}> = [];
  for (let i = 0; i <= count; i++) {
    const x = (i / count) * 100;
    const jitter = (rand() - 0.5) * 11;
    pts.push({x, y: clamp01((edgeY + jitter) / 100) * 100});
  }
  return pts;
}

function boundaryPathD(pts: Array<{x: number; y: number}>): string {
  let d = `M0,${pts[0].y.toFixed(1)} `;
  for (let i = 1; i < pts.length; i++) {
    const midX = (pts[i - 1].x + pts[i].x) / 2;
    d += `C${midX.toFixed(1)},${pts[i - 1].y.toFixed(1)} ${midX.toFixed(1)},${pts[i].y.toFixed(1)} ${pts[i].x.toFixed(1)},${pts[i].y.toFixed(1)} `;
  }
  return d;
}

function svgMaskUrl(fillPathD: string): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'><path d='${fillPathD}' fill='white'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

/**
 * Hand-draw -> ink -> gold/red wash: a two-stage reveal along a hand-torn (not mechanically
 * straight) boundary. Stage 1 (reveal 0-0.55) sweeps the rough edge down the layer while it's
 * fully desaturated and slightly soft, reading as ink linework being laid down stroke by stroke.
 * Stage 2 (0.45-1) brings color back in as the boundary finishes descending, reading as a wash
 * settling over the line art. The two stages overlap (0.45-0.55) so the wash visibly chases the
 * still-moving edge rather than waiting for it to finish, closer to how a wash bleeds into ink.
 */
function inkRevealStyle(reveal: number, seed: string): React.CSSProperties {
  const p = clamp01(reveal);
  const lineArt = clamp01(p / 0.55);
  const wash = clamp01((p - 0.45) / 0.55);
  const edgeY = interpolate(p, [0, 1], [-14, 112]);
  const pts = roughBoundary(edgeY, seed);
  const revealed = boundaryPathD(pts) + `L100,0 L0,0 Z`;
  const mask = svgMaskUrl(revealed);
  return {
    filter: `blur(${(1 - lineArt) * 5.5}px) grayscale(${1 - wash}) contrast(${1 + (1 - lineArt) * 0.12}) saturate(${0.3 + wash * 0.7})`,
    WebkitMaskImage: mask,
    maskImage: mask,
    WebkitMaskSize: '100% 100%',
    maskSize: '100% 100%',
  };
}

/** A hand-torn gold/red tinted band that visibly sweeps down a layer just behind the ink edge —
 * the "wash arriving" pass, layered as its own element so it can blend additively over the art.
 * Reuses the same seeded boundary shape as the reveal above so the wash edge and ink edge match. */
function WashSweep({reveal, seed}: {reveal: number; seed: string}) {
  const p = clamp01(reveal);
  if (p <= 0.28 || p >= 0.98) return null;
  const edgeY = interpolate(p, [0, 1], [-14, 112]);
  const leading = boundaryPathD(roughBoundary(edgeY, seed)) + `L100,0 L0,0 Z`;
  const trailing = boundaryPathD(roughBoundary(edgeY - 16, `${seed}-trail`)) + `L100,0 L0,0 Z`;
  const bandSvg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'>` +
    `<path d='${leading}' fill='white'/><path d='${trailing}' fill='black'/></svg>`;
  const mask = `url("data:image/svg+xml,${encodeURIComponent(bandSvg)}")`;
  return <div style={{
    position: 'absolute', inset: 0,
    background: `linear-gradient(165deg, transparent 40%, ${GOLD}55 60%, ${RED}40 75%, transparent 92%)`,
    WebkitMaskImage: mask, maskImage: mask, WebkitMaskSize: '100% 100%', maskSize: '100% 100%',
    mixBlendMode: 'color-burn', opacity: 0.55,
    pointerEvents: 'none',
  }}/>;
}

/**
 * A small ink pen/nib that traces the leading edge of the reveal boundary as it descends — the
 * single element every real whiteboard/hand-draw tool has (a moving pointer/cursor: see
 * excalidraw-animate's `animatePointer`, OpenDoodler's hand-cursor skins) that a mask-wipe alone
 * can never provide, because without something visibly *doing* the drawing, a reveal reads as the
 * camera uncovering an already-finished picture rather than art being made. Deliberately minimal
 * (a nib + a short holder line, no cartoon hand/arm) so it reads as a restrained ink-pen accent,
 * not a Doodly-style presenter hand next to dignified mythology artwork.
 */
function ArtistPen({reveal, seed}: {reveal: number; seed: string}) {
  const p = clamp01(reveal);
  const opacity = interpolate(p, [0.03, 0.1, 0.82, 0.95], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  if (opacity <= 0.001) return null;
  const edgeY = interpolate(p, [0, 1], [-14, 112]);
  const pts = roughBoundary(edgeY, seed);
  const mid = pts[Math.floor(pts.length / 2)];
  const prev = pts[Math.floor(pts.length / 2) - 1] ?? mid;
  const angle = Math.atan2(mid.y - prev.y, mid.x - prev.x) * (180 / Math.PI) + 90;
  return <div style={{
    position: 'absolute', left: `${mid.x}%`, top: `${mid.y}%`, opacity,
    transform: `translate(-50%, -68%) rotate(${angle}deg)`,
    pointerEvents: 'none', filter: 'drop-shadow(0 2px 3px rgba(23,21,16,0.5))',
  }}>
    <svg width="30" height="46" viewBox="0 0 30 46">
      <path d="M15 2 L21 30 L15 44 L9 30 Z" fill={INK}/>
      <path d="M15 2 L18 24 L15 30 L12 24 Z" fill={GOLD}/>
      <circle cx="15" cy="30" r="2.6" fill={RED}/>
    </svg>
  </div>;
}

/**
 * Reusable "framed shot" primitive: crops a full-body master asset into a specific region
 * (face/chest/hands/wide, per shots.ts) via cover-fit + zoom + focus point, inside its own
 * clipping box, with parallax, entrance/exit and ink-reveal all driven by beat-local progress.
 *
 * `zoom` is the shot's own framing scale; the camera preset's scale is blended in at reduced
 * weight (not multiplied) so a tight shot (e.g. sacrifice's hand/armor crop) combined with a
 * push-in camera preset can't compound into an extreme zoom that lands outside the character's
 * visible art (which reads as "nothing rendered").
 */
function FramedLayer({
  src, zoom, focusY, focusX = 50, camera, depth, progress, direction, reveal, opacity = 1, shiftY = 0, blend, box,
  fit = 'cover', cameraWeight = 0.35, sway = 0, swayX = 28, swayY = 30, idleScale = 1, seed = 'layer', showPen = false,
}: {
  src: string;
  zoom: number;
  focusY: number;
  focusX?: number;
  camera: MotionFrame;
  depth: number;
  progress: number;
  direction: Direction;
  reveal?: number;
  opacity?: number;
  shiftY?: number;
  blend?: React.CSSProperties['mixBlendMode'];
  box?: React.CSSProperties;
  fit?: 'cover' | 'contain';
  cameraWeight?: number;
  /** Degrees of a slow rotation pivoted near a raised hand/weapon (swayX/swayY, % of the layer),
   * simulating limb/weapon movement on a flat raster asset without any per-shot image generation:
   * because the pivot sits near the hand rather than the image center, the same small rotation
   * barely moves the torso but sweeps the far-away weapon tip through a visible arc. 0 disables it. */
  sway?: number;
  swayX?: number;
  swayY?: number;
  /** Format-profile multiplier on the idle/breathing drift amplitude (long-form wants gentler
   * continuous motion sustained over many minutes than a fast-cut Short). */
  idleScale?: number;
  /** Stable per-layer key for the hand-torn reveal boundary's jitter (see roughBoundary) — pass
   * the same value used as this element's React `key` so the tear shape is deterministic. */
  seed?: string;
  /** Show the tracing ink-pen accent for this layer's reveal (only the "hero" layer per beat
   * should show one — showing it on every layer at once would be visual clutter). */
  showPen?: boolean;
}) {
  const revealStyle = reveal === undefined ? {} : inkRevealStyle(reveal, seed);
  const offset = parallaxOffset(depth, progress, direction);
  // Small continuous sinusoidal drift ("breathing") so a layer never sits perfectly still even
  // mid-beat, between entrance and exit — depth-weighted like the parallax so foreground layers
  // move a little more than background ones. Phase is derived from focusY so different layers in
  // the same beat don't drift in lockstep.
  const idlePhase = focusY * 0.11 + depth * 2.4;
  const idleAmp = (3 + depth * 6) * idleScale;
  const idleX = Math.sin(progress * Math.PI * 2 * 1.3 + idlePhase) * idleAmp * 0.5;
  const idleY = Math.sin(progress * Math.PI * 2 * 0.9 + idlePhase * 1.4) * idleAmp;
  // Slow continuous push across the whole beat (on top of the shot's base zoom) so a shot keeps
  // drifting instead of freezing once its entrance/reveal finishes.
  const shotDrift = 1 + progress * 0.05;
  const effectiveZoom = zoom * shotDrift * (1 + (camera.scale - 1) * cameraWeight);
  const transform = `translate(${idleX}px, ${shiftY + idleY}px) translate(${camera.translateX + offset.x}px, ${camera.translateY + offset.y}px) rotate(${camera.rotate}deg) scale(${effectiveZoom})`;
  const swayDeg = sway > 0 ? Math.sin(progress * Math.PI * 2 * 0.6 + idlePhase * 0.8) * sway : 0;
  return <div style={{position: 'absolute', inset: 0, overflow: 'hidden', ...box}}>
    <div style={{position: 'absolute', inset: 0, transform: `rotate(${swayDeg}deg)`, transformOrigin: `${swayX}% ${swayY}%`}}>
      <Img src={src} style={{
        position: 'absolute', inset: 0, width: '100%', height: '100%',
        objectFit: fit,
        objectPosition: `${focusX}% ${focusY}%`,
        transform,
        transformOrigin: `${focusX}% ${focusY}%`,
        opacity,
        mixBlendMode: blend,
        ...revealStyle,
      }}/>
      {reveal === undefined ? null : <div style={{position: 'absolute', inset: 0, opacity}}>
        <WashSweep reveal={reveal} seed={seed}/>
        {showPen ? <ArtistPen reveal={reveal} seed={seed}/> : null}
      </div>}
    </div>
  </div>;
}

/**
 * A single organic, slightly wavy underline stroke that draws itself left-to-right via real SVG
 * `stroke-dasharray`/`stroke-dashoffset` path animation (the same genuine vector draw-on technique
 * as the armor-stroke/threat-line accents below, applied here to typography) — a restrained,
 * one-line "artist's hand" annotation under an important word rather than a cartoon sketch effect.
 */
function HandDrawnUnderline({progress, width}: {progress: number; width: number}) {
  const p = clamp01(progress);
  const len = 300; // path length units, independent of actual pixel width (scaled via viewBox)
  return <svg width={width} height={22} viewBox="0 0 300 22" style={{display: 'block', overflow: 'visible'}}>
    <path
      d="M4 14 Q60 4 110 12 T220 10 Q260 8 296 15"
      fill="none" stroke={RED} strokeWidth="5" strokeLinecap="round"
      strokeDasharray={len} strokeDashoffset={len * (1 - p)}
    />
  </svg>;
}

/**
 * Large brush-style Hindi keyword. `triggerAt` is a global (audio-timeline) second — when the
 * keyword's own word was found in the Whisper alignment for this beat, `triggerAt` is that word's
 * actual spoken start time, so the flourish pops in synced to the voice instead of a fixed
 * fraction of beat duration; otherwise it falls back to an early-beat estimate. `holdSeconds`
 * comes from the format profile — long-form beats hold the word up longer than a fast-cut Short.
 */
function KeywordFlourish({text, t, triggerAt, altSide, holdSeconds}: {text: string; t: number; triggerAt: number; altSide: boolean; holdSeconds: number}) {
  const rel = t - triggerAt;
  const opacity = interpolate(rel, [-0.05, 0.08, holdSeconds, holdSeconds + 0.6], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  if (opacity <= 0.001) return null;
  const scale = interpolate(rel, [-0.05, 0.12], [0.72, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const underlineProgress = interpolate(rel, [0.15, 0.55], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return <div style={{
    position: 'absolute', left: 0, right: 0, top: '30%', display: 'flex',
    justifyContent: altSide ? 'flex-end' : 'flex-start', padding: '0 64px', pointerEvents: 'none',
  }}>
    <div style={{opacity, transform: `scale(${scale}) rotate(${altSide ? 2 : -2}deg)`, display: 'inline-flex', flexDirection: 'column', alignItems: altSide ? 'flex-end' : 'flex-start'}}>
      <div style={{
        fontSize: 128, fontWeight: 800, color: INK, letterSpacing: 2,
        textShadow: `3px 3px 0 ${GOLD}66, 0 0 40px rgba(244,232,207,0.9)`,
      }}>{text}</div>
      <div style={{marginTop: -18, width: '92%'}}><HandDrawnUnderline progress={underlineProgress} width={280}/></div>
    </div>
  </div>;
}

type CaptionWord = {word: string; start: number; end: number; score: number};

/**
 * Whisper-synced kinetic typography: each word pops in gold exactly when the voice actually says
 * it (word.start/word.end are real forced-alignment timestamps on the same global audio timeline
 * as `t`, not a beat-local guess), then settles to a dimmer cream while later words continue
 * popping in — a building, word-by-word line rather than one static block appearing and vanishing.
 */
function KineticCaption({words, t, importantWord}: {words: CaptionWord[]; t: number; importantWord?: CaptionWord}) {
  if (words.length === 0) return null;
  const beatStart = words[0].start;
  const beatEnd = words[words.length - 1].end;
  const wrapOpacity = interpolate(t, [beatStart - 0.3, beatStart - 0.1, beatEnd + 0.15, beatEnd + 0.55],
    [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  if (wrapOpacity <= 0.001) return null;
  // Narrower, lower, no full-width banner: a compact word cluster tucked into the bottom edge
  // reads as an on-scene caption rather than a fixed subtitle track repeating in the same wide
  // band every beat. Only the words near the currently-spoken one render at once (a short rolling
  // window, not the whole line) so it stays a small integrated cluster instead of a large block.
  const rawIdx = words.findIndex((w) => t < w.end);
  const activeIdx = rawIdx === -1 ? words.length - 1 : rawIdx;
  const windowStart = Math.max(0, activeIdx - 1);
  const windowEnd = Math.min(words.length, activeIdx + 3);
  const visible = words.slice(windowStart, windowEnd);
  return <div style={{
    position: 'absolute', left: 160, right: 160, top: SUBTITLE_CENTER_Y - 70, height: 140,
    display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignContent: 'center',
    gap: '2px 10px', pointerEvents: 'none', opacity: wrapOpacity,
    textShadow: '0 2px 4px rgba(23,21,16,0.8)',
  }}>
    {visible.map((w) => {
      const i = words.indexOf(w);
      const upcoming = t < w.start - 0.02;
      const active = t >= w.start && t < w.end;
      const isImportant = importantWord !== undefined && w.start === importantWord.start && w.word === importantWord.word;
      let scale = 1;
      let color = CREAM;
      let opacity = 1;
      let y = 0;
      if (upcoming) {
        opacity = 0;
        scale = 0.55;
        y = 10;
      } else if (active) {
        const p = clamp01((t - w.start) / Math.max(0.05, w.end - w.start));
        scale = interpolate(p, [0, 0.35, 1], [0.8, 1.24, 1.06]);
        color = GOLD;
      } else {
        opacity = 0.75;
        if (isImportant) color = '#D9A544';
      }
      // Small normal subtitles overall, but the single most important spoken word in the beat
      // (picked from real speech, see shots.ts importantWordFor) stays visibly underlined once
      // spoken — a plain small-caption word never gets this treatment, only that one per beat.
      return <span key={i} style={{
        display: 'inline-block', opacity, color,
        transform: `translateY(${y}px) scale(${scale})`,
        fontSize: isImportant ? 38 : 32, fontWeight: 800, lineHeight: 1.2,
        borderBottom: isImportant && !upcoming ? `3px solid ${RED}` : 'none',
        paddingBottom: isImportant ? 2 : 0,
      }}>{w.word}</span>;
    })}
  </div>;
}

/** Four soft ink blots that retract from the frame edges as a beat opens — a stylistic "ink wipe" transition. */
function EdgeInkWipe({local}: {local: number}) {
  const t = interpolate(local, [0, 0.14], [1, 0], {extrapolateRight: 'clamp'});
  if (t <= 0.002) return null;
  return <g opacity={interpolate(t, [0, 1], [0, 0.5])}>
    <circle cx="0" cy="0" r={230 * t} fill={INK} style={{filter: 'blur(20px)'}}/>
    <circle cx="1080" cy="0" r={190 * t} fill={INK} style={{filter: 'blur(20px)'}}/>
    <circle cx="0" cy="1920" r={210 * t} fill={INK} style={{filter: 'blur(20px)'}}/>
    <circle cx="1080" cy="1920" r={250 * t} fill={INK} style={{filter: 'blur(20px)'}}/>
  </g>;
}

/**
 * Minimal persistent brand mark — replaces the old header/footer text entirely. Doubles as the
 * "subtle opening identity": for the first ~1.1s it's larger and still settling in (a brief
 * flourish, not a separate splash element), then holds at a small, low-opacity corner watermark
 * for the rest of the video. Sits in `brandingZone` (top-right, clear of the title-safe top-left,
 * the right-side platform icon rail, and the lower subtitle zone) so it never overlaps story art.
 */
function BrandWatermark({t}: {t: number}) {
  const introScale = interpolate(t, [0, 0.5, 1.1], [1.5, 1.5, 1], {extrapolateRight: 'clamp'});
  const introOpacity = interpolate(t, [0, 0.25], [0, 1], {extrapolateRight: 'clamp'});
  const steadyOpacity = 0.4;
  const opacity = t < 1.1 ? Math.min(introOpacity, interpolate(t, [0.85, 1.1], [1, steadyOpacity], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})) : steadyOpacity;
  return <div style={{
    position: 'absolute', top: 56, right: 40, textAlign: 'right', opacity,
    transform: `scale(${introScale})`, transformOrigin: 'top right',
    pointerEvents: 'none',
  }}>
    <div style={{fontSize: 22, fontWeight: 800, letterSpacing: 4, color: INK}}>{BRAND_NAME}</div>
  </div>;
}

/**
 * Full logo/end card — fades in over the last ~1.6s of the video, on top of the final beat's art,
 * without extending the manifest-driven composition length (which would reopen the audio tail-timing
 * work from the previous session). A brief overlay at the very close of a Short is a normal outro
 * beat, not a violation of "never cover important artwork" — that rule governs the persistent
 * watermark during the story itself, not the closing card.
 */
function EndCard({t, totalDuration}: {t: number; totalDuration: number}) {
  const holdSeconds = 1.6;
  const start = totalDuration - holdSeconds;
  const opacity = interpolate(t, [start, start + 0.5], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  if (opacity <= 0.001) return null;
  return <div style={{
    position: 'absolute', inset: 0, backgroundColor: CREAM, opacity,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18,
  }}>
    <div style={{fontSize: 84, fontWeight: 800, letterSpacing: 6, color: INK}}>{BRAND_NAME}</div>
    <div style={{fontSize: 24, fontWeight: 600, letterSpacing: 3, color: GOLD, textAlign: 'center', maxWidth: 780}}>{BRAND_TAGLINE}</div>
  </div>;
}

function GeneratedArtwork({beat, progress, beatIndex, format, variant}: {beat: Beat; progress: number; beatIndex: number; format: FormatProfile; variant: number}) {
  const refs = beat.asset_refs.filter((ref) => runtimeAssets[ref]);
  if (refs.length === 0) return null;
  const environment = refs.find((ref) => /environment|background|battlefield|location/i.test(ref));
  const glow = refs.find((ref) => /sun|symbol|glow/i.test(ref));
  const characters = refs.filter((ref) => /character|\.master/i.test(ref) || ref.includes('karna') || ref.includes('indra'));
  const detail = refs.find((ref) => ref !== environment && ref !== glow && !characters.includes(ref));

  const camera = cameraMotion(beat.camera, progress);
  const direction: Direction = beat.camera === 'pan' ? {x: 130, y: 30} : {x: 84, y: 48};
  // Environment/glow layers don't cut between sub-shots (only characters do); this is just their
  // single baseline framing.
  const shot = shotFor(beat.visual_role, variant);
  const alt = beatIndex % 2 === 1;
  const cameraWeight = 0.35 * format.cameraIntensity;
  const revealF = format.revealFraction;

  const envOpacity = entranceExitOpacity(progress, 0.06, 0.92);
  const envReveal = revealProgress(progress, revealF * 1.05);

  return <div style={{position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden'}}>
    {environment ? <FramedLayer key={`${beat.beat_id}-env`}
      src={staticFile(runtimeAssets[environment])}
      zoom={Math.max(1.02, shot.zoom * 0.62)} focusY={48}
      camera={camera} depth={0.16} progress={progress} direction={direction}
      reveal={envReveal} opacity={envOpacity * 0.92}
      cameraWeight={cameraWeight} idleScale={format.idleAmpScale}
      seed={`${beat.beat_id}-env`} showPen={characters.length === 0}
    /> : null}

    {/* The sun.symbol master asset turned out to be a full illustrated scene, not a clean glow
        motif — crop tightly into just its sun-ring region (well above the figure lower in the
        frame) so it reads as an ambient light accent instead of blending in unrelated content. */}
    {glow ? <FramedLayer key={`${beat.beat_id}-glow`}
      src={staticFile(runtimeAssets[glow])}
      zoom={2.6} focusY={26}
      camera={camera} depth={0.1} progress={progress} direction={direction}
      opacity={entranceExitOpacity(progress, 0.08, 0.9) * 0.5}
      blend="multiply"
      cameraWeight={cameraWeight} idleScale={format.idleAmpScale}
    /> : null}

    {characters.length >= 2 ? characters.slice(0, 2).map((ref, index) => {
      const staggered = Math.max(0, Math.min(1, progress - index * 0.05));
      const leftSide = (index === 0) !== alt;
      // Each character gets its own shot list, offset by `index` so the two don't cut in lockstep —
      // reading more like a directed conversation (cutting between two people) than a synced pair.
      const subShots = subShotSequence(beat.visual_role, variant + index);
      const {shot: subShot, index: cutIndex, segLocal, segDur} = activeSubShot(subShots, staggered);
      // Only the first sub-shot is this character's actual hand-drawn reveal; a beat draws a
      // character once, then cuts between different (already-inked) views of them.
      const revealCap = Math.min(revealF, segDur * 0.85);
      const reveal = cutIndex === 0 ? revealProgress(staggered, revealCap) : 1;
      // Keyed per-beat (not just per-asset) so React never reuses a layer instance across a beat
      // boundary — the same master asset (e.g. karna.master) recurs in almost every beat, and
      // Remotion's continuous multi-frame render keeps one persistent React tree across the whole
      // video, so a same-key element from the previous beat could otherwise be reconciled as an
      // "update" instead of a fresh mount and end up in a stale/broken visual state.
      return <FramedLayer key={`${beat.beat_id}-${ref}`}
        src={staticFile(runtimeAssets[ref])}
        fit="contain"
        zoom={Math.min(subShot.zoom * cutSnapZoom(segLocal), 1.3)} focusY={subShot.focusY} focusX={leftSide ? 38 : 62}
        camera={camera} depth={0.72 - index * 0.06} progress={progress} direction={direction}
        reveal={reveal}
        opacity={entranceExitOpacity(staggered) * cutFlashOpacity(segLocal, cutIndex)}
        shiftY={entranceExitShiftY(staggered)}
        sway={1.0 * format.swayScale} swayX={30} swayY={26}
        cameraWeight={cameraWeight} idleScale={format.idleAmpScale}
        seed={`${beat.beat_id}-${ref}`} showPen={index === 0 && cutIndex === 0}
        box={{
          left: leftSide ? '-8%' : '38%', width: '70%',
          top: '12%', bottom: '2%',
        }}
      />;
    }) : characters.slice(0, 1).map((ref) => {
      const fullBleed = !environment;
      const subShots = subShotSequence(beat.visual_role, variant);
      const {shot: subShot, index: cutIndex, segLocal, segDur} = activeSubShot(subShots, progress);
      const revealCap = Math.min(revealF, segDur * 0.85);
      const reveal = cutIndex === 0 ? revealProgress(progress, revealCap) : 1;
      return <FramedLayer key={`${beat.beat_id}-${ref}`}
        src={staticFile(runtimeAssets[ref])}
        fit={fullBleed ? 'cover' : 'contain'}
        zoom={subShot.zoom * cutSnapZoom(segLocal)} focusY={subShot.focusY}
        camera={camera} depth={0.68} progress={progress} direction={direction}
        reveal={reveal}
        opacity={entranceExitOpacity(progress) * cutFlashOpacity(segLocal, cutIndex)}
        shiftY={entranceExitShiftY(progress)}
        sway={1.6 * format.swayScale} swayX={28} swayY={24}
        cameraWeight={cameraWeight} idleScale={format.idleAmpScale}
        seed={`${beat.beat_id}-${ref}`} showPen={cutIndex === 0}
        box={fullBleed ? undefined : {
          left: alt ? '2%' : '26%', width: '72%',
          top: '8%', bottom: '0%',
        }}
      />;
    })}

    {detail ? (() => {
      // The hero character already gets this beat's one real hand-drawn reveal (see the sub-shot
      // cut logic above); this inset instead cuts IN partway through the beat, as its own directed
      // moment ("cut to the detail") — a punch-in pop, not a second competing ink-draw animation.
      const detailStart = 0.42;
      const detailLocal = clamp01((progress - detailStart) / (1 - detailStart));
      return <FramedLayer key={`${beat.beat_id}-detail`}
        src={staticFile(runtimeAssets[detail])}
        fit="cover"
        zoom={1.35 * cutSnapZoom(detailLocal)} focusY={40}
        camera={camera} depth={0.5} progress={progress} direction={direction}
        reveal={detailLocal > 0.001 ? 1 : 0}
        opacity={entranceExitOpacity(detailLocal, 0.05, 0.85)}
        cameraWeight={cameraWeight} idleScale={format.idleAmpScale}
        seed={`${beat.beat_id}-detail`}
        box={{
          right: '5%', left: 'auto', width: '46%',
          bottom: '8%', top: 'auto', height: '48%',
          border: `3px solid ${INK}`, boxShadow: '10px 14px 0 rgba(23,21,16,0.18)',
        }}
      />;
    })() : null}
  </div>;
}

/**
 * Which sub-shot (of this beat's within-beat cut sequence) is active at a given progress point,
 * plus how far into that sub-shot's own window we are (0-1). Splitting a beat into N equal windows
 * and hard-cutting the crop at each boundary is what turns "one static reveal held for 6-9s" into
 * several directed shots of the same master asset — the actual complaint this addresses.
 */
function activeSubShot(shots: ShotPreset[], progress: number): {shot: ShotPreset; index: number; segLocal: number; segDur: number} {
  const n = shots.length;
  const segDur = 1 / n;
  const index = Math.min(n - 1, Math.floor(progress / segDur));
  const segLocal = clamp01((progress - index * segDur) / segDur);
  return {shot: shots[index], index, segLocal, segDur};
}

/** Quick snap-in on a fresh cut: starts slightly over-zoomed and settles over the first ~18% of
 * the sub-shot's window, reading as the camera punching into a new framing rather than the crop
 * just silently changing underneath a static hold. */
function cutSnapZoom(segLocal: number): number {
  return interpolate(segLocal, [0, 0.18], [1.06, 1], {extrapolateRight: 'clamp'});
}

/** A fast whip-like opacity blink right at a cut boundary (index > 0 only — the first sub-shot is
 * the beat's actual hand-drawn reveal and must not blink). Sells the boundary as an edit rather
 * than the crop silently sliding, without re-triggering the ink-reveal animation. */
function cutFlashOpacity(segLocal: number, index: number): number {
  if (index === 0) return 1;
  return interpolate(segLocal, [0, 0.05, 0.12], [0.3, 1, 1], {extrapolateRight: 'clamp'});
}

const CHARACTER_REF = /character|\.master/i;
const primaryCharacterRef = (beat: Beat) => beat.asset_refs.find((r) => CHARACTER_REF.test(r) || r.includes('karna') || r.includes('indra'));

export const MythicShort: React.FC<{manifest: Manifest}> = ({manifest}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  // Format-aware, not a separate pipeline: the SAME manifest field (duration_seconds, already
  // required by the schema) picks a tempo/motion profile — a Short renders dense and fast-cut,
  // a long-form manifest (already authored with longer per-beat durations) gets gentler,
  // less-fatiguing continuous motion instead of the same intensity stretched over many minutes.
  const format = useMemo(() => profileFor(manifest.duration_seconds), [manifest]);
  const beats = useMemo<Beat[]>(() => {
    let cursor = 0;
    return manifest.beats.map((b) => {
      const start = cursor;
      cursor += b.duration_seconds;
      return {...b, start, end: cursor, label: labelForRole(b.visual_role)};
    });
  }, [manifest]);
  // How many times THIS beat's character has already appeared earlier in the story — used to
  // rotate through shot archetypes (shots.ts) so a character reused across many beats (any
  // mythology, not just this one) doesn't repeat the same framing back to back.
  const variantByBeatId = useMemo(() => {
    const counts: Record<string, number> = {};
    const map: Record<string, number> = {};
    for (const b of beats) {
      const key = primaryCharacterRef(b) ?? b.visual_role;
      const v = counts[key] ?? 0;
      map[b.beat_id] = v;
      counts[key] = v + 1;
    }
    return map;
  }, [beats]);

  const beatIndex = Math.max(0, beats.findIndex((b) => t >= b.start && t < b.end));
  const beat = beats[beatIndex] ?? beats[beats.length - 1];
  const local = Math.max(0, Math.min(1, (t - beat.start) / Math.max(0.1, beat.end - beat.start)));
  const draw = drawRevealProgress(local);
  const camera = cameraMotion(beat.camera, local);
  const isArmor = beat.visual_role.includes('armor') || beat.visual_role === 'sacrifice';
  const isThreat = beat.visual_role === 'threat' || beat.visual_role === 'stakes';
  const caption = (beat.narration ?? beat.text ?? '').trim();
  const beatWords = (runtimeCaptions as Record<string, CaptionWord[]>)[beat.beat_id] ?? [];
  const showStaticCaption = caption && beatWords.length === 0 && beat.duration_seconds >= 6;
  // The kinetic keyword and caption emphasis are driven by the actual word Whisper found this
  // beat's narration to contain (see importantWordFor) — this works for any story/mythology
  // without a per-story vocabulary table. Only when there's no real alignment data (Whisper
  // didn't run) do we fall back to the small generic per-role word list in shots.ts.
  const importantWord = importantWordFor(beatWords);
  const keywordText = importantWord ? importantWord.word.replace(/[।,.!?"'()]/g, '') : keywordFor(beat.visual_role);
  const keywordTriggerAt = importantWord ? importantWord.start : beat.start + beat.duration_seconds * 0.05;
  // Real generated master art replaces the procedural sketch figures for this beat; only draw the
  // hand-coded fallback (KarnaFigure/Visitor) when no real character asset is available.
  const hasRealCharacterArt = realCharacterRefs(beat).length > 0;
  const isVisitor = beat.visual_role.includes('visitor') || beat.visual_role === 'decision' || beat.visual_role === 'request' || beat.visual_role === 'sacrifice';

  return <AbsoluteFill style={{backgroundColor: CREAM, fontFamily: 'Noto Sans Devanagari, Noto Sans, sans-serif', color: INK}}>
    {runtimeAudio ? <Audio src={staticFile(runtimeAudio)} volume={1}/> : null}
    <GeneratedArtwork beat={beat} progress={local} beatIndex={beatIndex} format={format} variant={variantByBeatId[beat.beat_id] ?? 0}/>
    <AbsoluteFill style={{transform: `translate(${camera.translateX * 0.18}px, ${camera.translateY * 0.18}px) scale(${camera.scale * 0.985})`, transformOrigin: '50% 50%'}}>
      <svg width="100%" height="100%" viewBox="0 0 1080 1920">
        <rect width="1080" height="1920" fill={CREAM} opacity={runtimeAssets[beat.asset_refs[0]] ? 0.18 : 1}/>
        <path d="M70 90 Q540 40 1010 90 M70 1830 Q540 1880 1010 1830" fill="none" stroke={INK} strokeWidth="4" opacity="0.25"/>
        <SketchSun opacity={(beat.visual_role === 'hook' || isArmor ? 1 : 0.25) * (hasRealCharacterArt ? 0.4 : 1)} pulseT={t}/>
        {hasRealCharacterArt ? null : <g style={{transform: `translate(${camera.translateX * 0.72}px, ${camera.translateY * 0.72}px)`, transformOrigin: '540px 1120px'}}>
          <KarnaFigure progress={isVisitor ? 1 : draw}/>
          {isVisitor ? <Visitor progress={draw}/> : null}
        </g>}
        {isThreat ? <path d="M70 1450 Q250 1320 430 1460 T800 1420 T1010 1470" fill="none" stroke={RED} strokeWidth="18" opacity={draw}/> : null}
        {isArmor ? <g opacity={draw}><path d="M350 980 Q540 820 730 980" fill="none" stroke={GOLD} strokeWidth="26" strokeDasharray="1200" strokeDashoffset={1200 * (1 - draw)}/><circle cx="540" cy="980" r="22" fill={GOLD}/></g> : null}
        <EdgeInkWipe local={local}/>
      </svg>
    </AbsoluteFill>

    {keywordText ? <KeywordFlourish text={keywordText} t={t} triggerAt={keywordTriggerAt} altSide={beatIndex % 2 === 1} holdSeconds={format.keywordHoldSeconds}/> : null}

    {beatWords.length > 0 ? <KineticCaption words={beatWords} t={t} importantWord={importantWord}/> : null}

    {showStaticCaption ? <div style={{
      position: 'absolute', left: 56, right: 56, top: SUBTITLE_CENTER_Y - 90, height: 180,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      opacity: interpolate(local, [0.1, 0.2, 0.86, 0.96], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
      textAlign: 'center',
    }}>
      <div style={{
        display: 'inline-block', maxWidth: 940, padding: '10px 22px', borderRadius: 10,
        background: 'rgba(23,21,16,0.72)', fontSize: 32, lineHeight: 1.24, fontWeight: 600, color: CREAM,
      }}>
        {caption}
      </div>
    </div> : null}

    <BrandWatermark t={t}/>
    <EndCard t={t} totalDuration={manifest.duration_seconds}/>
  </AbsoluteFill>;
};
