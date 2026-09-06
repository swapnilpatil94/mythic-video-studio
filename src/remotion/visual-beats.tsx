import React, {ReactNode} from 'react';
import {interpolate} from 'remotion';

export type RevealDirection = 'up' | 'down' | 'left' | 'right' | 'center';

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const smooth = (value: number) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};

export type BeatVisualProfile = {
  reveal: RevealDirection;
  wash: 'none' | 'gold' | 'red' | 'warm';
  washStrength: number;
  ink: boolean;
  textMode: 'caption' | 'keyword' | 'reveal';
};

export function profileForAnimation(animation = '', role = ''): BeatVisualProfile {
  if (animation === 'gold_highlight') return {reveal: 'center', wash: 'gold', washStrength: 0.24, ink: true, textMode: 'keyword'};
  if (animation === 'sun_pulse') return {reveal: 'center', wash: 'gold', washStrength: 0.14, ink: true, textMode: 'keyword'};
  if (animation === 'hand_reveal') return {reveal: 'right', wash: 'warm', washStrength: 0.12, ink: true, textMode: 'caption'};
  if (animation === 'gold_fade') return {reveal: 'left', wash: 'gold', washStrength: 0.18, ink: true, textMode: 'keyword'};
  if (animation === 'light_reveal') return {reveal: 'center', wash: 'warm', washStrength: 0.20, ink: true, textMode: 'reveal'};
  if (animation === 'ink_motion') return {reveal: 'left', wash: 'red', washStrength: 0.10, ink: true, textMode: 'caption'};
  if (animation === 'subtle_parallax') return {reveal: 'up', wash: 'none', washStrength: 0, ink: true, textMode: 'caption'};
  if (animation === 'ink_settle') return {reveal: 'up', wash: 'gold', washStrength: 0.10, ink: true, textMode: 'reveal'};
  return {reveal: role === 'visitor_reveal' ? 'right' : 'up', wash: 'none', washStrength: 0, ink: true, textMode: 'caption'};
}

function clipFor(direction: RevealDirection, progress: number): string {
  const p = smooth(progress) * 100;
  if (direction === 'left') return `inset(0 ${100 - p}% 0 0)`;
  if (direction === 'right') return `inset(0 0 0 ${100 - p}%)`;
  if (direction === 'down') return `inset(0 0 ${100 - p}% 0)`;
  if (direction === 'center') {
    const edge = (100 - p) / 2;
    return `inset(${edge}% ${edge}% ${edge}% ${edge}%)`;
  }
  return `inset(${100 - p}% 0 0 0)`;
}

type DrawPath = {d: string; length: number; delay: number; width: number; opacity: number};

const DRAW_PATHS: DrawPath[] = [
  {d: 'M70 330 Q250 390 180 560 T340 820 T220 1110 T420 1450 T300 1770', length: 1550, delay: 0.00, width: 9, opacity: 0.42},
  {d: 'M1010 300 Q820 460 930 650 T760 930 T900 1220 T650 1510 T790 1770', length: 1660, delay: 0.12, width: 7, opacity: 0.32},
  {d: 'M180 620 Q410 500 540 700 T880 660', length: 820, delay: 0.24, width: 6, opacity: 0.26},
];

function handPosition(direction: RevealDirection, progress: number) {
  const p = smooth(progress);
  if (direction === 'left') return {x: 1080 * (1 - p) + 42, y: 980 - p * 470, angle: -18};
  if (direction === 'right') return {x: 1080 * p - 42, y: 940 + p * 470, angle: 18};
  if (direction === 'down') return {x: 570 + Math.sin(p * Math.PI) * 170, y: 70 + p * 1760, angle: 6};
  if (direction === 'center') return {x: 540 + Math.cos(p * Math.PI * 2) * 250, y: 960 + Math.sin(p * Math.PI * 2) * 480, angle: p * 180};
  return {x: 500 + p * 120, y: 1870 - p * 1760, angle: -8};
}

function ArtistHand({direction, progress}: {direction: RevealDirection; progress: number}) {
  const p = clamp01(progress);
  if (p <= 0.02 || p >= 0.98) return null;
  const {x, y, angle} = handPosition(direction, p);
  return (
    <g transform={`translate(${x} ${y}) rotate(${angle})`} opacity={0.92}>
      <path d="M-12 34 Q-5 4 14-4 L82-72 Q94-84 104-72 Q110-62 98-48 L44 12 L112-36 Q126-44 133-31 Q138-18 124-8 L56 48 L112 14 Q126 8 132 22 Q136 34 122 42 L52 76 Q28 86 8 70Z" fill="#E7C9A4" stroke="#171510" strokeWidth="7" strokeLinejoin="round"/>
      <path d="M82-72 L104-94" stroke="#171510" strokeWidth="6" strokeLinecap="round"/>
      <circle cx="106" cy="-96" r="7" fill="#171510"/>
    </g>
  );
}

/**
 * Whiteboard draw-on primitive.
 *
 * Research basis: HandDraw-Skill uses explicit draw timelines for path-oriented
 * SVG assets; SVG stroke-dasharray/dashoffset provides deterministic path
 * progression. We keep this renderer-native and dependency-free so raster FLUX
 * masters can still use the same draw language through masks/reveal layers.
 */
function DrawSweep({direction, progress}: {direction: RevealDirection; progress: number}) {
  const p = clamp01(progress);
  const hand = handPosition(direction, p);
  return (
    <svg viewBox="0 0 1080 1920" width="100%" height="100%" style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>
      {DRAW_PATHS.map((path, index) => {
        const local = clamp01((p - path.delay) / (1 - path.delay));
        const eased = smooth(local);
        return (
          <path
            key={index}
            d={path.d}
            fill="none"
            stroke="#171510"
            strokeWidth={path.width}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={path.length}
            strokeDashoffset={path.length * (1 - eased)}
            opacity={path.opacity}
          />
        );
      })}
      <ArtistHand direction={direction} progress={p} />
      <circle cx={hand.x} cy={hand.y} r="5" fill="#171510" opacity={0.7}/>
    </svg>
  );
}

export function InkReveal({
  progress,
  direction,
  children,
  style,
}: {
  progress: number;
  direction: RevealDirection;
  children: ReactNode;
  style?: React.CSSProperties;
}) {
  const p = smooth(progress);
  const translate = interpolate(p, [0, 1], [direction === 'left' ? -24 : direction === 'right' ? 24 : 0, 0]);
  return (
    <div style={{...style, clipPath: clipFor(direction, p), transform: `${style?.transform ?? ''} translateX(${translate}px)`, overflow: 'hidden'}}>
      {children}
      <DrawSweep direction={direction} progress={p} />
    </div>
  );
}

export function WashReveal({
  progress,
  color,
  strength = 0.15,
}: {
  progress: number;
  color: 'gold' | 'red' | 'warm';
  strength?: number;
}) {
  const p = smooth(progress);
  const palette = {
    gold: '184,135,45',
    red: '142,47,36',
    warm: '214,171,104',
  }[color];
  const pulse = Math.sin(p * Math.PI) * strength;
  return (
    <div style={{position: 'absolute', inset: '-8%', pointerEvents: 'none', opacity: pulse, mixBlendMode: 'multiply', background: `radial-gradient(circle at ${25 + p * 55}% ${45 - p * 12}%, rgba(${palette},0.9), rgba(${palette},0.0) 52%)`}} />
  );
}

export function InkTransition({progress, direction = 'left'}: {progress: number; direction?: RevealDirection}) {
  const p = smooth(progress);
  const width = interpolate(p, [0, 0.55, 1], [0, 112, 0]);
  const x = direction === 'right' ? 1080 - width * 10 : direction === 'center' ? 540 - width * 5 : -width * 10;
  return <div style={{position: 'absolute', top: 0, left: x, width: `${width * 10}px`, height: '100%', background: 'linear-gradient(90deg, transparent, rgba(23,21,16,0.22), transparent)', filter: 'blur(10px)', pointerEvents: 'none', opacity: 0.7}} />;
}
