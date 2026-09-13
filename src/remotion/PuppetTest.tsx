import React from 'react';
import {AbsoluteFill, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {CutoutPuppet} from './CutoutPuppet';
import {PUPPET_REGIONS} from './puppet-regions';

const CREAM = '#F4E8CF';
const INK = '#171510';

function PuppetTestFor({puppetRef, src, label}: {puppetRef: string; src: string; label: string}) {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const {regions, naturalWidth, naturalHeight} = PUPPET_REGIONS[puppetRef];

  return (
    <AbsoluteFill style={{background: CREAM, color: INK}}>
      <div style={{position: 'absolute', top: 40, left: 0, right: 0, textAlign: 'center', fontFamily: 'Georgia, serif', fontSize: 16, letterSpacing: 4, opacity: 0.5}}>
        {label}
      </div>
      <div style={{position: 'absolute', left: '10%', width: '80%', top: '10%', bottom: '6%'}}>
        <CutoutPuppet src={src} regions={regions} progress={t} naturalWidth={naturalWidth} naturalHeight={naturalHeight} />
      </div>
      <div style={{position: 'absolute', bottom: 30, left: 0, right: 0, textAlign: 'center', fontFamily: 'Arial, sans-serif', fontSize: 12, opacity: 0.4}}>
        {t.toFixed(1)}s
      </div>
    </AbsoluteFill>
  );
}

export const PuppetTest: React.FC = () => (
  <PuppetTestFor puppetRef="karna.master" src={staticFile('generated/karna-kavacha-ui-short/karna_master-karna_master.png')} label="PUPPET WARP TEST — real karna_master.png, no cutout layers" />
);

export const PuppetTestIndra: React.FC = () => (
  <PuppetTestFor puppetRef="indra.master" src={staticFile('generated/karna-kavacha-ui-short/indra_master-indra_master.png')} label="PUPPET WARP TEST — real indra_master.png, no cutout layers" />
);
