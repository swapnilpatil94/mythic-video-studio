import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';

const clamp = (value: number) => Math.max(0, Math.min(1, value));

/**
 * Final KATHAAYA finishing layer.
 *
 * This is deliberately restrained: the story and artwork remain dominant while the renderer adds
 * filmic depth, paper atmosphere, gentle camera breathing, motivated light movement and grain.
 */
export function KathayaCinematic({
  progress,
  tension = 5,
  emotional = 5,
  patternInterrupt = false,
}: {
  progress: number;
  tension?: number;
  emotional?: number;
  patternInterrupt?: boolean;
}) {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const p = clamp(progress);

  const breath = 1 + Math.sin(t * Math.PI * 2 * 0.38) * 0.006;
  const lightX = 46 + Math.sin(t * 0.17) * 13;
  const lightY = 34 + Math.cos(t * 0.13) * 9;
  const grain = 0.018 + emotional * 0.0018;
  const vignette = 0.13 + tension * 0.008;
  const haze = interpolate(p, [0, 0.5, 1], [0.02, 0.055, 0.035]);
  const interrupt = patternInterrupt
    ? Math.exp(-Math.max(0, t % 2.2) * 18) * 0.045
    : 0;

  return (
    <AbsoluteFill style={{pointerEvents: 'none', overflow: 'hidden'}}>
      <div
        style={{
          position: 'absolute',
          inset: '-4%',
          transform: `scale(${breath})`,
          transformOrigin: '50% 50%',
          background: `radial-gradient(circle at ${lightX}% ${lightY}%, rgba(255,244,213,.12), transparent 48%)`,
          mixBlendMode: 'screen',
          opacity: 0.8,
        }}
      />

      <div
        style={{
          position: 'absolute',
          inset: '-8%',
          background: `radial-gradient(ellipse at center, transparent 48%, rgba(17,14,10,${vignette}) 100%)`,
          mixBlendMode: 'multiply',
        }}
      />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(115deg, rgba(184,135,45,${haze}) 0%, transparent 34%, transparent 70%, rgba(23,21,16,${haze * 0.65}) 100%)`,
          mixBlendMode: 'soft-light',
        }}
      />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: grain,
          backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%274%27 height=%274%27 viewBox=%270 0 4 4%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%27.78%27 numOctaves=%272%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%25%27 height=%27100%25%27 filter=%27url(%23n)%27 opacity=%27.6%27/%3E%3C/svg%3E")',
          mixBlendMode: 'soft-light',
        }}
      />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(23,21,16,.08), transparent 18%, transparent 82%, rgba(23,21,16,.12))',
          opacity: 0.65,
        }}
      />

      {interrupt > 0.001 ? (
        <div style={{position: 'absolute', inset: 0, background: '#FFF7E6', opacity: interrupt}} />
      ) : null}
    </AbsoluteFill>
  );
}
