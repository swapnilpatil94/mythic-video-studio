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

const revealBeats = runtimeManifest.beats.filter((beat) => beat.reveal && beat.asset_refs.some((ref) => runtimeAssets[ref]));

function beatForIndex(index: number) {
  return revealBeats[index % Math.max(1, revealBeats.length)];
}

export const ProductionDrawingTest: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const seconds = frame / fps;
  const segment = Math.min(2, Math.floor(seconds / 5));
  const beat = beatForIndex(segment);
  const local = clamp01((seconds - segment * 5) / 5);
  const subShots = useMemo(() => subShotSequence(beat.visual_role, segment), [beat.visual_role, segment]);
  const shot = subShots[0];
  const characterRef = beat.asset_refs.find((ref) => runtimeManifest.asset_kinds?.[ref] === 'character' && runtimeAssets[ref])
    ?? beat.asset_refs.find((ref) => runtimeAssets[ref]);
  const regions = useMemo(() => subjectRelativeConstruction({focusX: shot.focusX, focusY: shot.focusY}), [shot.focusX, shot.focusY]);

  // Ink remains the dominant authored event. The environment animates independently so the shot
  // reads as 2D film rather than a static portrait on a card.
  const ink = interpolate(local, [0.03, 0.78], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const contourProgress = clamp01(ink * 1.28);
  const wash = interpolate(local, [0.8, 1], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const settle = interpolate(local, [0.82, 1], [0, 1]);
  const scale = interpolate(settle, [0, 1], [1, 1.035]);
  const sceneProgress = clamp01(contourProgress * 0.9 + wash * 0.35);

  if (!characterRef) return <AbsoluteFill style={{background: CREAM}}/>;

  return <AbsoluteFill style={{background: CREAM, color: INK, overflow: 'hidden'}}>
    <FrictionBattlefield progress={sceneProgress} scene={segment} intensity={1.15} />

    <div style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>
      <div style={{position: 'absolute', top: 58, left: 62, right: 62, display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 5, opacity: 0.22}}>
        <div style={{fontFamily: 'Georgia, serif', fontSize: 18, letterSpacing: 5, fontWeight: 700}}>KATHAAYA</div>
        <div style={{fontFamily: 'Arial, sans-serif', fontSize: 11, letterSpacing: 3}}>2D MOTION STUDY</div>
      </div>
    </div>

    <div style={{position: 'absolute', inset: 0, transform: `scale(${scale})`, transformOrigin: '50% 52%'}}>
      <div style={{position: 'absolute', left: '26%', width: '72%', top: '8%', bottom: '0%', overflow: 'hidden'}}>
        <ProgressiveArtwork
          src={staticFile(runtimeAssets[characterRef])}
          inkProgress={ink}
          washProgress={wash}
          regions={regions}
          style={{objectFit: 'contain', objectPosition: `${shot.focusX}% ${shot.focusY}%`}}
        />
        <InkConstructionOverlay regions={regions} progress={contourProgress} showGuide={contourProgress < 0.84} />
      </div>
    </div>

    <div style={{position: 'absolute', left: 58, right: 58, bottom: 48, display: 'flex', justifyContent: 'space-between', alignItems: 'end', zIndex: 5, fontFamily: 'Arial, sans-serif', opacity: interpolate(wash, [0, 0.5, 1], [0, 0.18, 0.12])}}>
      <div style={{fontSize: 10, letterSpacing: 2}}>FRICTION 2D LAYERS</div>
      <div style={{textAlign: 'right', color: GOLD, fontSize: 10, letterSpacing: 2}}>INK → WASH → MOTION</div>
    </div>
  </AbsoluteFill>;
};
