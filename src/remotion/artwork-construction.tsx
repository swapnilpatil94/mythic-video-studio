import React, {useEffect, useRef, useState} from "react";
import {Img, useDelayRender} from "remotion";

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

// Generated (and hand-authored fallback) masters carry their own opaque, roughly-uniform
// paper-colored canvas behind the actual character ink — the same "not really a clean asset"
// class of problem this project has already hit with raster environment/character art (see the
// karna-full-journey postmortems). A CSS "darken" blend mode only min()s color channels against
// whatever happens to sit behind the master at render time: wherever the scene *behind* the
// master's bounding box is lighter than the master's own paper, darken can't remove it, so the
// master's canvas edge — a hard geometric rectangle, since the whole canvas is opaque, not just
// the drawn strokes — stays visible as a seam/flattened patch. That is the defect a real render
// showed (see PR #5's rendered evidence, not just the passing static check).
//
// The actual fix is asset normalization, not color blending: give the master's own paper pixels
// real alpha=0 so ordinary (non-blended) compositing lets the true scene behind it — including its
// texture/detail, not just its average color — show through everywhere except the authored ink.
// This project's whole palette (CREAM paper vs. INK/GOLD/RED pigment) sits on a wide luminance
// gap (paper ~0.85-0.95, everything actually drawn well under ~0.6), so one fixed luminance
// threshold, applied as a single SVG color matrix, keys the paper to transparent without needing
// per-asset tuning.
//
// IMPORTANT — this is only safe on a master that does NOT already carry real alpha. A real
// character master (rembg-processed at generation time — see tools/flux_image.py's
// ALPHA_REQUIRED_KINDS) already encodes background-vs-foreground correctly via its alpha channel,
// and its own OPAQUE content routinely includes light-colored authored art (white/cream drapery,
// skin highlights) in the SAME luminance band as paper. Rendering karna-karna.png through this
// filter unconditionally was checked directly against the asset's own pixel data, not assumed: ~48%
// of its opaque pixels sit above the paper-cutoff luminance, so a blanket filter would have erased
// nearly half the costume, not just removed a paper background. `useNeedsPaperNormalization` below
// probes each master once (mirroring InkConstructionOverlay's own load-detection pattern) and this
// filter is only ever wired in when that probe finds no real transparency already present.
const PAPER_TO_ALPHA_FILTER_ID = "kathaaya-paper-to-alpha";

function PaperToAlphaFilterDefs() {
  return (
    <svg width={0} height={0} style={{position: "absolute"}} aria-hidden focusable="false">
      <defs>
        <filter id={PAPER_TO_ALPHA_FILTER_ID} x="-10%" y="-10%" width="120%" height="120%" colorInterpolationFilters="sRGB">
          <feColorMatrix
            in="SourceGraphic"
            type="matrix"
            // Alpha row only: alpha_out = clamp(-2*(R+G+B) + 3.72, 0, 1). Paper (~0.89 avg
            // luminance) -> ~0 alpha. Ink/gold/red (all well under ~0.5 avg) -> ~1 alpha. RGB rows
            // are identity; this pass only ever rewrites the alpha channel.
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  -2 -2 -2 0 3.72"
            result="paperKeyed"
          />
          <feComposite in="SourceGraphic" in2="paperKeyed" operator="in" />
        </filter>
      </defs>
    </svg>
  );
}

const ALPHA_PROBE_SIZE = 48;
const ALPHA_PROBE_MAX_WAIT_MS = 5000;
const TRANSPARENT_ALPHA_THRESHOLD = 200; // out of 255
// A real background-removed master has a large, clearly transparent surround; an opaque/authored
// canvas (or one that failed background removal) won't. This is a low bar deliberately — false
// negatives here (treating an already-clean master as if it still needs normalization) are cheap,
// since the filter is a no-op wherever alpha is already 0; false positives (skipping normalization
// on a master that actually needs it) are the failure mode that reintroduces the rectangular
// boundary, so the threshold favors detecting transparency readily.
const MIN_TRANSPARENT_FRACTION = 0.02;

/**
 * Detects whether the master image mounted at `containerRef` already carries real, meaningful
 * alpha transparency, so `ProgressiveArtwork` only ever applies `PaperToAlphaFilterDefs` to a
 * master that actually needs it (see the long comment above `PAPER_TO_ALPHA_FILTER_ID`). Follows
 * the same load-detection and `useDelayRender` pattern InkConstructionOverlay already uses to
 * probe this same master image, so this stays deterministic across a real Remotion render rather
 * than depending on incidental async timing.
 */
function useNeedsPaperNormalization(containerRef: React.RefObject<HTMLDivElement | null>, src: string): boolean {
  const [needsNormalization, setNeedsNormalization] = useState(true);
  const {delayRender, continueRender, cancelRender} = useDelayRender();
  const [handle] = useState(() => delayRender('Probing master artwork for existing alpha transparency', {retries: 2}));

  useEffect(() => {
    let cancelled = false;
    let raf: number | null = null;
    let settled = false;
    const started = Date.now();

    const finish = (result: boolean) => {
      if (cancelled || settled) return;
      settled = true;
      setNeedsNormalization(result);
      continueRender(handle);
    };
    const fail = (e: Error) => {
      if (cancelled || settled) return;
      settled = true;
      cancelRender(e);
    };

    const probe = () => {
      if (cancelled || settled) return;
      const image = containerRef.current?.querySelector('img');
      if (!image || !(image.complete && image.naturalWidth > 0)) {
        if (Date.now() - started > ALPHA_PROBE_MAX_WAIT_MS) { fail(new Error('Master artwork did not finish loading for alpha probing')); return; }
        raf = requestAnimationFrame(probe);
        return;
      }
      try {
        const w = Math.min(ALPHA_PROBE_SIZE, image.naturalWidth);
        const h = Math.min(ALPHA_PROBE_SIZE, image.naturalHeight);
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        const ctx = canvas.getContext('2d', {willReadFrequently: true});
        if (!ctx) throw new Error('Unable to create alpha-probe canvas');
        ctx.drawImage(image, 0, 0, w, h);
        const {data} = ctx.getImageData(0, 0, w, h);
        let transparent = 0;
        const total = data.length / 4;
        for (let i = 3; i < data.length; i += 4) if (data[i] < TRANSPARENT_ALPHA_THRESHOLD) transparent += 1;
        finish(transparent / total < MIN_TRANSPARENT_FRACTION);
      } catch (e) {
        fail(e as Error);
      }
    };
    probe();
    return () => { cancelled = true; if (raf !== null) cancelAnimationFrame(raf); if (!settled) continueRender(handle); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  return needsNormalization;
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
  // Hooks run unconditionally (React's rules of hooks) even though the early return below means
  // this probe is wasted whenever `regions` is empty — every current call site always supplies
  // regions, so that branch is effectively dead, but hook order must stay stable regardless.
  const containerRef = useRef<HTMLDivElement>(null);
  const needsPaperNormalization = useNeedsPaperNormalization(containerRef, src);

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
  const filter = needsPaperNormalization
    ? `saturate(.92) contrast(1.03) url(#${PAPER_TO_ALPHA_FILTER_ID})`
    : "saturate(.92) contrast(1.03)";

  return (
    <div ref={containerRef} style={{position: "absolute", inset: 0, opacity: pigment, pointerEvents: "none"}}>
      {needsPaperNormalization ? <PaperToAlphaFilterDefs /> : null}
      <Img src={src} style={{...common, filter}} />
    </div>
  );
}
