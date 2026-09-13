import React from 'react';
import {Composition} from 'remotion';
import {KathaayaFeature, IDENT_FRAMES} from './KathaayaFeature';
import {KathaayaOpeningIdent} from './KathaayaOpeningIdent';
import {DrawingStageTest} from './DrawingStageTest';
import {ProductionDrawingTest} from './ProductionDrawingTest';
import {PuppetTest, PuppetTestIndra} from './PuppetTest';
import {runtimeManifest} from './runtime-manifest';
import {resolveOrientation} from '../shared/orientation';

const rendererManifest = {
  ...runtimeManifest,
  characters: [...runtimeManifest.characters],
  beats: runtimeManifest.beats.map((beat) => ({
    ...beat,
    asset_refs: [...beat.asset_refs],
  })),
};


export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="MythicShort"
        component={KathaayaFeature}
        durationInFrames={IDENT_FRAMES + Math.round(runtimeManifest.duration_seconds * 30)}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{manifest: rendererManifest}}
        // Width/height/durationInFrames above are just the Studio-preview defaults (whatever
        // runtimeManifest currently is); calculateMetadata re-derives all three from whichever
        // manifest a given render actually passes in, so `remotion render ... --props='{"manifest":
        // ...}'` renders each project at its own correct orientation and length rather than
        // whatever project happened to be open in Studio last.
        calculateMetadata={({props}) => {
          const manifest = props.manifest as {format?: 'SHORT' | 'LONGFORM'; duration_seconds: number};
          const {width, height} = resolveOrientation(manifest);
          return {width, height, durationInFrames: IDENT_FRAMES + Math.round(manifest.duration_seconds * 30)};
        }}
      />
      <Composition
        id="KathaayaOpeningIdent"
        component={KathaayaOpeningIdent}
        durationInFrames={IDENT_FRAMES}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{}}
      />
      <Composition
        id="DrawingStageTest"
        component={DrawingStageTest}
        durationInFrames={15 * 30}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{masterPath: 'generated/karna-full-journey/karna-karna.png'}}
      />
      <Composition
        id="ProductionDrawingTest"
        component={ProductionDrawingTest}
        durationInFrames={15 * 30}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{}}
      />
      <Composition
        id="PuppetTest"
        component={PuppetTest}
        durationInFrames={10 * 30}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{}}
      />
      <Composition
        id="PuppetTestIndra"
        component={PuppetTestIndra}
        durationInFrames={10 * 30}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{}}
      />
    </>
  );
};
