import React from 'react';
import {Composition} from 'remotion';
import {MythicShort} from './MythicShort';
import {DrawingStageTest} from './DrawingStageTest';
import {ProductionDrawingTest} from './ProductionDrawingTest';
import {runtimeManifest} from './runtime-manifest';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="MythicShort"
        component={MythicShort}
        durationInFrames={Math.round(runtimeManifest.duration_seconds * 30)}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{manifest: runtimeManifest}}
      />
      <Composition
        id="DrawingStageTest"
        component={DrawingStageTest}
        durationInFrames={15 * 30}
        fps={30}
        width={1080}
        height={1920}
      />
      <Composition
        id="ProductionDrawingTest"
        component={ProductionDrawingTest}
        durationInFrames={15 * 30}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
