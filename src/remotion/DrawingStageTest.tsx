import React from 'react';
import {AbsoluteFill, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ProgressiveArtwork, subjectRelativeConstruction} from './artwork-construction';
import {InkConstructionOverlay} from './InkConstructionOverlay';
import {FrictionBattlefield} from './FrictionBattlefield';

const CREAM = '#F4E8CF';
const INK = '#171510';
const GOLD = '#B8872D';
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (v: number) => {
  const t = clamp01(v);
  return t * t * (3 - 2 * t);
};
const phase = (frame: number, fps: number, start: number, end: number) => smooth((frame / fps - start) / (end - start));

/**
 * Cinematic acceptance composition: parchment -> Friction-style 2D environment ->
 * recognition-first ink drawing -> restrained pigment -> finished master.
 */
export const DrawingStageTest: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const ink = phase(frame, fps, 0.65, 10.8);
  const contourProgress = clamp01(ink * 1.28);
  const wash = phase(frame, fps, 10.85, 13.2);
  const settle = phase(frame, fps, 12.6, 15);
  const scale = interpolate(settle, [0, 1], [1, 1.055]);
  const sceneProgress = clamp01(contourProgress * 0.9 + wash * 0.35);
  const regions = subjectRelativeConstruction({focusX: 50, focusY: 42});

  return (
    <AbsoluteFill style={{background: CREAM, color: INK, overflow: 'hidden'}}>
      <FrictionBattlefield progress={sceneProgress} scene={0} intensity={0.9} />

      <div style={{position: 'absolute', inset: 0, opacity: interpolate(ink, [0, 0.2, 0.72, 1], [0, 0.15, 0.38, 0.12])}}>
        <div style={{position: 'absolute', top: 54, left: 64, right: 64, height: 2, background: `linear-gradient(90deg, transparent, ${GOLD}88 18%, ${GOLD}88 82%, transparent)`, opacity: 0.5}} />
        <div style={{position: 'absolute', top: 76, left: 70, fontFamily: 'Georgia, serif', fontSize: 17, letterSpacing: 6, fontWeight: 700, opacity: 0.7}}>KATHAAYA</div>
      </div>

      <div style={{position: 'absolute', inset: 0, transform: `translate(${interpolate(settle, [0, 1], [0, -16])}px, ${interpolate(settle, [0, 1], [0, -8])}px) scale(${scale})`, transformOrigin: '50% 54%'}}>
        <div style={{position: 'absolute', left: '26%', width: '72%', top: '8%', bottom: '0%', overflow: 'hidden'}}>
          <ProgressiveArtwork
            src={staticFile('/generated/karna-full-journey/karna-karna.png')}
            inkProgress={ink}
            washProgress={wash}
            regions={regions}
            style={{objectFit: 'contain', objectPosition: '50% 50%'}}
          />
          <InkConstructionOverlay regions={regions} progress={contourProgress} showGuide={contourProgress < 0.84} />
        </div>
      </div>

      <div style={{position: 'absolute', left: 70, right: 70, bottom: 82, textAlign: 'center', fontFamily: 'Georgia, serif', fontSize: 16, letterSpacing: 3, opacity: interpolate(wash, [0.2, 0.7, 1], [0, 0.28, 0.16], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}}>
        MASTER CONTOURS  →  INK CONSTRUCTION  →  PIGMENT WASH
      </div>
      <div style={{position: 'absolute', bottom: 38, left: 0, right: 0, textAlign: 'center', fontFamily: 'Arial, sans-serif', fontSize: 11, letterSpacing: 4, opacity: 0.14}}>
        2D MOTION STUDY • {t.toFixed(1)}s
      </div>
    </AbsoluteFill>
  );
};
