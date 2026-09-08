import {evaluateDrawingAcceptance} from './remotion/DrawingAcceptance';

const result=evaluateDrawingAcceptance({
  initialFrameHasMasterArt:false,
  initialFrameHasInk:false,
  inkAppearsBeforePigment:true,
  finishedMasterAppearsOnlyAfterWash:true,
  hasRealStrokeLayer:true,
});
if(!result.ok) throw new Error(result.errors.join('\n'));
console.log('Drawing acceptance contract passed.');
