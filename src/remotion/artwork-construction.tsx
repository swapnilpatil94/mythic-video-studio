import React from "react";
import {Img} from "remotion";

export type ConstructionRegion = {
  id: string;
  x: number;
  y: number;
  radius: number;
  start: number;
  end: number;
};

export type ConstructionSubject = {
  focusX: number;
  focusY: number;
  bounds?: {left: number; top: number; right: number; bottom: number};
  regions?: ConstructionRegion[];
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function subjectRelativeConstruction({
  focusX,
  focusY,
  bounds,
}: Omit<ConstructionSubject, "regions">): ConstructionRegion[] {
  const b = bounds ?? {
    left: focusX - 34,
    right: focusX + 34,
    top: focusY - 24,
    bottom: focusY + 48,
  };
  const w = Math.max(12, b.right - b.left);
  const h = Math.max(18, b.bottom - b.top);
  const at = (
    x: number,
    y: number,
    r: number,
    start: number,
    end: number,
    id: string,
  ): ConstructionRegion => ({
    id,
    x: Math.max(0, Math.min(100, b.left + w * x)),
    y: Math.max(0, Math.min(100, b.top + h * y)),
    radius: Math.max(3, Math.min(w, h) * r),
    start,
    end,
    
  });

  // Semantic stage metadata remains available to the renderer; it is not used as a character
  // geometry library or raster mask.
  return [
    at(0.5, 0.39, 0.23, 0, 0.18, "structural-silhouette"),
    at(0.51, 0.13, 0.17, 0.04, 0.23, "head-face"),
    at(0.34, 0.19, 0.21, 0.1, 0.3, "hair-crown"),
    at(0.31, 0.34, 0.22, 0.19, 0.39, "shoulder-left"),
    at(0.68, 0.34, 0.22, 0.22, 0.42, "shoulder-right"),
    at(0.7, 0.4, 0.2, 0.3, 0.5, "arm-hand-weapon"),
    at(0.51, 0.44, 0.25, 0.35, 0.56, "torso-armor"),
    at(0.65, 0.48, 0.18, 0.41, 0.62, "jewelry-ornaments"),
    at(0.5, 0.59, 0.28, 0.48, 0.69, "sash-costume"),
    at(0.34, 0.72, 0.29, 0.56, 0.77, "drapery-left"),
    at(0.66, 0.75, 0.3, 0.61, 0.82, "drapery-right"),
    at(0.5, 0.92, 0.25, 0.69, 0.9, "lower-garment-feet"),
    at(0.51, 0.54, 0.34, 0.76, 0.98, "fine-ink-detail"),
  ];
}

export function resolveConstructionRegions(subject: ConstructionSubject): ConstructionRegion[] | undefined {
  if (subject.regions?.length) return subject.regions;
  if (subject.bounds) return subjectRelativeConstruction(subject);
  return undefined;
}

export function ProgressiveArtwork({
  src,
  inkProgress,
  washProgress,
  regions,
  style,
}: {
  src: string;
  inkProgress: number;
  washProgress: number;
  regions?: ConstructionRegion[];
  style?: React.CSSProperties;
}) {
  // Keep the master <Img> mounted even before the drawing starts. Its opacity is zero until the
  // independent pigment wash, allowing InkConstructionOverlay to read the real source pixels at
  // frame 0 without exposing those pixels to the viewer.
  if (!regions?.length) return null;

  const common: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    ...style,
  };
  const pigment = clamp01(washProgress);

  return (
    <div style={{position: "absolute", inset: 0, opacity: pigment, pointerEvents: "none"}}>
      <Img
        src={src}
        style={{
          ...common,
          filter: "saturate(.92) contrast(1.03)",
          // Generated masters often carry their own paper-colored background. Darken compositing
          // lets that light paper disappear into the scene parchment while retaining authored ink,
          // red wash, and gold accents. This prevents a hard rectangular master boundary during
          // the pigment reveal without altering the independent construction stroke layer.
          mixBlendMode: "darken",
        }}
      />
    </div>
  );
}
