import React, {useMemo} from 'react';
import {AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ProgressiveArtwork, subjectRelativeConstruction} from './artwork-construction';
import {InkConstructionOverlay} from './InkConstructionOverlay';
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
  const ink = interpolate(local, [0.02, 0.66], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const wash = interpolate(local, [0.34, 0.94], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const settle = interpolate(local, [0.82, 1], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const scale = interpolate(settle, [0, 1], [1, 1.035]);

  if (!characterRef) return <AbsoluteFill style={{background: CREAM}}/>;

  return <AbsoluteFill style={{background: CREAM, color: INK, overflow: 'hidden'}}>
    <div style={{position: 'absolute', top: 48, left: 58, right: 58, display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 5}}>
      <div style={{fontFamily: 'Arial, sans-serif', fontSize: 20, letterSpacing: 4, fontWeight: 700}}>KATHAAYA</div>
      <div style={{fontFamily: 'Arial, sans-serif', fontSize: 16, letterSpacing: 2, opacity: 0.55}}>PRODUCTION DRAWING TEST</div>
    </div>

    <div style={{position: 'absolute', inset: 0, transform: `scale(${scale})`, transformOrigin: '50% 52%'}}>
      <div style={{position: 'absolute', left: '26%', width: '72%', top: '8%', bottom: '0%', overflow: 'hidden'}}>
        <ProgressiveArtwork
          src={staticFile(runtimeAssets[characterRef])}
          inkProgress={ink}
          washProgress={wash}
          seed={`production-${beat.beat_id}-${characterRef}`}
          regions={regions}
          style={{objectFit: 'contain', objectPosition: `${shot.focusX}% ${shot.focusY}%`}}
        />
        <InkConstructionOverlay regions={regions} progress={ink} seed={`production-ink-${beat.beat_id}`} showGuide={ink < 0.84} />
      </div>
    </div>

    <div style={{position: 'absolute', left: 58, right: 58, bottom: 90, display: 'flex', justifyContent: 'space-between', alignItems: 'end', zIndex: 5, fontFamily: 'Arial, sans-serif'}}>
      <div>
        <div style={{fontSize: 16, letterSpacing: 2, opacity: 0.55}}>ASSET</div>
        <div style={{fontSize: 24, fontWeight: 700}}>{characterRef}</div>
      </div>
      <div style={{textAlign: 'right'}}>
        <div style={{fontSize: 16, letterSpacing: 2, color: GOLD}}>SEMANTIC CONSTRUCTION</div>
        <div style={{fontSize: 14, opacity: 0.55}}>{beat.beat_id} · {beat.visual_role}</div>
      </div>
    </div>
  </AbsoluteFill>;
};
