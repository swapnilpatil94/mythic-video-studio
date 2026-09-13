import React from 'react';
import {useCurrentFrame, useVideoConfig} from 'remotion';

/**
 * A handful of drifting particles layered over a scene — the piece that was still missing after
 * the ambient displacement-warp on environments (see puppet-regions.ts): that gives a background
 * its own slow internal motion, but a real "alive" frame also has something small moving *through*
 * the space in front of it — embers, dust, sparkle, mist. Deliberately cheap (styled divs, no new
 * FLUX assets, no new fonts/images) so it can sit on every beat without adding render risk.
 *
 * Positions/phases are derived from a seeded hash, not Math.random(), so the same beat produces
 * the same particle layout on every render (a real requirement for Remotion, which re-evaluates
 * the whole tree per frame and needs deterministic output).
 */
export type ParticleVariant = 'ember' | 'sparkle' | 'dust' | 'mist';

// First pass used colors picked for "what an ember/dust mote conceptually is" (a warm tan for
// dust, pale blue-white for mist) without checking them against this project's own cream-parchment
// background (#F4E8CF) — verified directly on a real render: at the tuned opacity/blur they were
// essentially invisible, since a warm tan mote on cream parchment has almost no luminance contrast.
// Retuned against the actual palette: dust is now a dark ink-brown (motes read as dark flecks in
// light, the way real dust in a sunbeam looks against a bright background, not light-on-light),
// mist keeps a glow (`glow` adds a soft box-shadow halo so a large soft shape still reads as a
// distinct form instead of blending into the paper), and ember/sparkle got a small brightness/
// saturation push plus their own glow for a warmer, more visible read.
const VARIANT_STYLE: Record<ParticleVariant, {color: string; glow?: string; sizeMin: number; sizeMax: number; blur: number; driftY: number; driftX: number; speed: number}> = {
  ember: {color: '#C1401A', glow: '0 0 6px 2px rgba(193,64,26,0.55)', sizeMin: 4, sizeMax: 9, blur: 1, driftY: -140, driftX: 26, speed: 0.11},
  sparkle: {color: '#E8A93B', glow: '0 0 5px 2px rgba(232,169,59,0.6)', sizeMin: 3, sizeMax: 6, blur: 0.3, driftY: -70, driftX: 18, speed: 0.18},
  dust: {color: '#4A3F2F', sizeMin: 2, sizeMax: 4, blur: 0.6, driftY: -40, driftX: 34, speed: 0.07},
  mist: {color: '#AEBFC9', glow: '0 0 24px 10px rgba(174,191,201,0.35)', sizeMin: 26, sizeMax: 55, blur: 14, driftY: -18, driftX: 10, speed: 0.04},
};

function hash(seed: string, i: number): number {
  let h = 2166136261;
  const s = `${seed}:${i}`;
  for (let c = 0; c < s.length; c++) {
    h ^= s.charCodeAt(c);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

export function AtmosphereParticles({
  seed,
  variant,
  count = 14,
  opacity = 1,
  box,
}: {
  seed: string;
  variant: ParticleVariant;
  /** How many particles — kept modest (10-18) so this reads as atmosphere, not confetti. */
  count?: number;
  opacity?: number;
  /** Optional sub-region (percent of frame) to confine particles to, e.g. just the upper half of
   * frame for embers rising from a specific spot rather than filling the whole screen. */
  box?: {left: number; top: number; width: number; height: number};
}) {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const style = VARIANT_STYLE[variant];
  const region = box ?? {left: 0, top: 0, width: 100, height: 100};

  return (
    <div style={{position: 'absolute', left: `${region.left}%`, top: `${region.top}%`, width: `${region.width}%`, height: `${region.height}%`, overflow: 'hidden', pointerEvents: 'none', opacity}}>
      {Array.from({length: count}).map((_, i) => {
        const x0 = hash(seed, i * 3) * 100;
        const y0 = hash(seed, i * 3 + 1) * 100;
        const size = style.sizeMin + hash(seed, i * 3 + 2) * (style.sizeMax - style.sizeMin);
        const phase = hash(seed, i * 5) * Math.PI * 2;
        const speedJitter = 0.7 + hash(seed, i * 5 + 1) * 0.6;
        const localT = t * style.speed * speedJitter + phase;
        // Looping drift: wraps every ~1/speed seconds so a particle re-enters rather than running
        // off-screen forever — cheap infinite atmosphere from a small fixed particle count.
        const loopT = localT % 1;
        const y = y0 + loopT * style.driftY;
        const x = x0 + Math.sin(localT * Math.PI * 2) * style.driftX * 0.3;
        const fadeIn = Math.min(1, loopT * 6);
        const fadeOut = Math.min(1, (1 - loopT) * 6);
        // Raised the floor from 0.35 to 0.55 — at the original range (0.35-0.75) combined with a
        // 2px blur, dust in particular all but disappeared on a real render even after fixing its
        // color contrast; particles need to be unambiguously visible to register as "the scene has
        // depth", not so subtle a viewer has to look for them.
        const particleOpacity = Math.min(fadeIn, fadeOut) * (0.55 + hash(seed, i * 5 + 2) * 0.4);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${x}%`,
              top: `${y}%`,
              width: size,
              height: size,
              borderRadius: '50%',
              background: style.color,
              boxShadow: style.glow,
              filter: `blur(${style.blur}px)`,
              opacity: particleOpacity,
            }}
          />
        );
      })}
    </div>
  );
}
