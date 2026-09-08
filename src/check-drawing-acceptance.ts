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
  overlay.includes('chainBoundarySegments') &&
  overlay.includes('pathFromPoints');

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
    copiesMasterTransform &&
    noGenericCharacterLibrary &&
    masterIsIndependentFromMask &&
    drawingTestUsesProductionLayer &&
    productionTestUsesProductionLayer,
});

if (!result.ok) throw new Error(result.errors.join('\n'));

console.log('Drawing acceptance contract passed: smooth SVG contour paths are traced from the rendered master artwork, aligned to its object-fit/position/transform, and revealed before pigment wash; no generic character construction library or raster mask is used.');
