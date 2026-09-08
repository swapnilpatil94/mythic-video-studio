import React from "react";
import {useCurrentFrame} from "remotion";
import {ConstructionRegion} from "./artwork-construction";

const INK="#171510",GOLD="#B8872D",RED="#8E2F24";
const clamp=(v:number)=>Math.max(0,Math.min(1,v));
const seeded=(seed:string,index:number)=>{let h=index*97+17;for(let i=0;i<seed.length;i++)h=Math.imul(h^seed.charCodeAt(i),16777619);return ((h>>>0)%10000)/10000};
function handPath(r:ConstructionRegion,seed:string,index:number){
 const n=r.id.includes("fine")?22:14; const pts:string[]=[];
 for(let i=0;i<n;i++){const t=i/(n-1),a=Math.PI*2*t;const wob=.78+seeded(seed,index*31+i)*.42;const x=r.x+Math.cos(a)*r.radius*wob;const y=r.y+Math.sin(a)*r.radius*wob*.72;pts.push((i?"L":"M")+x.toFixed(2)+" "+y.toFixed(2));}
 return pts.join(" ");
}
export function InkConstructionOverlay({regions,progress,opacity=1,showGuide=true,seed="kathaya"}:{regions:ConstructionRegion[];progress:number;opacity?:number;showGuide?:boolean;seed?:string}){
 const frame=useCurrentFrame(); const stableSeed=seed+":"+frame;
 return <svg viewBox="0 0 100 100" width="100%" height="100%" style={{position:"absolute",inset:0,pointerEvents:"none",opacity}}>
  {showGuide?<g opacity={.16*(1-progress)}><circle cx="50" cy="43" r="18" fill="none" stroke={GOLD} strokeWidth=".65" strokeDasharray="2 3"/><path d="M50 25 C43 42 43 66 50 92" fill="none" stroke={GOLD} strokeWidth=".65" strokeDasharray="2 3"/></g>:null}
  {regions.map((r,i)=>{const p=clamp((progress-r.start)/Math.max(.01,r.end-r.start));if(!p)return null;const d=handPath(r,stableSeed,i);return <path key={r.id} d={d} fill="none" stroke={INK} strokeWidth={Math.max(.7,r.radius*.065)} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray="1 1" strokeDashoffset={1-p} opacity={.9}/>;})}
  {regions.map((r,i)=>{const p=clamp((progress-r.start-.05)/Math.max(.01,r.end-r.start));if(p<.05)return null;return <path key={"wash-"+r.id} d={"M"+(r.x-r.radius*.65).toFixed(1)+" "+r.y.toFixed(1)+" Q"+r.x.toFixed(1)+" "+(r.y-r.radius*.45).toFixed(1)+" "+(r.x+r.radius*.65).toFixed(1)+" "+r.y.toFixed(1)} fill="none" stroke={p>.72?RED:GOLD} strokeWidth={Math.max(.35,r.radius*.022)} opacity={.22*p}/>;})}
 </svg>;
}