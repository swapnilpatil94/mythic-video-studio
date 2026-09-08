import React, {useMemo} from 'react';
import {AbsoluteFill, Audio, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {runtimeAssets} from './runtime-assets';
import {runtimeAudio} from './runtime-audio';
import {runtimeCaptions} from './runtime-captions';
import {brandLogoAvailable} from './runtime-brand';
import {InkConstructionOverlay} from './InkConstructionOverlay';
import {subjectRelativeConstruction, type ConstructionRegion} from './artwork-construction';
import {KathayaCinematic} from './KathayaCinematic';
import {
  cameraMotion,
  parallaxOffset,
  revealProgress,
  entranceExitOpacity,
  entranceExitShiftY,
  type MotionFrame,
} from './motion';
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

type Psychology = {
  tension_level?: number;
  emotional_level?: number;
  pattern_interrupt?: boolean;
};

type ManifestBeat = {
  beat_id: string;
  duration_seconds: number;
  visual_role: string;
  asset_refs: string[];
  camera?: string;
  animation?: string;
  text?: string;
  narration?: string;
  psychology?: Psychology;
};

type Manifest = {
  title: string;
  duration_seconds: number;
  platform?: string;
  asset_kinds?: Record<string, string>;
  beats: ManifestBeat[];
};

type Beat = ManifestBeat & {start: number; end: number; label: string};
type Direction = {x: number; y: number};
type CaptionWord = {word: string; start: number; end: number; score: number};

const labelForRole = (role: string) => role.replaceAll('_', ' ').toUpperCase();

function primaryCharacterRef(beat: Beat, assetKinds?: Record<string, string>) {
  return beat.asset_refs.find((ref) =>
    assetKinds?.[ref] === 'character' || /character|\.master/i.test(ref) || /karna|indra/i.test(ref),
  );
}

function activeSubShot(shots: ShotPreset[], progress: number) {
  const count = Math.max(1, shots.length);
  const segDur = 1 / count;
  const index = Math.min(count - 1, Math.floor(progress / segDur));
  const segLocal = clamp01((progress - index * segDur) / segDur);
  return {shot: shots[index], index, segLocal, segDur};
}

function cutSnapZoom(segLocal: number) {
  return interpolate(segLocal, [0, 0.18], [1.06, 1], {extrapolateRight: 'clamp'});
}

function cutFlashOpacity(segLocal: number, index: number) {
  if (index === 0) return 1;
  return interpolate(segLocal, [0, 0.05, 0.12], [0.3, 1, 1], {extrapolateRight: 'clamp'});
}

/**
 * The master artwork is intentionally NOT masked/revealed. During the ink phase it is absent;
 * the semantic SVG construction layer is the only subject representation. Once the wash phase
 * starts, the finished master fades in independently. This prevents a raster wipe from being
 * mistaken for drawing and keeps the vector stroke layer as the source of the drawing motion.
 */
function FramedLayer({
  src,
  zoom,
  focusY,
  focusX = 50,
  camera,
  depth,
  progress,
  direction,
  reveal,
  opacity = 1,
  shiftY = 0,
  box,
  fit = 'cover',
  cameraWeight = 0.35,
  sway = 0,
  swayX = 28,
  swayY = 30,
  idleScale = 1,
  seed = 'layer',
  showPen = false,
  constructionRegions,
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
  box?: React.CSSProperties;
  fit?: 'cover' | 'contain';
  cameraWeight?: number;
  sway?: number;
  swayX?: number;
  swayY?: number;
  idleScale?: number;
  seed?: string;
  showPen?: boolean;
  constructionRegions?: ConstructionRegion[];
}) {
  const offset = parallaxOffset(depth, progress, direction);
  const idlePhase = focusY * 0.11 + depth * 2.4;
  const idleAmp = (3 + depth * 6) * idleScale;
  const idleX = Math.sin(progress * Math.PI * 2 * 1.3 + idlePhase) * idleAmp * 0.5;
  const idleY = Math.sin(progress * Math.PI * 2 * 0.9 + idlePhase * 1.4) * idleAmp;
  const shotDrift = 1 + progress * 0.05;
  const effectiveZoom = zoom * shotDrift * (1 + (camera.scale - 1) * cameraWeight);
  const transform = `translate(${idleX}px, ${shiftY + idleY}px) translate(${camera.translateX + offset.x}px, ${camera.translateY + offset.y}px) rotate(${camera.rotate}deg) scale(${effectiveZoom})`;
  const swayDeg = sway > 0 ? Math.sin(progress * Math.PI * 2 * 0.6 + idlePhase * 0.8) * sway : 0;

  const drawing = reveal !== undefined && constructionRegions?.length ? clamp01(reveal) : 0;
  const wash = drawing <= 0.42 ? 0 : clamp01((drawing - 0.42) / 0.58);
  const masterOpacity = reveal === undefined ? 1 : wash;
  const masterFilter = reveal === undefined
    ? undefined
    : `grayscale(${1 - wash}) saturate(${0.18 + wash * 0.82}) contrast(${1.04 + (1 - wash) * 0.08})`;

  return (
    <div style={{position: 'absolute', inset: 0, overflow: 'hidden', ...box}}>
      <div style={{position: 'absolute', inset: 0, transform: `rotate(${swayDeg}deg)`, transformOrigin: `${swayX}% ${swayY}%`}}>
        <Img
          src={src}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            objectFit: fit,
            objectPosition: `${focusX}% ${focusY}%`,
            transform,
            transformOrigin: `${focusX}% ${focusY}%`,
            opacity: opacity * masterOpacity,
            filter: masterFilter,
          }}
        />
        {reveal !== undefined && constructionRegions?.length ? (
          <InkConstructionOverlay
            regions={constructionRegions}
            progress={drawing}
            showGuide={drawing < 0.84}
          />
        ) : null}
        {showPen && drawing > 0.04 && drawing < 0.88 ? (
          <div
            aria-hidden
            style={{
              position: 'absolute',
              left: `${38 + drawing * 22}%`,
              top: `${18 + drawing * 64}%`,
              width: 10,
              height: 30,
              borderRadius: '2px 2px 8px 8px',
              background: INK,
              opacity: 0.72 * (1 - drawing * 0.55),
              transform: `rotate(${18 + drawing * 18}deg)`,
              boxShadow: '0 2px 5px rgba(23,21,16,.28)',
              pointerEvents: 'none',
            }}
          />
        ) : null}
      </div>
    </div>
  );
}

function ShotFrameTreatment({label, opacity}: {label: string; opacity: number}) {
  if (opacity <= 0.001) return null;
  if (label.startsWith('wide') || label.startsWith('entrance')) {
    return <div style={{position: 'absolute', inset: 0, pointerEvents: 'none', opacity}}>
      <div style={{position: 'absolute', top: 0, left: 0, right: 0, height: '5.5%', background: INK, opacity: 0.82}}/>
      <div style={{position: 'absolute', bottom: 0, left: 0, right: 0, height: '5.5%', background: INK, opacity: 0.82}}/>
    </div>;
  }
  if (label.startsWith('face') || label.startsWith('eyes')) {
    return <div style={{position: 'absolute', inset: 0, pointerEvents: 'none', opacity, background: `radial-gradient(ellipse 78% 62% at 50% 42%, transparent 58%, ${INK} 100%)`}}/>;
  }
  if (label.startsWith('hand') || label.includes('armor-detail')) {
    return <div style={{position: 'absolute', inset: 0, pointerEvents: 'none', opacity}}>
      <div style={{position: 'absolute', left: '50%', top: '46%', width: 920, height: 920, transform: 'translate(-50%, -50%)', borderRadius: '50%', border: `3px solid ${GOLD}`, boxShadow: '0 0 0 3000px rgba(23,21,16,0.5)'}}/>
    </div>;
  }
  return null;
}

function GeneratedArtwork({
  beat,
  progress,
  beatIndex,
  format,
  variant,
  assetKinds,
}: {
  beat: Beat;
  progress: number;
  beatIndex: number;
  format: FormatProfile;
  variant: number;
  assetKinds?: Record<string, string>;
}) {
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
  const envReveal = revealProgress(progress, revealF * 1.05);

  return (
    <div style={{position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden'}}>
      {environment ? (() => {
        const isRiver = environment === 'ashwa_river';
        const envZoom = isRiver ? 2.6 : Math.max(1.02, shot.zoom * 0.62);
        const envFocusY = isRiver ? 92 : 48;
        return (
          <FramedLayer
            key={`${beat.beat_id}-env`}
            src={staticFile(runtimeAssets[environment])}
            zoom={envZoom}
            focusY={envFocusY}
            camera={camera}
            depth={0.16}
            progress={progress}
            direction={direction}
            reveal={envReveal}
            opacity={envOpacity * 0.92}
            cameraWeight={cameraWeight}
            idleScale={format.idleAmpScale}
            seed={`${beat.beat_id}-env`}
          />
        );
      })() : null}

      {glow ? (
        <div
          key={`${beat.beat_id}-glow`}
          style={{
            position: 'absolute', left: '60%', top: '18%', width: 560, height: 560,
            transform: `translate(-50%, -50%) scale(${1 + Math.sin(progress * Math.PI * 2.4) * 0.05})`,
            borderRadius: '50%',
            background: `radial-gradient(circle, ${GOLD}cc 0%, ${GOLD}66 32%, transparent 70%)`,
            filter: 'blur(34px)',
            opacity: entranceExitOpacity(progress, 0.08, 0.9) * 0.6,
            mixBlendMode: 'screen',
          }}
        />
      ) : null}

      {characters.length >= 2 ? characters.slice(0, 2).map((ref, index) => {
        const staggered = clamp01(progress - index * 0.05);
        const leftSide = (index === 0) !== (beatIndex % 2 === 1);
        const subShots = subShotSequence(beat.visual_role, variant + index);
        const {shot: subShot, index: cutIndex, segLocal, segDur} = activeSubShot(subShots, staggered);
        const revealCap = Math.min(revealF, segDur * 0.85);
        const reveal = cutIndex === 0 ? revealProgress(staggered, revealCap) : undefined;
        const regions = cutIndex === 0 ? subjectRelativeConstruction({focusX: subShot.focusX, focusY: subShot.focusY}) : undefined;
        return (
          <FramedLayer
            key={`${beat.beat_id}-${ref}`}
            src={staticFile(runtimeAssets[ref])}
            fit="contain"
            zoom={Math.min(subShot.zoom * cutSnapZoom(segLocal), 1.3)}
            focusY={subShot.focusY}
            focusX={leftSide ? 38 : 62}
            camera={camera}
            depth={0.72 - index * 0.06}
            progress={progress}
            direction={direction}
            reveal={reveal}
            opacity={entranceExitOpacity(staggered) * cutFlashOpacity(segLocal, cutIndex)}
            shiftY={entranceExitShiftY(staggered)}
            sway={1.35 * format.swayScale}
            swayX={30}
            swayY={26}
            cameraWeight={cameraWeight}
            idleScale={format.idleAmpScale}
            seed={`${beat.beat_id}-${ref}`}
            showPen={index === 0 && cutIndex === 0}
            constructionRegions={regions}
            box={{left: leftSide ? '-8%' : '38%', width: '70%', top: '12%', bottom: '2%'}}
          />
        );
      }) : null}

      {characters.length >= 2 ? <div style={{position: 'absolute', left: '50%', top: '7%', bottom: '7%', width: 2, background: INK, opacity: entranceExitOpacity(progress) * 0.22}}/> : null}

      {characters.length < 2 ? characters.slice(0, 1).map((ref) => {
        const fullBleed = !environment;
        const subShots = subShotSequence(beat.visual_role, variant);
        const {shot: subShot, index: cutIndex, segLocal, segDur} = activeSubShot(subShots, progress);
        const revealCap = Math.min(revealF, segDur * 0.85);
        const reveal = cutIndex === 0 ? revealProgress(progress, revealCap) : undefined;
        const regions = cutIndex === 0 ? subjectRelativeConstruction({focusX: subShot.focusX, focusY: subShot.focusY}) : undefined;
        const layerOpacity = entranceExitOpacity(progress) * cutFlashOpacity(segLocal, cutIndex);
        return (
          <React.Fragment key={`${beat.beat_id}-${ref}-frame`}>
            <FramedLayer
              key={`${beat.beat_id}-${ref}`}
              src={staticFile(runtimeAssets[ref])}
              fit={fullBleed ? 'cover' : 'contain'}
              zoom={subShot.zoom * cutSnapZoom(segLocal)}
              focusY={subShot.focusY}
              focusX={subShot.focusX}
              camera={camera}
              depth={0.68}
              progress={progress}
              direction={direction}
              reveal={reveal}
              opacity={layerOpacity}
              shiftY={entranceExitShiftY(progress)}
              sway={2.1 * format.swayScale}
              swayX={28}
              swayY={24}
              cameraWeight={cameraWeight}
              idleScale={format.idleAmpScale}
              seed={`${beat.beat_id}-${ref}`}
              showPen={cutIndex === 0}
              constructionRegions={regions}
              box={fullBleed ? undefined : {left: beatIndex % 2 === 1 ? '2%' : '26%', width: '72%', top: '8%', bottom: '0%'}}
            />
            <ShotFrameTreatment label={subShot.label} opacity={layerOpacity}/>
          </React.Fragment>
        );
      }) : null}

      {detail ? (() => {
        const detailStart = 0.42;
        const detailLocal = clamp01((progress - detailStart) / (1 - detailStart));
        return (
          <FramedLayer
            key={`${beat.beat_id}-detail`}
            src={staticFile(runtimeAssets[detail])}
            fit="cover"
            zoom={1.35 * cutSnapZoom(detailLocal)}
            focusY={40}
            camera={camera}
            depth={0.5}
            progress={progress}
            direction={direction}
            reveal={detailLocal > 0.001 ? undefined : undefined}
            opacity={entranceExitOpacity(detailLocal, 0.05, 0.85)}
            cameraWeight={cameraWeight}
            idleScale={format.idleAmpScale}
            seed={`${beat.beat_id}-detail`}
            box={{right: '5%', left: 'auto', width: '46%', bottom: '8%', top: 'auto', height: '48%', border: `3px solid ${INK}`, boxShadow: '10px 14px 0 rgba(23,21,16,0.18)'}}
          />
        );
      })() : null}
    </div>
  );
}

function HandDrawnUnderline({progress, width}: {progress: number; width: number}) {
  const p = clamp01(progress);
  return (
    <svg width={width} height={22} viewBox="0 0 300 22" style={{display: 'block', overflow: 'visible'}}>
      <path d="M4 14 Q60 4 110 12 T220 10 Q260 8 296 15" fill="none" stroke={RED} strokeWidth="5" strokeLinecap="round" strokeDasharray="300" strokeDashoffset={300 * (1 - p)}/>
    </svg>
  );
}

function KeywordFlourish({text, t, triggerAt, altSide, holdSeconds}: {text: string; t: number; triggerAt: number; altSide: boolean; holdSeconds: number}) {
  const rel = t - triggerAt;
  const opacity = interpolate(rel, [-0.05, 0.08, holdSeconds, holdSeconds + 0.6], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  if (opacity <= 0.001) return null;
  const scale = interpolate(rel, [-0.05, 0.12], [0.72, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const underlineProgress = interpolate(rel, [0.15, 0.55], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: '15%', display: 'flex', justifyContent: altSide ? 'flex-end' : 'flex-start', padding: '0 64px', pointerEvents: 'none'}}>
      <div style={{opacity, transform: `scale(${scale}) rotate(${altSide ? 2 : -2}deg)`, display: 'inline-flex', flexDirection: 'column', alignItems: altSide ? 'flex-end' : 'flex-start'}}>
        <div style={{fontSize: 128, fontWeight: 800, color: INK, letterSpacing: 2, textShadow: `3px 3px 0 ${GOLD}66, 0 0 40px rgba(244,232,207,0.9)`}}>{text}</div>
        <div style={{marginTop: -18, width: '92%'}}><HandDrawnUnderline progress={underlineProgress} width={280}/></div>
      </div>
    </div>
  );
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
  return (
    <div style={{position: 'absolute', left: 160, right: 160, top: centerY - 70, height: 140, display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignContent: 'center', gap: '2px 10px', pointerEvents: 'none', opacity: wrapOpacity, textShadow: '0 2px 4px rgba(23,21,16,0.8)'}}>
      {visible.map((word) => {
        const upcoming = t < word.start - 0.02;
        const active = t >= word.start && t < word.end;
        const isImportant = importantWord !== undefined && word.start === importantWord.start && word.word === importantWord.word;
        let scale = 1;
        let color = CREAM;
        let opacity = 1;
        let y = 0;
        if (upcoming) { opacity = 0; scale = 0.55; y = 10; }
        else if (active) { const p = clamp01((t - word.start) / Math.max(0.05, word.end - word.start)); scale = interpolate(p, [0, 0.35, 1], [0.8, 1.24, 1.06]); color = GOLD; }
        else { opacity = 0.75; if (isImportant) color = '#D9A544'; }
        return <span key={`${word.word}-${word.start}`} style={{display: 'inline-block', opacity, color, transform: `translateY(${y}px) scale(${scale})`, fontSize: isImportant ? 38 : 32, fontWeight: 800, lineHeight: 1.2, borderBottom: isImportant && !upcoming ? `3px solid ${RED}` : 'none', paddingBottom: isImportant ? 2 : 0}}>{word.word}</span>;
      })}
    </div>
  );
}

function EdgeInkWipe({local}: {local: number}) {
  const progress = interpolate(local, [0, 0.14], [1, 0], {extrapolateRight: 'clamp'});
  if (progress <= 0.002) return null;
  return (
    <g opacity={interpolate(progress, [0, 1], [0, 0.5])}>
      <circle cx="0" cy="0" r={230 * progress} fill={INK} style={{filter: 'blur(20px)'}}/>
      <circle cx="1080" cy="0" r={190 * progress} fill={INK} style={{filter: 'blur(20px)'}}/>
      <circle cx="0" cy="1920" r={210 * progress} fill={INK} style={{filter: 'blur(20px)'}}/>
      <circle cx="1080" cy="1920" r={250 * progress} fill={INK} style={{filter: 'blur(20px)'}}/>
    </g>
  );
}

function BrandWatermark({t}: {t: number}) {
  if (!brandLogoAvailable) {
    const opacity = t < 1.1
      ? Math.min(interpolate(t, [0, 0.25], [0, 1], {extrapolateRight: 'clamp'}), interpolate(t, [0.85, 1.1], [1, 0.4], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}))
      : 0.4;
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
  const subtitleCenterY = useMemo(() => resolveSubtitleCenterY(platformProfile(manifest.platform ?? DEFAULT_PLATFORM)).centerY, [manifest]);

  const beats = useMemo<Beat[]>(() => {
    let cursor = 0;
    return manifest.beats.map((beat) => {
      const start = cursor;
      cursor += beat.duration_seconds;
      return {...beat, start, end: cursor, label: labelForRole(beat.visual_role)};
    });
  }, [manifest]);

  const variantByBeatId = useMemo(() => {
    const counts: Record<string, number> = {};
    const map: Record<string, number> = {};
    for (const beat of beats) {
      const key = primaryCharacterRef(beat, manifest.asset_kinds) ?? beat.visual_role;
      const variant = counts[key] ?? 0;
      map[beat.beat_id] = variant;
      counts[key] = variant + 1;
    }
    return map;
  }, [beats, manifest.asset_kinds]);

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

  return (
    <AbsoluteFill style={{backgroundColor: CREAM, fontFamily: 'Noto Sans Devanagari, Noto Sans, sans-serif', color: INK}}>
      {runtimeAudio ? <Audio src={staticFile(runtimeAudio)} volume={1}/> : null}

      <GeneratedArtwork beat={beat} progress={local} beatIndex={beatIndex} format={format} variant={variant} assetKinds={manifest.asset_kinds}/>

      <AbsoluteFill style={{transform: `translate(${camera.translateX * 0.18}px, ${camera.translateY * 0.18}px) scale(${camera.scale * 0.985})`, transformOrigin: '50% 50%'}}>
        <svg width="100%" height="100%" viewBox="0 0 1080 1920">
          <rect width="1080" height="1920" fill={CREAM} opacity={runtimeAssets[beat.asset_refs[0]] ? 0.18 : 1}/>
          <path d="M70 90 Q540 40 1010 90 M70 1830 Q540 1880 1010 1830" fill="none" stroke={INK} strokeWidth="4" opacity="0.25"/>
          <EdgeInkWipe local={local}/>
        </svg>
      </AbsoluteFill>

      {keywordText ? <KeywordFlourish text={keywordText} t={t} triggerAt={keywordTriggerAt} altSide={beatIndex % 2 === 1} holdSeconds={format.keywordHoldSeconds}/> : null}
      {beatWords.length > 0 ? <KineticCaption words={beatWords} t={t} importantWord={importantWord} centerY={subtitleCenterY}/> : null}

      {showStaticCaption ? (
        <div style={{position: 'absolute', left: 56, right: 56, top: subtitleCenterY - 90, height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: interpolate(local, [0.1, 0.2, 0.86, 0.96], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}), textAlign: 'center'}}>
          <div style={{display: 'inline-block', maxWidth: 940, padding: '10px 22px', borderRadius: 10, background: 'rgba(23,21,16,0.72)', fontSize: 32, lineHeight: 1.24, fontWeight: 600, color: CREAM}}>{caption}</div>
        </div>
      ) : null}

      <KathayaCinematic
        progress={local}
        tension={psychology?.tension_level ?? 5}
        emotional={psychology?.emotional_level ?? 5}
        patternInterrupt={Boolean(psychology?.pattern_interrupt)}
      />
      <BrandWatermark t={t}/>
      <EndCard t={t} totalDuration={manifest.duration_seconds}/>
      <OpeningLogoSplash t={t}/>
    </AbsoluteFill>
  );
};
