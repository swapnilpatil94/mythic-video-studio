import React from 'react';
import {Composition} from 'remotion';
import {MythicShort} from './MythicShort';
import {runtimeManifest} from './runtime-manifest';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="MythicShort"
      component={MythicShort}
      durationInFrames={Math.round(runtimeManifest.duration_seconds * 30)}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{manifest: runtimeManifest}}
    />
  );
};
