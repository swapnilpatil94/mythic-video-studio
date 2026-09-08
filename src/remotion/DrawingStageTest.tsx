import React from 'react';
import {AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';

const CREAM = '#F4E8CF';
const INK = '#171510';
const GOLD = '#B8872D';
const RED = '#8E2F24';

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const smooth = (value: number) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};

const phase = (frame: number, fps: number, start: number, end: number) =>
  smooth((frame - start * fps) / Math.max(1, (end - start) * fps));

const drawOffset = (progress: number) => 1 - clamp01(progress);

function DrawPath({
  d,
  progress,
  width = 10,
  opacity = 1,
  color = INK,
}: {
  d: string;
  progress: number;
  width?: number;
  opacity?: number;
  color?: string;
}) {
  return (
    <path
      d={d}
      pathLength={1}
      fill="none"
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray="1 1"
      strokeDashoffset={drawOffset(progress)}
      opacity={opacity}
    />
  );
}

/**
 * A deliberately small construction study, not a replacement renderer.
 * It proves the desired KATHAAYA rhythm with path-oriented ink construction,
 * then hands off to the real generated Karna artwork for the finished frame.
 * The real asset is never revealed by a rectangular mask.
 */
export const DrawingStageTest: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;

  const anticipation = phase(frame, fps, 0.0, 1.15);
  const structure = phase(frame, fps, 1.0, 4.8);
  const detail = phase(frame, fps, 3.4, 7.0);
  const wash = phase(frame, fps, 6.0, 8.5);
  const finish = phase(frame, fps, 8.0, 10.0);
  const camera = phase(frame, fps, 9.2, 15.0);

  const finalOpacity = interpolate(finish, [0, 0.55, 1], [0, 0.94, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const finalScale = interpolate(camera, [0, 1], [0.985, 1.055], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const finalX = interpolate(camera, [0, 1], [0, -18], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const finalY = interpolate(camera, [0, 1], [0, -10], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{backgroundColor: CREAM, color: INK, overflow: 'hidden'}}>
      <AbsoluteFill
        style={{
          backgroundImage:
            'radial-gradient(circle at 20% 15%, rgba(184,135,45,0.08) 0 1px, transparent 1px), radial-gradient(circle at 80% 72%, rgba(23,21,16,0.045) 0 1px, transparent 1px)',
          backgroundSize: '23px 23px, 31px 31px',
          opacity: 0.7,
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: 52,
          left: 62,
          right: 62,
          height: 2,
          background: `linear-gradient(90deg, transparent, ${GOLD}88 18%, ${GOLD}88 82%, transparent)`,
          opacity: 0.65,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 72,
          right: 70,
          fontFamily: 'Arial, sans-serif',
          fontSize: 20,
          letterSpacing: 5,
          fontWeight: 700,
          opacity: 0.52,
        }}
      >
        KATHAAYA
      </div>

      <svg
        viewBox="0 0 1080 1920"
        width="100%"
        height="100%"
        style={{position: 'absolute', inset: 0}}
      >
        <g opacity={interpolate(anticipation, [0, 1], [0.05, 0.28])}>
          {Array.from({length: 18}).map((_, i) => (
            <circle
              key={i}
              cx={360 + ((i * 83) % 360)}
              cy={330 + ((i * 137) % 760)}
              r={2 + (i % 3)}
              fill={INK}
              opacity={0.18 + (i % 4) * 0.05}
            />
          ))}
        </g>

        <g transform="translate(0 20)">
          <DrawPath
            d="M540 390 m-145 0 a145 145 0 1 0 290 0 a145 145 0 1 0 -290 0"
            progress={structure}
            width={9}
            color={GOLD}
            opacity={0.78}
          />
          {Array.from({length: 12}).map((_, i) => {
            const a = (Math.PI * 2 * i) / 12;
            const x1 = 540 + Math.cos(a) * 170;
            const y1 = 390 + Math.sin(a) * 170;
            const x2 = 540 + Math.cos(a) * 198;
            const y2 = 390 + Math.sin(a) * 198;
            return <DrawPath key={i} d={`M${x1} ${y1} L${x2} ${y2}`} progress={detail} width={7} color={GOLD} opacity={0.68} />;
          })}

          <DrawPath d="M450 1180 Q500 1030 540 1010 Q580 1030 630 1180" progress={structure} width={13} />
          <DrawPath d="M540 1015 Q540 920 540 830" progress={structure} width={11} />
          <DrawPath d="M540 830 Q500 770 470 815 Q450 855 478 900" progress={structure} width={10} />
          <DrawPath d="M540 830 Q580 770 610 815 Q630 855 602 900" progress={structure} width={10} />
          <DrawPath d="M478 900 Q540 950 602 900" progress={detail} width={8} />
          <DrawPath d="M455 1035 Q540 1085 625 1035" progress={detail} width={9} />
          <DrawPath d="M455 1035 Q410 1100 385 1220" progress={detail} width={10} />
          <DrawPath d="M625 1035 Q670 1100 695 1220" progress={detail} width={10} />
          <DrawPath d="M500 1170 Q540 1200 580 1170 L620 1490 Q540 1540 460 1490Z" progress={detail} width={11} />
          <DrawPath d="M500 1490 Q475 1600 450 1710" progress={detail} width={12} />
          <DrawPath d="M580 1490 Q605 1600 630 1710" progress={detail} width={12} />
          <DrawPath d="M450 1710 Q430 1740 405 1750 M630 1710 Q650 1740 675 1750" progress={detail} width={8} />
          <DrawPath d="M385 1220 L330 1120 L310 850" progress={structure} width={10} />
          <DrawPath d="M310 850 L300 810 L310 770 L320 810 Z" progress={detail} width={8} />

          <DrawPath d="M410 1210 Q360 1270 325 1350" progress={detail} width={8} opacity={0.72} />
          <DrawPath d="M670 1210 Q720 1270 755 1350" progress={detail} width={8} opacity={0.72} />
          <DrawPath d="M430 1490 Q540 1560 650 1490" progress={detail} width={8} color={RED} opacity={0.82} />

          <path
            d="M365 1760 Q540 1715 715 1760"
            fill="none"
            stroke={INK}
            strokeWidth={5}
            strokeDasharray="1 1"
            pathLength={1}
            strokeDashoffset={drawOffset(detail)}
            opacity={0.35}
          />
        </g>

        <g opacity={wash}>
          <path d="M420 1010 Q540 950 660 1010 L620 1500 Q540 1550 460 1500Z" fill={GOLD} opacity={0.2} />
          <path d="M430 1480 Q540 1540 650 1480" fill="none" stroke={RED} strokeWidth={22} opacity={0.18} strokeLinecap="round" />
          <circle cx="540" cy="390" r="130" fill={GOLD} opacity={0.045 + wash * 0.08} />
        </g>
      </svg>

      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: `${interpolate(structure, [0, 1], [52, 43])}%`,
          width: 38,
          height: 70,
          opacity: interpolate(structure, [0.02, 0.12, 0.9, 1], [0, 0.95, 0.9, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
          transform: 'translate(-50%, -50%) rotate(7deg)',
          pointerEvents: 'none',
        }}
      >
        <svg viewBox="0 0 38 70" width="38" height="70">
          <path d="M19 3 L29 48 L19 67 L9 48 Z" fill={INK} />
          <path d="M19 4 L23 40 L19 49 L15 40 Z" fill={GOLD} />
          <circle cx="19" cy="49" r="3" fill={RED} />
        </svg>
      </div>

      <AbsoluteFill
        style={{
          opacity: finalOpacity,
          transform: `translate(${finalX}px, ${finalY}px) scale(${finalScale})`,
          transformOrigin: '50% 54%',
        }}
      >
        <Img
          src={staticFile('/generated/karna-full-journey/karna-karna.png')}
          style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 50%'}}
        />
        <AbsoluteFill
          style={{
            background: 'linear-gradient(180deg, rgba(244,232,207,0.03), transparent 28%, rgba(184,135,45,0.045) 72%, rgba(23,21,16,0.08))',
            mixBlendMode: 'multiply',
          }}
        />
      </AbsoluteFill>

      <div
        style={{
          position: 'absolute',
          left: 70,
          right: 70,
          bottom: 170,
          textAlign: 'center',
          fontFamily: 'Arial, sans-serif',
          fontSize: 25,
          letterSpacing: 2,
          opacity: interpolate(finish, [0.35, 0.8, 1], [0, 0.72, 0.45], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
        }}
      >
        INK CONSTRUCTION  →  COLOUR WASH  →  FINISHED ART
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 78,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontFamily: 'Arial, sans-serif',
          fontSize: 18,
          letterSpacing: 4,
          opacity: 0.35,
        }}
      >
        DRAWING STAGE TEST • {t.toFixed(1)}s
      </div>
    </AbsoluteFill>
  );
};
