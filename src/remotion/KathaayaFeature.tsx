import React from 'react';
import {Series} from 'remotion';
import {KathaayaOpeningIdent} from './KathaayaOpeningIdent';
import {MythicShort} from './MythicShort';
import {IDENT_DURATION_SECONDS, identDurationSeconds} from '../shared/ident';

export const IDENT_FPS = 30;
// Kept as the LONGFORM/Studio-preview default — see identFramesFor for the actual per-render,
// format-aware value used by both this component and Root.tsx's calculateMetadata.
export const IDENT_FRAMES = IDENT_DURATION_SECONDS * IDENT_FPS;

export function identFramesFor(format?: 'SHORT' | 'LONGFORM'): number {
  return Math.round(identDurationSeconds(format) * IDENT_FPS);
}

/**
 * The composition `produce.ts` actually renders (hardcoded as `remotion render ... MythicShort`,
 * so this keeps that id) is registered against THIS wrapper, not the story component directly —
 * every feature opens with the KATHAAYA ident, then cuts to the story. Registering it this way
 * instead of folding the ident into MythicShort.tsx itself keeps the story component's own beat/
 * frame math (which assumes frame 0 is the start of beat 1) completely untouched.
 */
type FeatureManifest = React.ComponentProps<typeof MythicShort>['manifest'];

export function KathaayaFeature({manifest}: {manifest: FeatureManifest}) {
  const identFrames = identFramesFor(manifest.format);
  const storyFrames = Math.round(manifest.duration_seconds * IDENT_FPS);
  return (
    <Series>
      <Series.Sequence durationInFrames={identFrames}>
        <KathaayaOpeningIdent compact={manifest.format !== 'LONGFORM'} />
      </Series.Sequence>
      <Series.Sequence durationInFrames={storyFrames}>
        <MythicShort manifest={manifest} />
      </Series.Sequence>
    </Series>
  );
}
