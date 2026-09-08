export type DrawingAcceptanceMetrics={initialFrameHasMasterArt:boolean;initialFrameHasInk:boolean;inkAppearsBeforePigment:boolean;finishedMasterAppearsOnlyAfterWash:boolean;hasRealStrokeLayer:boolean};

export function evaluateDrawingAcceptance(m:DrawingAcceptanceMetrics):{ok:boolean;errors:string[]}{
 const errors:string[]=[];
 if(m.initialFrameHasMasterArt)errors.push('Finished/master pixels must not be visible at drawing-stage start.');
 if(m.initialFrameHasInk)errors.push('Drawing stage must begin before ink construction appears.');
 if(!m.hasRealStrokeLayer)errors.push('Drawing stage requires a real independent stroke layer; a mask/reveal of master artwork is not sufficient.');
 if(!m.inkAppearsBeforePigment)errors.push('Ink construction must precede pigment.');
 if(!m.finishedMasterAppearsOnlyAfterWash)errors.push('Master art may only resolve after ink construction and wash.');
 return {ok:errors.length===0,errors};
}
