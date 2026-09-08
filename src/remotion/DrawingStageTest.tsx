import React from 'react';
import {AbsoluteFill, interpolate, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';
import {ProgressiveArtwork, subjectRelativeConstruction} from './artwork-construction';

const CREAM = '#F4E8CF';
const INK = '#171510';
const GOLD = '#B8872D';
const RED = '#8E2F24';
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const smooth = (v: number) => {
  const t = clamp01(v);
  return t * t * (3 - 2 * t);
};
const phase = (frame: number, fps: number, start: number, end: number) => smooth((frame / fps - start) / (end - start));

function InkPath({d, progress, width = 9, color = INK, opacity = 1}: {d: string; progress: number; width?: number; color?: string; opacity?: number}) {
  return <path d={d} pathLength={1} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round"
    strokeDasharray="1 1" strokeDashoffset={1 - clamp01(progress)} opacity={opacity}/>;
}

function ConstructionDrawing({frame, fps}: {frame: number; fps: number}) {
  const guide = phase(frame, fps, 0.9, 2.1);
  const face = phase(frame, fps, 1.55, 3.4);
  const crown = phase(frame, fps, 2.0, 4.0);
  const torso = phase(frame, fps, 2.65, 5.2);
  const detail = phase(frame, fps, 4.1, 7.15);
  const hatch = phase(frame, fps, 5.4, 8.0);
  const wash = phase(frame, fps, 7.0, 10.0);
  const fade = 1 - phase(frame, fps, 7.5, 10.0);
  const hatches = Array.from({length: 16}, (_, i) => ({x: 424 + (i % 4) * 44, y: 1025 + Math.floor(i / 4) * 88}));
  return <svg viewBox="0 0 1080 1920" width="100%" height="100%" style={{position: 'absolute', inset: 0, opacity: fade}}>
    <g transform="translate(0 8)">
      <InkPath d="M540 340 m-150 0 a150 150 0 1 0 300 0 a150 150 0 1 0 -300 0" progress={guide} width={8} color={GOLD} opacity={.78}/>
      {Array.from({length: 12}, (_, i) => {
        const a = (Math.PI * 2 * i) / 12;
        return <InkPath key={i} d={`M${540 + Math.cos(a) * 175} ${340 + Math.sin(a) * 175} L${540 + Math.cos(a) * 206} ${340 + Math.sin(a) * 206}`} progress={guide} width={6} color={GOLD} opacity={.65}/>;
      })}

      {/* Head and face: the first recognition milestone. */}
      <InkPath d="M545 584 Q594 600 614 646 Q622 704 584 748 Q550 770 518 744" progress={face} width={11}/>
      <InkPath d="M518 744 Q494 700 498 646 Q506 604 545 584" progress={face} width={9}/>
      <InkPath d="M559 652 Q579 642 595 653 M575 681 Q594 689 604 680 M557 716 Q578 730 596 713" progress={face} width={6}/>
      <InkPath d="M498 638 Q454 646 432 694 Q454 735 504 748" progress={face} width={13}/>
      <InkPath d="M476 622 Q500 544 550 526 Q588 536 606 582" progress={crown} width={11}/>
      <InkPath d="M474 607 L502 535 L528 578 L548 512 L574 579 L594 544 L610 610" progress={crown} width={8} color={GOLD}/>
      <InkPath d="M464 650 Q410 690 390 762 Q440 738 492 752 M458 672 Q398 740 365 814" progress={crown} width={10}/>

      {/* Neck, shoulder, weapon and hand precede the clothing. */}
      <InkPath d="M522 746 Q514 778 492 806 M582 752 Q594 786 610 808" progress={torso} width={10}/>
      <InkPath d="M490 800 Q421 802 377 868 Q348 930 362 1042" progress={torso} width={13}/>
      <InkPath d="M606 805 Q678 824 714 902 Q742 970 727 1060" progress={torso} width={13}/>
      <InkPath d="M370 695 L342 1158 M342 1158 L382 1220" progress={torso} width={10}/>
      <InkPath d="M348 760 Q371 734 396 760 L410 814 Q386 846 356 824" progress={detail} width={7}/>
      <InkPath d="M417 815 Q457 780 498 816 Q481 876 449 913" progress={detail} width={10}/>
      <InkPath d="M610 814 Q651 806 682 862 Q662 918 642 948" progress={detail} width={10}/>

      {/* Armor, ornaments and drapery are deliberately more measured. */}
      <InkPath d="M458 828 Q546 788 632 836 Q650 940 628 1020 Q546 1054 448 1016 Q430 922 458 828Z" progress={detail} width={12}/>
      <InkPath d="M456 842 Q490 874 512 842 M576 832 Q604 872 630 846 M490 928 Q540 964 598 925" progress={detail} width={7} color={GOLD}/>
      <InkPath d="M454 1000 Q540 1068 638 1002 L700 1438 Q620 1516 532 1502 Q432 1510 374 1432Z" progress={torso} width={12}/>
      <InkPath d="M410 1094 Q534 1150 667 1080 M396 1190 Q534 1248 682 1170 M390 1280 Q534 1338 690 1262 M385 1370 Q540 1430 696 1350" progress={detail} width={8}/>
      <InkPath d="M442 1012 Q540 1052 638 1008" progress={detail} width={14} color={RED} opacity={.82}/>
      <InkPath d="M420 1440 Q396 1538 385 1646 M660 1440 Q686 1530 708 1642" progress={torso} width={11}/>
      <InkPath d="M385 1646 Q358 1680 332 1684 M708 1642 Q736 1676 766 1680" progress={detail} width={8}/>
      {hatches.map(({x, y}, i) => <InkPath key={`h-${i}`} d={`M${x} ${y + 35} L${x + 60} ${y}`} progress={hatch} width={4} opacity={.46}/>) }
      <InkPath d="M408 1460 Q484 1512 538 1490 Q610 1522 686 1452" progress={detail} width={7} color={RED} opacity={.72}/>
      <path d="M430 822 Q540 780 650 826 L638 1012 Q540 1050 450 1010Z" fill={GOLD} opacity={wash * .13}/>
      <path d="M394 1080 Q540 1150 684 1080 L696 1400 Q540 1484 388 1405Z" fill={RED} opacity={wash * .08}/>
    </g>
  </svg>;
}

/** A visual acceptance composition for the reusable construction primitives. */
export const DrawingStageTest: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const t = frame / fps;
  const ink = phase(frame, fps, 5.35, 10.65);
  const colour = phase(frame, fps, 7.25, 12.55);
  const camera = phase(frame, fps, 11.7, 15);
  const scale = interpolate(camera, [0, 1], [1, 1.055]);
  return <AbsoluteFill style={{background: CREAM, color: INK, overflow: 'hidden'}}>
    <AbsoluteFill style={{opacity: .66, backgroundImage: 'radial-gradient(circle at 20% 15%, rgba(184,135,45,.09) 0 1px, transparent 1.5px), radial-gradient(circle at 70% 72%, rgba(23,21,16,.045) 0 1px, transparent 1.5px)', backgroundSize: '23px 23px, 31px 31px'}}/>
    <div style={{position: 'absolute', top: 52, left: 62, right: 62, height: 2, background: `linear-gradient(90deg, transparent, ${GOLD}88 18%, ${GOLD}88 82%, transparent)`, opacity: .65}}/>
    <div style={{position: 'absolute', top: 72, right: 70, fontFamily: 'Arial, sans-serif', fontSize: 20, letterSpacing: 5, fontWeight: 700, opacity: .52}}>KATHAAYA</div>
    <div style={{position: 'absolute', inset: 0, transform: `translate(${interpolate(camera, [0, 1], [0, -16])}px, ${interpolate(camera, [0, 1], [0, -8])}px) scale(${scale})`, transformOrigin: '50% 54%'}}>
      <ProgressiveArtwork src={staticFile('/generated/karna-full-journey/karna-karna.png')} inkProgress={ink} washProgress={colour} regions={subjectRelativeConstruction({focusX:50,focusY:42})}/>
      <ConstructionDrawing frame={frame} fps={fps}/>
    </div>
    <div style={{position: 'absolute', left: 70, right: 70, bottom: 170, textAlign: 'center', fontFamily: 'Arial, sans-serif', fontSize: 21, letterSpacing: 2, opacity: interpolate(colour, [.2, .7, 1], [0, .55, .35], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})}}>SEMANTIC INK  →  PIGMENT BLOOMS  →  HAND-PAINTED WASH</div>
    <div style={{position: 'absolute', bottom: 78, left: 0, right: 0, textAlign: 'center', fontFamily: 'Arial, sans-serif', fontSize: 18, letterSpacing: 4, opacity: .35}}>DRAWING STAGE TEST • {t.toFixed(1)}s</div>
  </AbsoluteFill>;
};
