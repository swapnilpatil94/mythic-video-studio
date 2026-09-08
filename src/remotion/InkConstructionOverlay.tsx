import React from "react";
import {ConstructionRegion} from "./artwork-construction";

const INK = "#171510";
const GOLD = "#B8872D";
const RED = "#8E2F24";

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

type StagePath = {d: string; width?: number; color?: string; opacity?: number};

/**
 * Semantic construction library. These are deliberately human-readable contours rather than
 * circles/ellipses generated from region radii. Each path represents something an illustrator
 * would actually establish: silhouette, head, hair, shoulders, limbs, costume and detail.
 *
 * The paths are normalized to a 0..100 subject box and scaled to the resolved construction
 * bounds at render time. This keeps the animation deterministic while allowing the same drawing
 * grammar to work with different shot focus points.
 */
const STROKES: Record<string, StagePath[]> = {
  "structural-silhouette": [
    {d: "M50 8 C39 12 31 25 31 39 C31 50 27 60 20 71 C16 78 14 88 18 96"},
    {d: "M50 8 C61 12 69 25 69 39 C69 50 73 60 80 71 C84 78 86 88 82 96"},
    {d: "M22 70 C31 63 40 61 50 63 C60 61 69 63 78 70"},
  ],
  "head-face": [
    {d: "M50 10 C39 10 32 19 32 31 C32 42 39 49 50 51 C61 49 68 42 68 31 C68 19 61 10 50 10", width: 2.1},
    {d: "M40 29 Q45 26 48 29", width: 1.5},
    {d: "M52 29 Q55 26 60 29", width: 1.5},
    {d: "M49 31 Q47 36 50 37 Q53 36 51 31", width: 1.25},
    {d: "M42 42 Q50 47 58 42", width: 1.35},
  ],
  "hair-crown": [
    {d: "M33 25 Q34 12 50 7 Q66 12 67 25", width: 2.0},
    {d: "M35 23 L29 31 L38 27 L31 39", width: 1.5},
    {d: "M65 23 L71 31 L62 27 L69 39", width: 1.5},
    {d: "M40 14 L44 23 L50 11 L56 23 L61 14", color: GOLD, width: 1.2},
  ],
  "shoulder-left": [
    {d: "M48 50 Q38 51 29 58 Q23 63 20 72", width: 2.0},
    {d: "M30 58 Q27 65 27 74", width: 1.35},
  ],
  "shoulder-right": [
    {d: "M52 50 Q62 51 71 58 Q77 63 80 72", width: 2.0},
    {d: "M70 58 Q73 65 73 74", width: 1.35},
  ],
  "arm-hand-weapon": [
    {d: "M72 58 Q82 51 88 42 Q91 35 89 27", width: 2.0},
    {d: "M89 27 L92 12", width: 1.65},
    {d: "M86 43 Q90 46 93 43 Q95 40 91 38", width: 1.25},
  ],
  "torso-armor": [
    {d: "M34 57 Q50 52 66 57 L70 78 Q61 84 50 85 Q39 84 30 78 Z", width: 2.2},
    {d: "M36 61 Q50 66 64 61", width: 1.2},
    {d: "M34 69 Q50 75 66 69", width: 1.2},
  ],
  "jewelry-ornaments": [
    {d: "M42 51 Q50 55 58 51", color: GOLD, width: 1.4},
    {d: "M39 57 Q50 62 61 57", color: GOLD, width: 1.25},
    {d: "M45 55 L50 59 L55 55", color: GOLD, width: 1.15},
  ],
  "sash-costume": [
    {d: "M31 77 Q42 83 50 82 Q58 83 69 77 L75 91 Q63 97 50 96 Q37 97 25 91 Z", width: 2.0},
    {d: "M31 82 Q50 88 69 82", color: RED, width: 1.4},
    {d: "M29 88 Q50 94 71 88", width: 1.1},
  ],
  "drapery-left": [
    {d: "M32 78 Q25 84 21 96", width: 1.9},
    {d: "M38 82 Q31 90 30 99", width: 1.3},
    {d: "M28 86 Q33 88 37 91", width: 1.0},
  ],
  "drapery-right": [
    {d: "M68 78 Q75 84 79 96", width: 1.9},
    {d: "M62 82 Q69 90 70 99", width: 1.3},
    {d: "M72 86 Q67 88 63 91", width: 1.0},
  ],
  "lower-garment-feet": [
    {d: "M43 90 L40 98 L34 99", width: 1.7},
    {d: "M57 90 L60 98 L66 99", width: 1.7},
    {d: "M40 96 Q50 94 60 96", width: 1.0},
  ],
  "fine-ink-detail": [
    {d: "M38 65 L42 68 M45 68 L49 71 M53 71 L57 68 M60 68 L64 65", width: 0.9, opacity: 0.75},
    {d: "M35 74 Q50 79 65 74", width: 0.85, opacity: 0.72},
    {d: "M36 84 Q50 89 64 84", width: 0.8, opacity: 0.68},
    {d: "M42 18 Q50 14 58 18", width: 0.8, opacity: 0.65},
    {d: "M40 34 Q50 38 60 34", width: 0.75, opacity: 0.62},
  ],
};

function subjectBounds(regions: ConstructionRegion[]) {
  const left = Math.min(...regions.map((region) => region.x - region.radius));
  const right = Math.max(...regions.map((region) => region.x + region.radius));
  const top = Math.min(...regions.map((region) => region.y - region.radius));
  const bottom = Math.max(...regions.map((region) => region.y + region.radius));
  return {
    left: Math.max(0, left),
    top: Math.max(0, top),
    width: Math.max(18, Math.min(100 - Math.max(0, left), right - left)),
    height: Math.max(28, Math.min(100 - Math.max(0, top), bottom - top)),
  };
}

function Stroke({d, progress, width = 1.6, color = INK, opacity = 1}: StagePath & {progress: number}) {
  const p = clamp01(progress);
  if (p <= 0.001) return null;
  return (
    <path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      pathLength={1}
      strokeDasharray="1 1"
      strokeDashoffset={1 - p}
      opacity={opacity}
    />
  );
}

export function InkConstructionOverlay({
  regions,
  progress,
  opacity = 1,
  showGuide = true,
}: {
  regions: ConstructionRegion[];
  progress: number;
  opacity?: number;
  showGuide?: boolean;
  seed?: string;
}) {
  if (regions.length === 0) return null;

  const bounds = subjectBounds(regions);
  const ordered = regions
    .map((region) => ({region, paths: STROKES[region.id] ?? []}))
    .filter(({paths}) => paths.length > 0);

  return (
    <svg
      viewBox="0 0 100 100"
      width="100%"
      height="100%"
      style={{position: "absolute", inset: 0, pointerEvents: "none", opacity}}
    >
      {showGuide ? (
        <g opacity={0.14 * (1 - clamp01(progress))}>
          <ellipse
            cx={bounds.left + bounds.width / 2}
            cy={bounds.top + bounds.height * 0.27}
            rx={bounds.width * 0.24}
            ry={bounds.height * 0.16}
            fill="none"
            stroke={GOLD}
            strokeWidth={0.55}
            strokeDasharray="1.6 2.8"
          />
          <path
            d={`M${(bounds.left + bounds.width / 2).toFixed(2)} ${(bounds.top + bounds.height * 0.1).toFixed(2)} L${(bounds.left + bounds.width / 2).toFixed(2)} ${(bounds.top + bounds.height * 0.94).toFixed(2)}`}
            fill="none"
            stroke={GOLD}
            strokeWidth={0.45}
            strokeDasharray="1.5 3"
          />
          <path
            d={`M${(bounds.left + bounds.width * 0.22).toFixed(2)} ${(bounds.top + bounds.height * 0.38).toFixed(2)} Q${(bounds.left + bounds.width / 2).toFixed(2)} ${(bounds.top + bounds.height * 0.32).toFixed(2)} ${(bounds.left + bounds.width * 0.78).toFixed(2)} ${(bounds.top + bounds.height * 0.38).toFixed(2)}`}
            fill="none"
            stroke={GOLD}
            strokeWidth={0.4}
            strokeDasharray="1 2.5"
          />
        </g>
      ) : null}

      <g transform={`translate(${bounds.left} ${bounds.top}) scale(${bounds.width / 100} ${bounds.height / 100})`}>
        {ordered.map(({region, paths}) => {
          const localProgress = clamp01(
            (progress - region.start) / Math.max(0.01, region.end - region.start),
          );
          return (
            <g key={region.id}>
              {paths.map((path, index) => (
                <Stroke
                  key={`${region.id}-${index}`}
                  {...path}
                  progress={localProgress}
                />
              ))}
            </g>
          );
        })}
      </g>
    </svg>
  );
}
