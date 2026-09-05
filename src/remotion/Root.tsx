import React from 'react';
import {Composition} from 'remotion';
import {MythicShort} from './MythicShort';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="MythicShort"
      component={MythicShort}
      durationInFrames={75 * 30}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{manifestPath: 'examples/karna-short.json'}}
    />
  );
};
