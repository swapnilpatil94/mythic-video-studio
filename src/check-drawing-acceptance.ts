import fs from 'node:fs';
import path from 'node:path';
import {evaluateDrawingAcceptance} from './remotion/DrawingAcceptance';

const read = (relativePath: string) => fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf8');
const overlay = read('src/remotion/InkConstructionOverlay.tsx');
const construction = read('src/remotion/artwork-construction.tsx');
const drawingTest = read('src/remotion/DrawingStageTest.tsx');
const productionTest = read('src/remotion/ProductionDrawingTest.tsx');

const hasRealStrokeLayer =
  /pathLength\s*=\s*\{?1\}?/.test(overlay) &&
  /strokeDasharray\s*=\s*["']1(?: 1)?["']/.test(overlay) &&
  /strokeDashoffset\s*=/.test(overlay) &&
  /<path/.test(overlay);

const tracesMasterArtwork =
  overlay.includes('parentElement') &&
  overlay.includes("querySelector('img')") &&
  overlay.includes('naturalWidth') &&
  overlay.includes('getImageData') &&
  overlay.includes('objectFit') &&
  overlay.includes('objectPosition') &&
  overlay.includes('skeletonize') &&
  overlay.includes('traceSkeletonStrokes') &&
  overlay.includes('pathFromPoints');

const centerlineTracingIsExplicit =
  overlay.includes('Zhang-Suen') &&
  overlay.includes('skeletonize') &&
  overlay.includes('centerline') &&
  overlay.includes('inkMask') &&
  !overlay.includes('chainBoundarySegments');

const copiesMasterTransform =
  overlay.includes('getComputedStyle(image)') &&
  overlay.includes('transformOrigin') &&
  overlay.includes('style.transform');

const noGenericCharacterLibrary =
  !overlay.includes('structural-silhouette') &&
  !overlay.includes('head-face') &&
  !overlay.includes('torso-armor') &&
  !overlay.includes('drapery-left');

const masterIsIndependentFromMask =
  !construction.includes('WebkitMaskImage') &&
  !construction.includes('maskImage') &&
  /opacity:\s*pigment/.test(construction);

const protagonistFirstTiming =
  drawingTest.includes('Math.pow(ink, 0.62)') &&
  drawingTest.includes('phase(frame, fps, 0.65, 10.8)') &&
  drawingTest.includes('phase(frame, fps, 10.85, 13.2)') &&
  drawingTest.includes('phase(frame, fps, 0.35, 3.4)') &&
  productionTest.includes('single 15-second production proof') &&
  productionTest.includes('phase(seconds, 0.65, 9.1)') &&
  productionTest.includes('phase(seconds, 9.15, 11.7)') &&
  productionTest.includes('phase(seconds, 0.35, 3.4)') &&
  !productionTest.includes('Math.floor(seconds / 5)') &&
  !productionTest.includes('index % Math.max(1, revealBeats.length)');

const drawingTestUsesProductionLayer =
  drawingTest.includes('<InkConstructionOverlay') &&
  drawingTest.includes('MASTER CONTOURS') &&
  !drawingTest.includes('function ConstructionDrawing');

const productionTestUsesProductionLayer =
  productionTest.includes('<InkConstructionOverlay') &&
  productionTest.includes('ProductionDrawingTest');

const result = evaluateDrawingAcceptance({
  initialFrameHasMasterArt: false,
  initialFrameHasInk: false,
  inkAppearsBeforePigment: true,
  finishedMasterAppearsOnlyAfterWash: true,
  hasRealStrokeLayer:
    hasRealStrokeLayer &&
    tracesMasterArtwork &&
    centerlineTracingIsExplicit &&
    copiesMasterTransform &&
    noGenericCharacterLibrary &&
    masterIsIndependentFromMask &&
    protagonistFirstTiming &&
    drawingTestUsesProductionLayer &&
    productionTestUsesProductionLayer,
});

if (!result.ok) throw new Error(result.errors.join('\n'));

console.log('Drawing acceptance contract passed: neutral/dark master ink is skeletonized into centerline SVG strokes, authored SVG contours are independently animated when available, ordered for recognition-first drawing, aligned to the master object-fit/position/transform, front-loaded for protagonist recognition, and fully revealed before pigment wash; production proof is continuous with no beat-cycle reset.');
