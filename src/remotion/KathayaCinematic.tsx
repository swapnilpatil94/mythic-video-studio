import React from "react";
import {AbsoluteFill,useCurrentFrame,useVideoConfig,interpolate} from "remotion";

const clamp=(v:number)=>Math.max(0,Math.min(1,v));

export function KathayaCinematic({progress,tension=5,emotional=5,patternInterrupt=false}:{progress:number;tension?:number;emotional?:number;patternInterrupt?:boolean}){
 const frame=useCurrentFrame(); const {fps}=useVideoConfig(); const t=frame/fps;
 const breath=1+Math.sin(t*Math.PI*2*0.55)*0.008;
 const grain=0.025+emotional*0.0025;
 const vignette=0.14+tension*0.009;
 const interrupt=patternInterrupt?Math.exp(-Math.max(0,t%2.2)*20)*0.06:0;
 return <AbsoluteFill style={{pointerEvents:"none",overflow:"hidden"}}>
  <div style={{position:"absolute",inset:"-3%",transform:`scale(${breath})`,background:"radial-gradient(circle at 50% 42%,rgba(255,255,255,.07),transparent 64%)"}}/>
  <div style={{position:"absolute",inset:0,background:`radial-gradient(ellipse at center,transparent 56%,rgba(17,14,10,${vignette}) 100%)`,mixBlendMode:"multiply"}}/>
  <div style={{position:"absolute",inset:0,opacity:grain,backgroundImage:"url(\"data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%272%27 height=%272%27%3E%3Cfilter id=%27n%27%3E%3CfeTurbulence type=%27fractalNoise%27 baseFrequency=%27.72%27 numOctaves=%272%27 stitchTiles=%27stitch%27/%3E%3C/filter%3E%3Crect width=%27100%27 height=%27100%27 filter=%27url(%23n)%27 opacity=%27.55%27/%3E%3C/svg%3E\")",mixBlendMode:"soft-light"}}/>
  {interrupt>.001?<div style={{position:"absolute",inset:0,background:"#FFF",opacity:interrupt}}/>:null}
 </AbsoluteFill>;
}