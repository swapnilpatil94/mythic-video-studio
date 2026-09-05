import React, {useMemo} from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';

const INK = '#171510';
const CREAM = '#F4E8CF';
const GOLD = '#B8872D';
const RED = '#8E2F24';

type Manifest = {
  title: string;
  duration_seconds: number;
  beats: Array<{
    beat_id: string;
    duration_seconds: number;
    visual_role: string;
    asset_refs: string[];
    camera?: string;
    animation?: string;
    text?: string;
  }>;
};

type Beat = Manifest['beats'][number] & {start: number; end: number; label: string};

function SketchSun({opacity = 1}: {opacity?: number}) {
  return <g opacity={opacity}>
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

function KarnaFigure({progress}: {progress: number}) {
  const reveal = interpolate(progress, [0, 1], [900, 0]);
  return <g transform="translate(540 1120)">
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
  const draw = interpolate(local, [0, 0.35, 1], [0, 0.65, 1]);
  const camera = interpolate(local, [0, 1], [1.08, 1]);
  const titleOpacity = interpolate(local, [0, 0.18, 0.8, 1], [0, 1, 1, 0]);
  const isVisitor = beat.visual_role.includes('visitor') || beat.visual_role === 'decision' || beat.visual_role === 'request' || beat.visual_role === 'sacrifice';
  const isArmor = beat.visual_role.includes('armor') || beat.visual_role === 'sacrifice';
  const isThreat = beat.visual_role === 'threat' || beat.visual_role === 'stakes';

  return <AbsoluteFill style={{backgroundColor: CREAM, fontFamily: 'Noto Sans Devanagari, Noto Sans, sans-serif', color: INK}}>
    <AbsoluteFill style={{transform: `scale(${camera})`, transformOrigin: '50% 50%'}}>
      <svg width="100%" height="100%" viewBox="0 0 1080 1920">
        <rect width="1080" height="1920" fill={CREAM}/>
        <path d="M70 90 Q540 40 1010 90 M70 1830 Q540 1880 1010 1830" fill="none" stroke={INK} strokeWidth="4" opacity="0.25"/>
        <SketchSun opacity={beat.visual_role === 'hook' || isArmor ? 1 : 0.25}/>
        <KarnaFigure progress={isVisitor ? 1 : draw}/>
        {isVisitor ? <Visitor progress={draw}/> : null}
        {isThreat ? <path d="M70 1450 Q250 1320 430 1460 T800 1420 T1010 1470" fill="none" stroke={RED} strokeWidth="18" opacity={draw}/> : null}
        {isArmor ? <g opacity={draw}><path d="M350 980 Q540 820 730 980" fill="none" stroke={GOLD} strokeWidth="26"/><circle cx="540" cy="980" r="22" fill={GOLD}/></g> : null}
      </svg>
    </AbsoluteFill>

    <div style={{position: 'absolute', top: 95, left: 70, right: 70, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
      <div style={{fontSize: 24, letterSpacing: 5, fontWeight: 700}}>MYTHIC STORIES</div>
      <div style={{fontSize: 22, letterSpacing: 2, opacity: 0.55}}>SOURCE • STORY • REVEAL</div>
    </div>

    <div style={{position: 'absolute', left: 70, right: 70, bottom: 120, opacity: titleOpacity}}>
      <div style={{fontSize: 60, lineHeight: 1.1, fontWeight: 800, maxWidth: 900}}>{beat.text}</div>
      <div style={{marginTop: 24, fontSize: 24, letterSpacing: 4, color: RED}}>{beat.label}</div>
    </div>

    <div style={{position: 'absolute', left: 70, bottom: 55, fontSize: 18, opacity: 0.45}}>
      hand-illustrated • procedural motion
    </div>
  </AbsoluteFill>;
};
