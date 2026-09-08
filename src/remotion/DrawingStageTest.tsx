import React from 'react';
import {AbsoluteFill, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ProgressiveArtwork, subjectRelativeConstruction} from './artwork-construction';
import {InkConstructionOverlay} from './InkConstructionOverlay';

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
 * Visual acceptance composition for the production drawing primitives.
 * The SVG construction layer traces the same master artwork rendered underneath it; no
 * character-specific or hand-authored approximation is used in this test.
 */
export const DrawingStageTest: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const ink = phase(frame, fps, 0.65, 10.8);
  const wash = phase(frame, fps, 10.4, 13.2);
  const settle = phase(frame, fps, 12.6, 15);
  const scale = interpolate(settle, [0, 1], [1, 1.055]);
  const regions = subjectRelativeConstruction({focusX: 50, focusY: 42});

  return (
    <AbsoluteFill style={{background: CREAM, color: INK, overflow: 'hidden'}}>
      <AbsoluteFill
        style={{
          opacity: 0.66,
          backgroundImage: 'radial-gradient(circle at 20% 15%, rgba(184,135,45,.09) 0 1px, transparent 1.5px), radial-gradient(circle at 70% 72%, rgba(23,21,16,.045) 0 1px, transparent 1.5px)',
          backgroundSize: '23px 23px, 31px 31px',
        }}
      />
      <div style={{position: 'absolute', top: 52, left: 62, right: 62, height: 2, background: `linear-gradient(90deg, transparent, ${GOLD}88 18%, ${GOLD}88 82%, transparent)`, opacity: 0.65}} />
      <div style={{position: 'absolute', top: 72, right: 70, fontFamily: 'Arial, sans-serif', fontSize: 20, letterSpacing: 5, fontWeight: 700, opacity: 0.52}}>KATHAAYA</div>

      <div style={{position: 'absolute', inset: 0, transform: `translate(${interpolate(settle, [0, 1], [0, -16])}px, ${interpolate(settle, [0, 1], [0, -8])}px) scale(${scale})`, transformOrigin: '50% 54%'}}>
        <div style={{position: 'absolute', left: '26%', width: '72%', top: '8%', bottom: '0%', overflow: 'hidden'}}>
          <ProgressiveArtwork
            src={staticFile('/generated/karna-full-journey/karna-karna.png')}
            inkProgress={ink}
            washProgress={wash}
            regions={regions}
            style={{objectFit: 'contain', objectPosition: '50% 50%'}}
          />
          <InkConstructionOverlay regions={regions} progress={ink} showGuide={ink < 0.84} />
        </div>
      </div>

      <div style={{position: 'absolute', left: 70, right: 70, bottom: 170, textAlign: 'center', fontFamily: 'Arial, sans-serif', fontSize: 21, letterSpacing: 2, opacity: interpolate(wash, [0.2, 0.7, 1], [0, 0.55, 0.35], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}}>
        MASTER CONTOURS  →  INK CONSTRUCTION  →  PIGMENT WASH
      </div>
      <div style={{position: 'absolute', bottom: 78, left: 0, right: 0, textAlign: 'center', fontFamily: 'Arial, sans-serif', fontSize: 18, letterSpacing: 4, opacity: 0.35}}>
        DRAWING STAGE TEST • {t.toFixed(1)}s
      </div>
    </AbsoluteFill>
  );
};
