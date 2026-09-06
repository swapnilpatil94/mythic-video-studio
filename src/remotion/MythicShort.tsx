import React, {useMemo} from 'react';
import {AbsoluteFill, Audio, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {runtimeAssets} from './runtime-assets';
import {runtimeAudio} from './runtime-audio';
import {runtimeTiming} from './runtime-timing';
import {cameraMotion, drawRevealProgress, layerTransform} from './motion';
import {InkReveal, InkTransition, WashReveal, profileForAnimation} from './visual-beats';

const INK = '#171510';
const CREAM = '#F4E8CF';
const GOLD = '#B8872D';
const RED = '#8E2F24';

type Manifest = {
  title: string;
  duration_seconds: number;
  tempo_profile?: 'short' | 'medium' | 'longform';
  beats: Array<{
    beat_id: string;
    duration_seconds: number;
    visual_role: string;
    asset_refs: string[];
    camera?: string;
    animation?: string;
    text?: string;
    narration?: string;
    kinetic_keywords?: string[];
  }>;
};

type Beat = Manifest['beats'][number] & {start: number; end: number; label: string};
type WordTiming = {text: string; start_seconds: number; end_seconds: number; index: number};

function SketchSun({opacity = 1, pulse = 0}: {opacity?: number; pulse?: number}) {
  const scale = 1 + pulse * 0.06;
  return <g opacity={opacity} transform={`translate(540 390) scale(${scale}) translate(-540 -390)`}>
    <circle cx="540" cy="390" r="150" fill="none" stroke={GOLD} strokeWidth="10" opacity="0.5"/>
    <circle cx="540" cy="390" r="105" fill="none" stroke={GOLD} strokeWidth="5" opacity="0.35"/>
    {Array.from({length: 16}).map((_, i) => {
      const a = (Math.PI * 2 * i) / 16;
      const x1 = 540 + Math.cos(a) * 170;
      const y1 = 390 + Math.sin(a) * 170;
      const x2 = 540 + Math.cos(a) * 205;
      const y2 = 390 + Math.sin(a) * 205;
      return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={GOLD} strokeWidth="7"/>;
    })}
  </g>;
}

function KarnaFigure({progress, close = false}: {progress: number; close?: boolean}) {
  const reveal = interpolate(progress, [0, 1], [900, 0]);
  const scale = close ? 1.18 : 1;
  return <g transform={`translate(540 ${close ? 1140 : 1120}) scale(${scale})`}>
    <g style={{clipPath: `inset(0 0 ${reveal}px 0)`}}>
      <ellipse cx="0" cy="430" rx="250" ry="35" fill={INK} opacity="0.15"/>
      <path d="M-190 390 Q-170 40 0-30 Q170 40 190 390" fill="none" stroke={INK} strokeWidth="18" strokeLinecap="round"/>
      <circle cx="0" cy="-170" r="125" fill={CREAM} stroke={INK} strokeWidth="16"/>
      <path d="M-120-220 Q0-350 120-220" fill="none" stroke={INK} strokeWidth="18"/>
      <path d="M-105-170 Q0-110 105-170" fill="none" stroke={INK} strokeWidth="12"/>
      <circle cx="-48" cy="-185" r="10" fill={INK}/><circle cx="48" cy="-185" r="10" fill={INK}/>
      <path d="M-120-70 Q0 10 120-70 L145 210 Q0 290-145 210Z" fill={GOLD} opacity="0.72" stroke={INK} strokeWidth="15"/>
      <path d="M-145 0 L-260 170 M145 0 L260 170" stroke={INK} strokeWidth="22" strokeLinecap="round"/>
      <path d="M-260 170 L-290 330 M260 170 L290 330" stroke={INK} strokeWidth="18" strokeLinecap="round"/>
      <path d="M-120 240 L-70 470 M120 240 L70 470" stroke={INK} strokeWidth="24" strokeLinecap="round"/>
      <path d="M-150 230 Q0 330 150 230" fill="none" stroke={RED} strokeWidth="16"/>
    </g>
  </g>;
}

function Visitor({progress}: {progress: number}) {
  const x = interpolate(progress, [0, 1], [1250, 700]);
  return <g transform={`translate(${x} 1220)`}>
    <circle cx="0" cy="-120" r="95" fill={CREAM} stroke={INK} strokeWidth="14"/>
    <path d="M-110-145 Q0-260 110-145" fill="none" stroke={INK} strokeWidth="16"/>
    <path d="M-125-10 Q0-100 125-10 L145 360 Q0 450-145 360Z" fill={CREAM} stroke={INK} strokeWidth="18"/>
    <path d="M-130 60 L-280 230" stroke={INK} strokeWidth="20" strokeLinecap="round"/>
    <path d="M130 60 L280 230" stroke={INK} strokeWidth="20" strokeLinecap="round"/>
    <circle cx="-275" cy="230" r="25" fill={GOLD} stroke={INK} strokeWidth="8"/>
  </g>;
}

const labelForRole = (role: string) => role.replaceAll('_', ' ').toUpperCase();

function artDirection(role: string, index: number) {
  switch (role) {
    case 'armor_reveal': return {left: '-18%', bottom: '-3%', width: '136%', height: '92%', objectPosition: '54% 42%'};
    case 'stakes': return {left: '-4%', bottom: '2%', width: '92%', height: '84%', objectPosition: '48% 58%'};
    case 'threat': return {left: index === 0 ? '-10%' : '46%', bottom: '1%', width: index === 0 ? '68%' : '58%', height: '82%', objectPosition: 'center bottom'};
    case 'visitor_reveal': return {left: '18%', bottom: '1%', width: '72%', height: '84%', objectPosition: 'center bottom'};
    case 'request': return {left: index === 0 ? '-8%' : '38%', bottom: '3%', width: index === 0 ? '64%' : '64%', height: '78%', objectPosition: 'center bottom'};
    case 'decision': return {left: index === 0 ? '-14%' : '50%', bottom: '7%', width: index === 0 ? '70%' : '54%', height: '72%', objectPosition: 'center 35%'};
    case 'sacrifice': return {left: '-28%', bottom: '-8%', width: '156%', height: '102%', objectPosition: '55% 36%'};
    case 'reveal': return {left: index === 0 ? '0%' : '46%', bottom: '3%', width: index === 0 ? '58%' : '58%', height: '76%', objectPosition: 'center bottom'};
    case 'payoff': return {left: '-6%', bottom: '2%', width: '96%', height: '84%', objectPosition: '50% 52%'};
    default: return {left: index === 0 ? '2%' : '48%', bottom: '5%', width: index === 0 ? '56%' : '50%', height: '78%', objectPosition: 'center bottom'};
  }
}

function phaseProgress(progress: number, start: number, end: number) {
  return Math.max(0, Math.min(1, (progress - start) / Math.max(0.01, end - start)));
}

function GeneratedArtwork({beat, progress}: {beat: Beat; progress: number}) {
  const refs = beat.asset_refs.filter((ref) => runtimeAssets[ref]);
  if (refs.length === 0) return null;
  const environment = refs.find((ref) => /environment|background|battlefield|location/i.test(ref));
  const characters = refs.filter((ref) => /character|\.master/i.test(ref) || ref.includes('karna') || ref.includes('indra'));
  const other = refs.filter((ref) => ref !== environment && !characters.includes(ref));
  const profile = profileForAnimation(beat.animation, beat.visual_role);
  const entrance = interpolate(progress, [0, 0.08, 1], [0, 1, 1]);
  const camera = cameraMotion(beat.camera, progress);
  const direction = beat.camera === 'pan' ? {x: 120, y: 30} : {x: 86, y: 46};
  const environmentTransform = layerTransform(camera, 0.16, progress, direction);
  const inkProgress = phaseProgress(progress, 0.02, 0.48);
  const colorProgress = phaseProgress(progress, 0.28, 0.72);

  return <div style={{position: 'absolute', inset: 0, opacity: entrance, pointerEvents: 'none', overflow: 'hidden'}}>
    {environment ? <InkReveal progress={inkProgress} direction={profile.reveal} style={{position: 'absolute', inset: '-7%', width: '114%', height: '114%', transform: environmentTransform, transformOrigin: '50% 50%'}}>
      <Img src={staticFile(runtimeAssets[environment])} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.78, filter: 'grayscale(1) contrast(1.18)'}}/>
    </InkReveal> : null}
    {environment ? <InkReveal progress={colorProgress} direction={profile.reveal} style={{position: 'absolute', inset: '-7%', width: '114%', height: '114%', transform: environmentTransform, transformOrigin: '50% 50%'}}>
      <Img src={staticFile(runtimeAssets[environment])} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.94}}/>
    </InkReveal> : null}

    {characters.slice(0, 2).map((ref, index) => {
      const frame = artDirection(beat.visual_role, index);
      const entranceX = index === 0 ? -58 : 72;
      const bob = Math.sin(progress * Math.PI * 2 + index) * (beat.visual_role === 'decision' || beat.visual_role === 'request' ? 10 : 5);
      const baseTransform = `${layerTransform(camera, 0.76 - index * 0.08, progress, direction)} translate(${interpolate(progress, [0, 1], [entranceX, 0])}px, ${bob}px) scale(${1 + index * 0.02})`;
      return <React.Fragment key={ref}>
        <InkReveal progress={phaseProgress(progress, 0.04 + index * 0.03, 0.52 + index * 0.03)} direction={profile.reveal} style={{position: 'absolute', ...frame, transform: baseTransform, transformOrigin: 'center bottom'}}>
          <Img src={staticFile(runtimeAssets[ref])} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', objectPosition: frame.objectPosition, opacity: 0.82, filter: 'grayscale(1) contrast(1.2)'}}/>
        </InkReveal>
        <InkReveal progress={phaseProgress(progress, 0.26 + index * 0.03, 0.78 + index * 0.03)} direction={profile.reveal} style={{position: 'absolute', ...frame, transform: baseTransform, transformOrigin: 'center bottom'}}>
          <Img src={staticFile(runtimeAssets[ref])} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', objectPosition: frame.objectPosition, opacity: 0.98}}/>
          {profile.wash !== 'none' ? <WashReveal progress={colorProgress} color={profile.wash} strength={profile.washStrength}/> : null}
        </InkReveal>
      </React.Fragment>;
    })}

    {other.slice(0, 2).map((ref, index) => <React.Fragment key={ref}>
      <InkReveal progress={phaseProgress(progress, 0.10 + index * 0.04, 0.55)} direction={index === 0 ? 'center' : 'left'} style={{position: 'absolute', left: index === 0 ? '12%' : '52%', top: index === 0 ? '15%' : '34%', width: index === 0 ? '72%' : '42%', height: index === 0 ? '58%' : '42%', transform: layerTransform(camera, 0.46, progress, direction)}}>
        <Img src={staticFile(runtimeAssets[ref])} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', opacity: 0.72, filter: 'grayscale(1) contrast(1.18)'}}/>
      </InkReveal>
      <InkReveal progress={phaseProgress(progress, 0.34 + index * 0.04, 0.82)} direction={index === 0 ? 'center' : 'left'} style={{position: 'absolute', left: index === 0 ? '12%' : '52%', top: index === 0 ? '15%' : '34%', width: index === 0 ? '72%' : '42%', height: index === 0 ? '58%' : '42%', transform: layerTransform(camera, 0.46, progress, direction)}}>
        <Img src={staticFile(runtimeAssets[ref])} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', opacity: 0.92}}/>
      </InkReveal>
    </React.Fragment>)}
  </div>;
}

function BeatFX({beat, progress}: {beat: Beat; progress: number}) {
  const profile = profileForAnimation(beat.animation, beat.visual_role);
  const pulse = beat.animation === 'sun_pulse' ? Math.sin(progress * Math.PI) : 0;
  return <>
    <svg width="100%" height="100%" viewBox="0 0 1080 1920" style={{position: 'absolute', inset: 0, pointerEvents: 'none'}}>
      <SketchSun opacity={beat.visual_role === 'hook' || beat.visual_role === 'stakes' || beat.visual_role === 'payoff' ? 0.9 : 0.18} pulse={pulse}/>
      {beat.visual_role === 'threat' ? <path d="M55 1490 Q250 1320 430 1460 T800 1420 T1025 1470" fill="none" stroke={RED} strokeWidth="18" strokeLinecap="round" strokeDasharray="1300" strokeDashoffset={1300 * (1 - drawRevealProgress(progress, 0.08))} opacity="0.72"/> : null}
      {beat.visual_role === 'sacrifice' ? <path d="M250 1060 Q540 820 830 1060" fill="none" stroke={GOLD} strokeWidth="26" strokeLinecap="round" strokeDasharray="1300" strokeDashoffset={1300 * (1 - drawRevealProgress(progress, 0.1))} opacity="0.9"/> : null}
    </svg>
    {profile.wash !== 'none' ? <WashReveal progress={progress} color={profile.wash} strength={profile.washStrength * 0.7}/> : null}
    <InkTransition progress={progress} direction={profile.reveal}/>
  </>;
}

function fallbackWordTimings(text: string, start: number, end: number): WordTiming[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const weights = words.map((word) => Math.max(1, [...word].length));
  const total = weights.reduce((sum, value) => sum + value, 0);
  let cursor = start;
  return words.map((word, index) => {
    const duration = (end - start) * (weights[index] / total);
    const item = {text: word, start_seconds: cursor, end_seconds: Math.min(end, cursor + duration), index};
    cursor = item.end_seconds;
    return item;
  });
}

function KineticCaption({beat, local}: {beat: Beat; local: number}) {
  const text = (beat.narration ?? beat.text ?? '').trim();
  if (!text) return null;
  const timings = (runtimeTiming[beat.beat_id] as readonly WordTiming[] | undefined)?.length
    ? [...runtimeTiming[beat.beat_id]]
    : fallbackWordTimings(text, beat.start, beat.end);
  const now = interpolate(local, [0, 1], [beat.start, beat.end]);
  const active = timings.findIndex((word) => now >= word.start_seconds && now < word.end_seconds);
  const keywordActive = (beat.kinetic_keywords ?? []).some((candidate) => text.includes(candidate));

  return <div style={{position: 'absolute', left: 70, right: 70, bottom: 145, display: 'flex', justifyContent: 'center', pointerEvents: 'none'}}>
    <div style={{maxWidth: 960, padding: '10px 18px 14px', background: 'rgba(244,232,207,0.68)', borderBottom: `5px solid ${keywordActive ? RED : INK}`, textAlign: 'center'}}>
      <div style={{display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0 12px', alignItems: 'baseline'}}>
        {timings.map((word, index) => {
          const isActive = index === active;
          const isPast = index < active;
          const isFuture = active >= 0 && index > active;
          const scale = isActive ? 1.16 : isPast ? 1 : 0.92;
          const y = isActive ? -6 : isFuture ? 5 : 0;
          return <span key={`${word.index}-${word.text}`} style={{fontSize: isActive ? 48 : 39, lineHeight: 1.14, fontWeight: isActive ? 900 : 760, opacity: isFuture ? 0.22 : isPast ? 0.58 : 1, transform: `translateY(${y}px) scale(${scale})`, display: 'inline-block', transformOrigin: 'center bottom', textShadow: isActive ? `0 3px 0 rgba(244,232,207,0.95)` : 'none'}}>{word.text}</span>;
        })}
      </div>
    </div>
  </div>;
}

function RevealText({beat, local}: {beat: Beat; local: number}) {
  const text = (beat.narration ?? beat.text ?? '').trim();
  if (!text) return null;
  const words = text.split(/\s+/).filter(Boolean);
  const visible = Math.min(words.length, Math.max(1, Math.floor(interpolate(local, [0.08, 0.72], [0, words.length]))));
  return <div style={{position: 'absolute', left: 80, right: 80, top: 680, textAlign: 'center'}}>
    <div style={{fontSize: 72, lineHeight: 1.05, fontWeight: 900}}>
      {words.map((word, index) => <span key={`${index}-${word}`} style={{display: 'inline-block', margin: '0 7px', opacity: index < visible ? 1 : 0, transform: `translateY(${index < visible ? 0 : 18}px) scale(${index < visible ? 1 : 0.9})`}}>{word}</span>)}
    </div>
  </div>;
}

export const MythicShort: React.FC<{manifest: Manifest}> = ({manifest}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const beats = useMemo<Beat[]>(() => {
    let cursor = 0;
    return manifest.beats.map((b) => {
      const start = cursor;
      cursor += b.duration_seconds;
      return {...b, start, end: cursor, label: labelForRole(b.visual_role)};
    });
  }, [manifest]);

  const beat = beats.find((b) => t >= b.start && t < b.end) ?? beats[beats.length - 1];
  const local = Math.max(0, Math.min(1, (t - beat.start) / Math.max(0.1, beat.end - beat.start)));
  const draw = drawRevealProgress(local);
  const camera = cameraMotion(beat.camera, local);
  const isVisitor = beat.visual_role.includes('visitor') || beat.visual_role === 'decision' || beat.visual_role === 'request' || beat.visual_role === 'sacrifice';
  const isArmor = beat.visual_role.includes('armor') || beat.visual_role === 'sacrifice';
  const profile = profileForAnimation(beat.animation, beat.visual_role);
  const captionOpacity = interpolate(local, [0, 0.08, 0.92, 1], [0, 1, 1, 0]);

  return <AbsoluteFill style={{backgroundColor: CREAM, fontFamily: 'Noto Sans Devanagari, Noto Sans, sans-serif', color: INK}}>
    {runtimeAudio ? <Audio src={staticFile(runtimeAudio)} volume={1}/> : null}
    <GeneratedArtwork beat={beat} progress={local}/>

    <AbsoluteFill style={{transform: `translate(${camera.translateX * 0.18}px, ${camera.translateY * 0.18}px) scale(${camera.scale * 0.985})`, transformOrigin: '50% 50%'}}>
      <svg width="100%" height="100%" viewBox="0 0 1080 1920">
        <rect width="1080" height="1920" fill={CREAM} opacity={runtimeAssets[beat.asset_refs[0]] ? 0.10 : 1}/>
        <path d="M70 90 Q540 40 1010 90 M70 1830 Q540 1880 1010 1830" fill="none" stroke={INK} strokeWidth="4" opacity="0.25"/>
        <g style={{transform: `translate(${camera.translateX * 0.72}px, ${camera.translateY * 0.72}px)`, transformOrigin: '540px 1120px'}}>
          <KarnaFigure progress={isVisitor ? 1 : draw} close={isArmor}/>
          {isVisitor ? <Visitor progress={draw}/> : null}
        </g>
      </svg>
    </AbsoluteFill>

    <BeatFX beat={beat} progress={local}/>

    <div style={{position: 'absolute', top: 82, left: 70, right: 70, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
      <div style={{fontSize: 24, letterSpacing: 5, fontWeight: 700}}>MYTHIC STORIES</div>
      <div style={{fontSize: 22, letterSpacing: 2, opacity: 0.48}}>SOURCE • STORY • REVEAL</div>
    </div>

    {profile.textMode === 'reveal' ? <RevealText beat={beat} local={local}/> : <KineticCaption beat={beat} local={local}/>} 

    <div style={{position: 'absolute', top: 178, left: 70, right: 70, opacity: captionOpacity * 0.72, textAlign: 'center', fontSize: 18, letterSpacing: 4, color: RED}}>{beat.label}</div>

    <div style={{position: 'absolute', left: 70, bottom: 48, fontSize: 18, opacity: 0.38}}>
      hand-illustrated • ink • wash • motion
    </div>
  </AbsoluteFill>;
};
