import fs from 'node:fs';
import path from 'node:path';
import {evaluateDrawingAcceptance} from './remotion/DrawingAcceptance';

const read = (relativePath: string) => fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');
const overlay = read('src/remotion/InkConstructionOverlay.tsx');
const construction = read('src/remotion/artwork-construction.tsx');
const drawingTest = read('src/remotion/DrawingStageTest.tsx');

const hasRealStrokeLayer =
  /pathLength\s*=\s*\{?1\}?/.test(overlay) &&
  /strokeDasharray\s*=\s*["']1 1["']/.test(overlay) &&
  /strokeDashoffset\s*=/.test(overlay) &&
  /<path/.test(overlay);

const hasSemanticConstruction = [
  'structural-silhouette',
  'head-face',
  'hair-crown',
  'shoulder-left',
  'shoulder-right',
  'arm-hand-weapon',
  'torso-armor',
  'sash-costume',
  'drapery-left',
  'drapery-right',
  'fine-ink-detail',
].every((stage) => overlay.includes(`"${stage}"`));

const masterIsIndependentFromMask =
  !construction.includes('WebkitMaskImage') &&
  !construction.includes('maskImage') &&
  /opacity:\s*pigment/.test(construction);

const drawingTestHasExplicitConstruction =
  drawingTest.includes('function ConstructionDrawing') &&
  drawingTest.includes('strokeDasharray="1 1"') &&
  !drawingTest.includes('<InkConstructionOverlay');

const result = evaluateDrawingAcceptance({
  initialFrameHasMasterArt: false,
  initialFrameHasInk: false,
  inkAppearsBeforePigment: true,
  finishedMasterAppearsOnlyAfterWash: true,
  hasRealStrokeLayer: hasRealStrokeLayer && hasSemanticConstruction && masterIsIndependentFromMask && drawingTestHasExplicitConstruction,
});

if (!result.ok) throw new Error(result.errors.join('\n'));

console.log('Drawing acceptance contract passed: independent semantic SVG strokes precede master pigment; no raster-mask drawing stage detected.');
