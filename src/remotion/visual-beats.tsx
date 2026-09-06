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
  const dash = 1250;
  const dashOffset = dash * (1 - p);
  const translate = interpolate(p, [0, 1], [direction === 'left' ? -24 : direction === 'right' ? 24 : 0, 0]);
  return (
    <div style={{...style, clipPath: clipFor(direction, p), transform: `${style?.transform ?? ''} translateX(${translate}px)`, overflow: 'hidden'}}>
      {children}
      <svg viewBox="0 0 1080 1920" width="100%" height="100%" style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>
        <path
          d={direction === 'right' ? 'M980 260 Q760 430 900 650 T720 980 T850 1320 T600 1680' : 'M120 260 Q320 420 180 700 T360 1080 T210 1420 T470 1710'}
          fill="none"
          stroke="#171510"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={dash}
          strokeDashoffset={dashOffset}
          opacity={0.32}
        />
      </svg>
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
