import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';

type FrictionBattlefieldProps = {
  progress?: number;
  scene?: number;
  intensity?: number;
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (v: number) => {
  const t = clamp01(v);
  return t * t * (3 - 2 * t);
};

/**
 * Friction-authored visual grammar implemented as deterministic Remotion vector layers.
 * The same layer contract maps to Friction SVG concepts: background, parallax groups,
 * keyframed transforms, trim-like ink entrances, ambient particles and camera drift.
 */
export const FrictionBattlefield: React.FC<FrictionBattlefieldProps> = ({progress = 1, scene = 0, intensity = 1}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const p = smooth(progress);
  const scenePhase = scene % 3;

  const cameraX = interpolate(p, [0, 1], [18, -18]) + Math.sin(t * 0.32) * 2.5;
  const cameraY = interpolate(p, [0, 1], [8, -5]) + Math.sin(t * 0.22) * 1.5;
  const skyWash = interpolate(p, [0, 0.62, 1], [0.02, 0.18, 0.42]);
  const lineReveal = interpolate(p, [0, 0.18, 0.58, 1], [0, 0.2, 0.72, 1]);
  const colorReveal = interpolate(p, [0.52, 0.82, 1], [0, 0.25, 0.9], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const dust = interpolate(p, [0, 0.55, 1], [0, 0.2, 0.55]) * intensity;

  const sunX = scenePhase === 1 ? 680 : scenePhase === 2 ? 610 : 720;
  const sunY = scenePhase === 2 ? 440 : 360;

  return (
    <AbsoluteFill style={{overflow: 'hidden', pointerEvents: 'none'}}>
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 1080 1920"
        preserveAspectRatio="xMidYMid slice"
        style={{position: 'absolute', inset: 0, transform: `translate(${cameraX}px, ${cameraY}px) scale(1.035)`, transformOrigin: '50% 52%'}}
        aria-hidden="true"
        data-friction-scene="kathaya-battlefield"
      >
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#E9D5AD" />
            <stop offset="0.48" stopColor="#F3E5C8" />
            <stop offset="1" stopColor="#C9A36A" />
          </linearGradient>
          <linearGradient id="sunGlow" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#F7E3A1" stopOpacity="0.88" />
            <stop offset="1" stopColor="#C17C35" stopOpacity="0.08" />
          </linearGradient>
          <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8D633C" stopOpacity="0.14" />
            <stop offset="1" stopColor="#3D2A1D" stopOpacity="0.58" />
          </linearGradient>
          <filter id="softGlow"><feGaussianBlur stdDeviation="22" /></filter>
          <filter id="dustBlur"><feGaussianBlur stdDeviation="2.5" /></filter>
        </defs>

        <rect width="1080" height="1920" fill="#F4E8CF" />
        <rect width="1080" height="1320" fill="url(#sky)" opacity={skyWash} />

        {/* Sun / light source: a restrained 2D-motion focal anchor. */}
        <circle cx={sunX} cy={sunY} r={180} fill="#E5B65A" opacity={colorReveal * 0.12} filter="url(#softGlow)" />
        <circle cx={sunX} cy={sunY} r={92} fill="url(#sunGlow)" opacity={colorReveal * 0.72} />
        <circle cx={sunX} cy={sunY} r={70} fill="#F6D88A" opacity={colorReveal * 0.48} />

        {/* Far mountains — low-frequency parallax. */}
        <g transform={`translate(${cameraX * -0.16} ${cameraY * -0.08})`} opacity={0.42 + lineReveal * 0.18}>
          <path d="M0 980 L130 820 L250 925 L390 720 L540 900 L690 760 L820 910 L960 700 L1080 840 L1080 1200 L0 1200 Z" fill="#71533A" opacity={colorReveal * 0.18} />
          <path d="M0 980 L130 820 L250 925 L390 720 L540 900 L690 760 L820 910 L960 700 L1080 840" fill="none" stroke="#3C3025" strokeWidth="4" opacity={lineReveal * 0.42} />
          <path d="M0 1030 L160 900 L290 970 L430 840 L560 980 L720 875 L860 970 L1000 820 L1080 900" fill="none" stroke="#5B4633" strokeWidth="3" opacity={lineReveal * 0.3} />
        </g>

        {/* Clouds are vector ribbons, not raster decoration. */}
        <g transform={`translate(${cameraX * -0.34} ${cameraY * -0.15})`} opacity={0.16 + colorReveal * 0.3}>
          <path d="M-40 530 C80 470 120 560 215 520 C300 485 355 555 420 535" fill="none" stroke="#FFF4D8" strokeWidth="42" strokeLinecap="round" />
          <path d="M650 620 C720 565 780 635 845 600 C920 560 1000 630 1130 575" fill="none" stroke="#FFF4D8" strokeWidth="34" strokeLinecap="round" />
        </g>

        {/* Ink-first battlefield horizon. */}
        <g transform={`translate(${cameraX * -0.5} ${cameraY * -0.24})`} opacity={lineReveal}>
          {Array.from({length: 15}).map((_, i) => {
            const x = 20 + i * 78;
            const h = 90 + ((i * 31) % 75);
            return <path key={`s-${i}`} d={`M${x} 1160 L${x + 2} ${1160 - h} M${x - 24} ${1160 - h + 24} L${x + 2} ${1160 - h} L${x + 28} ${1160 - h + 22}`} fill="none" stroke="#2E251E" strokeWidth="4" strokeLinecap="round" opacity={0.55} />;
          })}
          <path d="M0 1165 C160 1110 310 1175 480 1135 C650 1095 850 1160 1080 1110" fill="none" stroke="#35291F" strokeWidth="5" opacity="0.58" />
        </g>

        {/* Midground army / chariot rhythm gives the frame a 2D-film sense of scale. */}
        <g transform={`translate(${cameraX * -0.72} ${cameraY * -0.34})`} opacity={lineReveal * 0.92}>
          {Array.from({length: 9}).map((_, i) => {
            const x = 50 + i * 125;
            const y = 1215 + (i % 2) * 18;
            const scale = 0.7 + (i % 3) * 0.08;
            return (
              <g key={`army-${i}`} transform={`translate(${x} ${y}) scale(${scale})`}>
                <circle cx="0" cy="-46" r="18" fill="#3A2A20" opacity="0.82" />
                <path d="M-25 0 Q0 -70 25 0 L32 62 L-32 62 Z" fill="#3A2A20" opacity="0.78" />
                <path d="M0 -5 L0 -150 M-28 -110 L0 -150 L30 -110" fill="none" stroke="#3A2A20" strokeWidth="5" />
                <path d="M-8 -95 L8 -95" stroke="#E0B45D" strokeWidth="3" opacity={colorReveal * 0.8} />
              </g>
            );
          })}
          <path d="M30 1320 Q150 1260 270 1320 T520 1320 T770 1320 T1050 1320" fill="none" stroke="#30231B" strokeWidth="8" opacity="0.65" />
        </g>

        {/* Hero flags use authored keyframe-like motion rather than random jitter. */}
        <g transform={`translate(${cameraX * -0.9} ${cameraY * -0.48})`} opacity={0.72 + colorReveal * 0.25}>
          {[120, 430, 790, 980].map((x, i) => {
            const wave = Math.sin(t * (1.4 + i * 0.13) + i) * 10;
            return (
              <g key={`flag-${i}`}>
                <path d={`M${x} 1260 L${x} 850`} stroke="#2D241D" strokeWidth="5" />
                <path d={`M${x} 875 Q${x + 90 + wave} 900 ${x + 155} 870 Q${x + 90 + wave} 940 ${x} 915 Z`} fill={i % 2 ? '#8E2F24' : '#B8872D'} opacity={colorReveal * 0.8} />
                <path d={`M${x} 875 Q${x + 90 + wave} 900 ${x + 155} 870`} fill="none" stroke="#35271D" strokeWidth="3" opacity={lineReveal * 0.8} />
              </g>
            );
          })}
        </g>

        {/* Foreground dust: slow parallax particles, intentionally sparse. */}
        <g opacity={dust * 0.55} filter="url(#dustBlur)">
          {Array.from({length: 24}).map((_, i) => {
            const baseX = (i * 173) % 1080;
            const baseY = 1080 + ((i * 83) % 600);
            const drift = (t * (7 + (i % 4) * 2) + i * 29) % 170;
            return <circle key={`dust-${i}`} cx={(baseX + drift) % 1080} cy={baseY - Math.sin(t * 0.4 + i) * 16} r={2 + (i % 3)} fill="#D6B47A" />;
          })}
        </g>

        <path d="M0 1320 C220 1270 420 1360 620 1305 C820 1250 980 1320 1080 1280 L1080 1920 L0 1920 Z" fill="url(#ground)" opacity={0.5 + colorReveal * 0.3} />
        <path d="M0 1320 C220 1270 420 1360 620 1305 C820 1250 980 1320 1080 1280" fill="none" stroke="#3A2A20" strokeWidth="5" opacity={lineReveal * 0.55} />

        {/* Paper edge / filmic ink frame. */}
        <rect x="34" y="34" width="1012" height="1852" rx="12" fill="none" stroke="#6D5137" strokeWidth="3" opacity="0.32" />
      </svg>

      <AbsoluteFill style={{background: 'radial-gradient(circle at 50% 38%, transparent 0 38%, rgba(25,18,12,.12) 72%, rgba(18,13,9,.36) 100%)', opacity: 0.8}} />
      <AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(255,246,220,.12), transparent 28%, transparent 72%, rgba(29,19,13,.2))', mixBlendMode: 'multiply', opacity: 0.8}} />
    </AbsoluteFill>
  );
};
