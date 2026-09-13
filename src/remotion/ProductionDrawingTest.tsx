import React, {useMemo} from 'react';
import {AbsoluteFill, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ProgressiveArtwork, subjectRelativeConstruction} from './artwork-construction';
import {InkConstructionOverlay} from './InkConstructionOverlay';
import {FrictionBattlefield} from './FrictionBattlefield';
import {runtimeAssets} from './runtime-assets';
import {runtimeManifest} from './runtime-manifest';
import {subShotSequence} from './shots';

const CREAM = '#F4E8CF';
const INK = '#171510';
const GOLD = '#B8872D';
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (v: number) => {
  const t = clamp01(v);
  return t * t * (3 - 2 * t);
};
const phase = (seconds: number, start: number, end: number) => smooth((seconds - start) / (end - start));

// This composition is intentionally a single 15-second production proof. It must not cycle
// through runtime beats because changing the master artwork mid-sequence creates an artificial
// reset and makes the drawing read like a slideshow rather than authored 2D animation.
const beat = runtimeManifest.beats.find((candidate) => candidate.reveal) ?? runtimeManifest.beats[0];

export type ProductionDrawingTestProps = {
  masterPathOverride?: string;
};

export const ProductionDrawingTest: React.FC<ProductionDrawingTestProps> = ({masterPathOverride}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const seconds = frame / fps;
  const subShots = useMemo(() => subShotSequence(beat.visual_role, 0), []);
  const shot = subShots[0];
  const characterRef = beat.asset_refs.find((ref) => runtimeManifest.asset_kinds?.[ref] === 'character' && runtimeAssets[ref])
    ?? beat.asset_refs.find((ref) => runtimeAssets[ref])
    ?? 'karna';
  const regions = useMemo(() => subjectRelativeConstruction({focusX: shot.focusX, focusY: shot.focusY}), [shot.focusX, shot.focusY]);

  // Match the visual acceptance target: recognizable construction first, dense ink second, pigment last.
  const ink = phase(seconds, 0.65, 9.1);
  const contourProgress = clamp01(Math.pow(ink, 0.62) * 1.28);
  const wash = phase(seconds, 9.15, 11.7);
  const settle = phase(seconds, 11.5, 15);
  const scale = interpolate(settle, [0, 1], [1, 1.035]);
  const environmentProgress = phase(seconds, 0.35, 3.4);
  const characterSrc = masterPathOverride
    ? staticFile(masterPathOverride.replace(/^\/+/, ''))
    : staticFile(runtimeAssets[characterRef].replace(/^\/+/, ''));

  return <AbsoluteFill style={{background: CREAM, color: INK, overflow: 'hidden'}}>
    <div style={{position: 'absolute', inset: 0, opacity: interpolate(ink, [0, 0.22, 0.7, 1], [0.46, 0.32, 0.24, 0.42])}}>
      <FrictionBattlefield progress={environmentProgress} scene={0} intensity={0.95} />
    </div>

    <div style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>
      <div style={{position: 'absolute', top: 58, left: 62, right: 62, display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 5, opacity: 0.22}}>
        <div style={{fontFamily: 'Georgia, serif', fontSize: 18, letterSpacing: 5, fontWeight: 700}}>KATHAAYA</div>
        <div style={{fontFamily: 'Arial, sans-serif', fontSize: 11, letterSpacing: 3}}>2D MOTION STUDY</div>
      </div>
    </div>

    <div style={{position: 'absolute', inset: 0, transform: `scale(${scale})`, transformOrigin: '50% 52%'}}>
      <div style={{position: 'absolute', left: '26%', width: '72%', top: '8%', bottom: '0%', overflow: 'hidden'}}>
        <ProgressiveArtwork
          src={characterSrc}
          inkProgress={ink}
          washProgress={wash}
          regions={regions}
          style={{objectFit: 'contain', objectPosition: `${shot.focusX}% ${shot.focusY}%`}}
        />
        <InkConstructionOverlay regions={regions} progress={contourProgress} showGuide={contourProgress < 0.5} />
      </div>
    </div>

    <div style={{position: 'absolute', left: 58, right: 58, bottom: 48, display: 'flex', justifyContent: 'space-between', alignItems: 'end', zIndex: 5, fontFamily: 'Arial, sans-serif', opacity: interpolate(wash, [0, 0.5, 1], [0, 0.18, 0.12])}}>
      <div style={{fontSize: 10, letterSpacing: 2}}>FRICTION 2D LAYERS</div>
      <div style={{textAlign: 'right', color: GOLD, fontSize: 10, letterSpacing: 2}}>INK → WASH → MOTION</div>
    </div>
  </AbsoluteFill>;
};
