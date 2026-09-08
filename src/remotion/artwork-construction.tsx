import React from "react";
import {Img} from "remotion";

export type ConstructionRegion={id:string;x:number;y:number;radius:number;start:number;end:number};
export type ConstructionSubject={focusX:number;focusY:number;bounds?:{left:number;top:number;right:number;bottom:number};regions?:ConstructionRegion[]};
const clamp01=(v:number)=>Math.max(0,Math.min(1,v));
export function subjectRelativeConstruction({focusX,focusY,bounds}:Omit<ConstructionSubject,"regions">):ConstructionRegion[]{
 const b=bounds??{left:focusX-34,right:focusX+34,top:focusY-24,bottom:focusY+48};
 const w=Math.max(12,b.right-b.left),h=Math.max(18,b.bottom-b.top);
 const at=(x:number,y:number,r:number,start:number,end:number,id:string)=>({id,x:Math.max(0,Math.min(100,b.left+w*x)),y:Math.max(0,Math.min(100,b.top+h*y)),radius:Math.max(3,Math.min(w,h)*r),start,end});
 return [at(.5,.39,.23,0,.18,"structural-silhouette"),at(.51,.13,.17,.04,.23,"head-face"),at(.34,.19,.21,.1,.3,"hair-crown"),at(.31,.34,.22,.19,.39,"shoulder-left"),at(.68,.34,.22,.22,.42,"shoulder-right"),at(.7,.4,.2,.3,.5,"arm-hand-weapon"),at(.51,.44,.25,.35,.56,"torso-armor"),at(.65,.48,.18,.41,.62,"jewelry-ornaments"),at(.5,.59,.28,.48,.69,"sash-costume"),at(.34,.72,.29,.56,.77,"drapery-left"),at(.66,.75,.3,.61,.82,"drapery-right"),at(.5,.92,.25,.69,.9,"lower-garment-feet"),at(.51,.54,.34,.76,.98,"fine-ink-detail")];
}

/** Regions describe where actual vector strokes should be drawn. They are not a mask for the master artwork. */
export function resolveConstructionRegions(subject:ConstructionSubject):ConstructionRegion[]|undefined{
 if(subject.regions?.length)return subject.regions;
 if(subject.bounds)return subjectRelativeConstruction(subject);
 return undefined;
}

export function ProgressiveArtwork({src,inkProgress,washProgress,regions,style}:{src:string;inkProgress:number;washProgress:number;regions?:ConstructionRegion[];style?:React.CSSProperties}){
 if(!regions?.length||inkProgress<=.001)return null;
 const common:React.CSSProperties={position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",...style};
 const pigment=clamp01(washProgress);
 return <div style={{position:"absolute",inset:0,opacity:pigment}}><Img src={src} style={{...common,filter:"saturate(.92) contrast(1.03)"}}/></div>;
}