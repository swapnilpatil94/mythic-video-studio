import React from 'react';
import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {BRAND_NAME, BRAND_TAGLINE} from '../shared/brand';

const INK = '#171510';
const GOLD = '#B8872D';
const CREAM = '#F4E8CF';
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/**
 * The studio ident that opens every KATHAAYA feature — a brief "who made this" beat before the
 * story begins, the same job a production-company logo bumper does in a real film. Built entirely
 * from code (SVG + CSS), not a raster logo file: no such asset exists yet (`brandLogoAvailable` is
 * false — see runtime-brand.ts), and after this session's FLUX-generated assets turned up a wrong
 * national flag and a watermarked off-model character, a hand-authored mark is the safer choice for
 * something that has to appear at the front of every single video, not a one-off background.
 *
 * Timing (30fps, ~3s total): ink field settles in → a hand-drawn seal ring draws itself → the
 * wordmark and tagline resolve out of an ink-bleed blur → a brief hold → fades to black, which the
 * story then cuts in under (see KathaayaFeature.tsx's <Series>).
 */
export function KathaayaOpeningIdent() {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;

  const fieldIn = interpolate(t, [0, 0.25], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const ringProgress = clamp01(interpolate(t, [0.35, 1.35], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}));
  const flourishProgress = clamp01(interpolate(t, [1.0, 1.7], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}));
  const wordScale = spring({frame: frame - 0.85 * fps, fps, config: {damping: 14, stiffness: 90, mass: 0.8}});
  const wordOpacity = interpolate(t, [0.85, 1.25], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const wordBlur = interpolate(t, [0.85, 1.4], [10, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const taglineOpacity = interpolate(t, [1.5, 1.9], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const holdOut = interpolate(t, [2.55, 2.95], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  return (
    <AbsoluteFill style={{backgroundColor: INK}}>
      <AbsoluteFill style={{opacity: fieldIn * holdOut, alignItems: 'center', justifyContent: 'center'}}>
        <div style={{position: 'relative', width: 420, height: 420, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <svg width={420} height={420} viewBox="0 0 420 420" style={{position: 'absolute', inset: 0}} aria-hidden>
            <circle cx="210" cy="210" r="172" fill="none" stroke={GOLD} strokeWidth="3" strokeLinecap="round" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - ringProgress} opacity={0.9} />
            <circle cx="210" cy="210" r="184" fill="none" stroke={GOLD} strokeWidth="1" pathLength={1} strokeDasharray="1" strokeDashoffset={1 - ringProgress} opacity={0.35} />
            {/* A single brush-stroke flourish inside the ring — an ink chop's hand-cut feel, not a
               specific glyph, to avoid the font/rendering-accuracy risk a real Devanagari character
               path would carry for a mark that has to look right on every single render. */}
            <path
              d="M130 235 C 165 165, 255 165, 290 235 C 265 210, 235 198, 210 198 C 185 198, 155 210, 130 235 Z"
              fill="none"
              stroke={GOLD}
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength={1}
              strokeDasharray="1"
              strokeDashoffset={1 - flourishProgress}
              opacity={0.95}
            />
          </svg>
          <div
            style={{
              position: 'relative',
              textAlign: 'center',
              opacity: wordOpacity,
              transform: `scale(${0.85 + wordScale * 0.15})`,
              filter: `blur(${wordBlur}px)`,
            }}
          >
            <div style={{fontSize: 52, fontWeight: 800, letterSpacing: 6, color: CREAM}}>{BRAND_NAME}</div>
          </div>
        </div>
        <div style={{position: 'absolute', bottom: '30%', left: 0, right: 0, textAlign: 'center', opacity: taglineOpacity}}>
          <div style={{fontSize: 17, fontWeight: 600, letterSpacing: 4, color: GOLD}}>{BRAND_TAGLINE}</div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
