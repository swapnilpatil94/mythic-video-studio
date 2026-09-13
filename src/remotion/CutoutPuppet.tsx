import React, {useEffect, useState} from 'react';
import {cancelRender, continueRender, delayRender} from 'remotion';

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

/**
 * Real, localized part-motion for a single flat master-art image — without cutting it into
 * separate layers. This is the actual gap between "camera pans over a static illustration" and
 * "2D character animation": a flat FLUX master has no separate arm/torso/hair layers, and there is
 * no reliable way to get them automatically. A real attempt at automatic pose detection
 * (MediaPipe's pose landmarker, the same model class tools like Stretchy Studio's auto-rigger use)
 * was tried directly against this project's own master assets and found zero landmarks — these
 * models are trained on photographs, and ink-illustration figures don't register as "a person" to
 * them at all. A rigid rectangular cutout (crop a region, transform it independently) was also
 * tried in reasoning and rejected before writing code: this art's raised arm, weapon, and flowing
 * hair all overlap the torso and each other in screen-space, so independent rigid layers would
 * show a hard rectangular seam cutting across the artwork the moment they moved apart from the
 * static composite. Neither is a small tuning problem to fix; both are structurally the wrong tool
 * for a single flat illustration with no source layers.
 *
 * What actually works within that constraint: an animated SVG `feDisplacementMap`, the same
 * primitive behind "puppet warp" / liquid-distortion effects — it locally displaces the image's
 * own pixels around a pivot, falling off smoothly with distance, so nearby regions (a raised
 * hand, a weapon tip, a strand of hair) visibly move while the rest of the figure stays anchored,
 * with no seam because nothing is actually cut into separate pieces. This is a real technique
 * (the underlying mechanism Photoshop's Puppet Warp and countless "living photo" effects use), not
 * a whole-image pan/zoom/rotate dressed up to look like more.
 */

export type PuppetRegion = {
  /** Percentage of the image's own width/height (0-100), not the frame — same convention as
   * ConstructionRegion in artwork-construction.tsx, so a region can be eyeballed the same way. */
  cx: number;
  cy: number;
  /** How far the displacement falls off, in percent of image width. Larger = a softer, wider sway;
   * smaller = a tighter, more localized flick (good for a weapon tip or a single hair strand). */
  radius: number;
  /** Peak displacement in percent of image width at the region's own center, decaying to 0 at
   * `radius`. Keep small (1-4) — this is meant to read as "alive", not as a cartoon wobble. */
  strength: number;
  /** Animation direction: 'sway' oscillates side to side (good for hair/cloth/a held weapon),
   * 'breathe' pulses radially in and out (good for a torso/chest — subtle idle breathing), 'arc'
   * sweeps through a one-directional rotation-like arc around the pivot (good for a raised arm
   * completing a gesture once, not a cyclic loop). */
  motion: 'sway' | 'breathe' | 'arc';
  /** Cycles per second for 'sway'/'breathe'; ignored for 'arc' (which uses `progress` directly). */
  speedHz?: number;
  /** Phase offset in radians, so multiple regions don't move in obvious lockstep. */
  phase?: number;
};

// feDisplacementMap's zero-displacement point is exactly mid-gray (127.5/255 in each channel it
// reads), not 0 and not an arbitrary low value — a channel value below that pushes pixels one way,
// above it pushes the other way, and the actual pixel offset is `(value/255 - 0.5) * scale`. A
// first version of this used 50 as its "neutral" baseline, which put the ENTIRE image under a
// large constant offset (roughly (50/255-0.5)*scale ≈ -0.3*scale px) almost everywhere, not just
// inside the intended regions — confirmed directly by rendering it: the whole figure showed harsh,
// uniform noise/aliasing, and — because that wrong constant offset dwarfed the real per-frame sway
// — consecutive frames looked pixel-identical despite the sin/cos math genuinely differing frame
// to frame. Both symptoms traced to this one wrong constant, not two separate bugs.
const NEUTRAL = 127.5;

/**
 * One self-contained radial displacement field per region (X pushed into the red channel, Y into
 * green), each falling off smoothly back to exactly NEUTRAL — not via opacity/alpha, which
 * feDisplacementMap does not use to attenuate its effect (it reads raw, un-premultiplied channel
 * values, so a region faded to alpha=0 at its edge would still carry whatever non-neutral color
 * value sits underneath rather than genuinely reaching "no displacement"). Regions combine via
 * feComposite's arithmetic mode (`k2*in + k3*in2 + k4`), chained pairwise starting from a flat
 * NEUTRAL background: each step adds one region's own delta from NEUTRAL while subtracting one
 * redundant extra copy of the NEUTRAL baseline the naive sum would otherwise double-count, so N
 * regions still land on a single correct NEUTRAL-centered map regardless of how many are combined.
 *
 * Each region's soft radial bump is built entirely from `feFlood` + `feComposite` (`over`) +
 * `feGaussianBlur` — NOT from a gradient pulled in via `feImage`, which was tried first and is
 * worth recording as a dead end: an `feImage` referencing local same-document content DOES
 * rasterize correctly as a filter's own final output (confirmed by swapping it in directly and
 * screenshotting real color variation), but Chromium silently no-ops `feDisplacementMap` whenever
 * ANY upstream input traces back to an `feImage`, confirmed by three separate live DOM tests (the
 * exact same map used as `feDisplacementMap`'s `in2` produced nothing, a single un-composited
 * `feImage` used directly as `in2` also produced nothing, while a plain `feFlood` used as `in2`
 * produced an obvious full-frame shift). This lines up with `feImage` output triggering the same
 * cross-origin-style "tainted" handling Chromium applies to `<canvas>` after drawing untrusted
 * image content (hit directly as a `SecurityError` on `getImageData` while debugging this) —
 * `feDisplacementMap` leaks its input's pixel values through the shape of its own output, exactly
 * the kind of side channel that tainting exists to block, so the browser appears to quietly treat
 * a tainted `in2` as if it carried no displacement at all rather than erroring. The construction
 * below paints an opaque peak-colored square over an opaque neutral background with `feComposite`
 * (`operator="over"`, both fully opaque so no alpha-based fade is involved) and blurs that flat,
 * fully-opaque composite — blurring an opaque image only smooths its color values, never its
 * alpha, so this reaches the same soft, color-encoded falloff a radial gradient would have given,
 * without any `feImage` anywhere in the chain.
 */
/**
 * Anticipation -> action (with a slight overshoot) -> settle, the shape any real one-shot gesture
 * needs instead of a plain monotonic ease: a limb that just eases from 0 to 1 in a straight curve
 * reads as sliding into place, not as *reaching* for something with intent. Returns a signed
 * multiplier (dips slightly negative during the wind-up, rises past 1 at the peak, settles back to
 * exactly 1 and holds) — the caller scales this by the region's own authored `strength`, same as
 * every other motion type here. `gp` is expected to be a single beat-local 0..1 sweep, not a
 * repeating phase (a gesture that looped would stop reading as a deliberate action and go back to
 * looking like idle sway).
 */
function gestureArcEase(gp: number): number {
  const p = Math.max(0, Math.min(1, gp));
  if (p < 0.15) {
    const t = p / 0.15;
    return -0.22 * (t * t * (3 - 2 * t));
  }
  if (p < 0.55) {
    const t = (p - 0.15) / 0.4;
    const e = t * t * (3 - 2 * t);
    return -0.22 * (1 - e) + 1.12 * e;
  }
  if (p < 0.8) {
    const t = (p - 0.55) / 0.25;
    const e = t * t * (3 - 2 * t);
    return 1.12 - 0.12 * e;
  }
  return 1;
}

function buildDisplacementFilter(
  id: string,
  regions: PuppetRegion[],
  progress: number,
  naturalWidth: number,
  naturalHeight: number,
  gestureRegionIndex?: number,
  gestureProgress?: number
): {defs: React.ReactNode; filterId: string} {
  const clamp255 = (v: number) => Math.max(0, Math.min(255, v));
  const neutralRgb = `rgb(${NEUTRAL},${NEUTRAL},127)`;
  const layers = regions.map((region, i) => {
    const speed = region.speedHz ?? 0.18;
    const phase = region.phase ?? i * 1.7;
    const t = progress * Math.PI * 2 * speed + phase;
    let dx = 0;
    let dy = 0;
    // A gesture always takes over its assigned region for this frame, regardless of that region's
    // own authored `motion` — it's a director-triggered one-shot action for a specific narrative
    // beat (see shots.ts's gestureTriggersFor), not a property of the region itself. Every other
    // region keeps behaving exactly as authored, gesture or no gesture, which is what keeps this
    // change additive rather than a rewrite of the existing idle-motion system.
    if (gestureProgress !== undefined && i === gestureRegionIndex) {
      // A director-triggered gesture is the one moment in a beat meant to read as "this character
      // is doing something with intent" — verified on a real render that the region's own authored
      // idle `strength` (tuned for a subtle, ambient sway) made the actual arm displacement too
      // marginal to confidently call "visible" at normal playback, even though the anticipation/
      // action/settle curve itself was firing correctly. GESTURE_STRENGTH_BOOST is deliberately
      // only applied here, not to idle sway/breathe — the spec this serves draws a real line
      // between "restrained ambient life" and "a character must visibly react", and conflating the
      // two by boosting idle motion instead would just make every beat busier.
      const eased = gestureArcEase(gestureProgress);
      const GESTURE_STRENGTH_BOOST = 1.7;
      dx = eased * region.strength * GESTURE_STRENGTH_BOOST;
      dy = -eased * region.strength * 0.6 * GESTURE_STRENGTH_BOOST;
    } else if (region.motion === 'sway') {
      dx = Math.sin(t) * region.strength;
      dy = Math.cos(t * 0.6) * region.strength * 0.35;
    } else if (region.motion === 'breathe') {
      const pulse = (Math.sin(t) + 1) / 2;
      dx = pulse * region.strength * 0.5;
      dy = pulse * region.strength * 0.5;
    } else {
      // 'arc' with no active gesture driving it: same anticipation/action/settle shape, keyed off
      // the continuous `progress` clamped to its own first unit — a fallback for a region authored
      // as 'arc' but rendered outside of a director-triggered gesture window, so it still resolves
      // to a sensible held pose (eased=1) rather than reinterpreting continuous elapsed seconds as
      // a repeating sweep.
      const eased = gestureArcEase(Math.min(1, progress));
      dx = eased * region.strength;
      dy = -eased * region.strength * 0.6;
    }
    // Actual pixel displacement is (colorDelta/255)*scale (see feDisplacementMap below, scale=64).
    // A first version of this used a *6 multiplier here with scale=14, which — verified directly by
    // diffing rendered frames pixel-by-pixel — produced under 1px of real displacement even at the
    // highest authored `strength` (3.2): the noisy-artifact bug was masking how tiny the actual
    // motion was underneath it. COLOR_PER_UNIT=36 with scale=64 below instead puts a `strength: 1`
    // region at roughly 9px of swing and `strength: 3.2` at roughly 29px — enough to read as real
    // per-part motion in a 1080px-wide frame, not a rounding artifact.
    const COLOR_PER_UNIT = 36;
    const rPeak = clamp255(NEUTRAL + dx * COLOR_PER_UNIT);
    const gPeak = clamp255(NEUTRAL + dy * COLOR_PER_UNIT);
    const peakRgb = `rgb(${rPeak.toFixed(1)},${gPeak.toFixed(1)},127)`;
    // Real natural-pixel coordinates — no padding offset needed here, since a region's center is
    // just a point in the puppet's own image space (the -20%/140% padding below is only about
    // giving displaced pixels room near the canvas edge, not about region placement).
    const cx = naturalWidth * (region.cx / 100);
    const cy = naturalHeight * (region.cy / 100);
    const rPx = naturalWidth * (region.radius / 100);
    // The "core" square is intentionally smaller than the region's authored radius, because the
    // blur then spreads it back out to roughly that radius — feGaussianBlur's visible falloff
    // extends a few multiples of stdDeviation, so a core half this size plus a matching blur lands
    // close to the authored radius as the point where the bump has faded back to NEUTRAL.
    const coreHalf = rPx * 0.35;
    const blurStd = rPx * 0.32;
    return (
      <React.Fragment key={i}>
        <feFlood floodColor={peakRgb} x={cx - coreHalf} y={cy - coreHalf} width={coreHalf * 2} height={coreHalf * 2} result={`core-${i}`} />
        <feComposite in={`core-${i}`} in2={`bg-${i}`} operator="over" result={`sharp-${i}`} />
        <feGaussianBlur in={`sharp-${i}`} stdDeviation={blurStd} result={`raw-${i}`} />
      </React.Fragment>
    );
  });

  const NEUTRAL_FRAC = (NEUTRAL / 255).toFixed(4);
  // Without `filterRes`, Chromium rasterizes this filter's intermediate buffers at a resolution
  // derived from the CTM in effect where the filtered element is drawn — i.e. how zoomed-in the
  // enclosing viewBox happens to be, not anything about the filter itself. That's invisible for a
  // viewBox showing roughly the whole image, but CutoutPuppet's manual cover-crop (see the
  // `coverViewBox` comment) can zoom in 2-3x to fill a landscape box from a portrait source, which
  // was confirmed to blow up this filter's per-frame cost enough to make a render's slowest beat
  // take tens of seconds per frame (thousands of frames stuck in that one beat, verified via a real
  // render that was still on frame ~1 after 45 minutes at full CPU). Pinning `filterRes` to the
  // image's own natural size fixes the raster buffer at a constant, already-reasonable resolution
  // regardless of viewBox zoom — decoupling filter cost from crop zoom entirely. The one tradeoff is
  // the warped result gets upscaled like any other raster content when zoomed in further than
  // natural size, but at the subtle displacement strengths these regions use that's imperceptible.
  const filterRes = `${Math.round(naturalWidth)} ${Math.round(naturalHeight)}`;
  return {
    filterId: id,
    defs: (
      <filter id={id} x="-20%" y="-20%" width="140%" height="140%" filterRes={filterRes} colorInterpolationFilters="sRGB">
        <feFlood floodColor={neutralRgb} result="map-0" />
        {regions.map((_, i) => (
          <React.Fragment key={i}>
            {/* Each region needs its own opaque neutral backdrop to composite its peak square onto
               (so the blur below smooths color, never alpha) — cheap to re-flood per region since
               it's a flat fill, and keeps each region's bump independent of the running total. */}
            <feFlood floodColor={neutralRgb} result={`bg-${i}`} />
            {layers[i]}
            {/* result = 1*raw + 1*mapSoFar - NEUTRAL_FRAC: adds this region's own (value-NEUTRAL)
               delta onto the running total while removing the one extra NEUTRAL baseline the plain
               sum would otherwise introduce. */}
            <feComposite in={`raw-${i}`} in2={`map-${i}`} operator="arithmetic" k1={0} k2={1} k3={1} k4={-NEUTRAL_FRAC} result={`map-${i + 1}`} />
          </React.Fragment>
        ))}
        <feDisplacementMap in="SourceGraphic" in2={`map-${regions.length}`} scale={64} xChannelSelector="R" yChannelSelector="G" />
      </filter>
    ),
  };
}

export function CutoutPuppet({
  src,
  regions,
  progress,
  style,
  naturalWidth,
  naturalHeight,
  fit = 'contain',
  focusX = 50,
  focusY = 50,
  boxWidth,
  boxHeight,
  gestureRegionIndex,
  gestureProgress,
}: {
  src: string;
  regions: PuppetRegion[];
  /** 0..1. For 'sway'/'breathe' regions this is normalized elapsed time (any monotonically
   * increasing value works, since those motions are periodic); for a beat with an 'arc' region,
   * pass the beat's own local progress so the gesture completes once across the beat. */
  progress: number;
  /** Forwarded onto the outer <svg> as-is — transform/opacity/filter etc all work exactly as they
   * would on an <img>, since a sized SVG with a viewBox behaves as a replaced element for these
   * CSS purposes. Any `filter` here is a separate CSS filter chain (e.g. grayscale/contrast for a
   * construction-reveal wash) from the SVG-native `filter` attribute this component puts on its
   * inner <image> for the displacement warp — the two don't collide. */
  style?: React.CSSProperties;
  naturalWidth: number;
  naturalHeight: number;
  /** Same semantics as CSS object-fit/object-position on an <img> — 'cover' fills the box and
   * crops, 'contain' fits inside it letterboxed. When `boxWidth`/`boxHeight` are known, 'cover' is
   * achieved by hand-cropping the viewBox instead of trusting CSS object-fit on the SVG root: a real
   * landscape render (a portrait source asset stretched into a 1920x1080 box, aspect ratio ~0.57
   * vs ~1.78) showed the CSS route silently falling back to letterboxed/contain-like behavior —
   * Chromium's headless renderer doesn't reliably apply object-fit:cover to a sized, viewBox'd SVG
   * root the way it does to an <img>, so it's not something to lean on for an extreme aspect-ratio
   * mismatch even though it looks correct for near-matching aspects. Without boxWidth/boxHeight
   * (e.g. a percentage sub-region box whose pixel size isn't known here) this falls back to the old
   * CSS object-fit behavior, unchanged. */
  fit?: 'contain' | 'cover';
  focusX?: number;
  focusY?: number;
  /** Pixel size of the box this SVG actually fills, when known (see `fit` above) — lets 'cover' be
   * computed exactly instead of approximated. */
  boxWidth?: number;
  boxHeight?: number;
  /** Index into `regions` that gets a one-shot anticipation/action/settle gesture instead of its
   * own authored idle motion this frame — see `gestureArcEase` and shots.ts's gestureTriggersFor.
   * Both this and `gestureProgress` must be set for a gesture to actually apply; either omitted
   * leaves every region exactly as it behaves today. */
  gestureRegionIndex?: number;
  /** Beat-local 0..1 sweep for the active gesture — deliberately a SEPARATE clock from `progress`
   * (which stays continuous, for the idle sway/breathe regions): a gesture keyed to the same
   * continuous clock as idle motion would either replay every beat forever after its region is
   * first authored, or freeze mid-gesture depending on when in the beat it started, neither of
   * which is a real one-shot action tied to a specific narrative moment. */
  gestureProgress?: number;
}) {
  const filterId = 'kathaaya-puppet-warp';
  const {defs, filterId: id} = buildDisplacementFilter(filterId, regions, progress, naturalWidth, naturalHeight, gestureRegionIndex, gestureProgress);
  // Manual cover-crop: pick the natural-pixel-space window that exactly fills the target box's
  // aspect ratio, offset by focusX/focusY (0-100%) the same way object-position would. Left
  // undefined when the box's pixel size isn't known, or fit is 'contain' — 'contain' letterboxes
  // by definition, and the SVG's own default preserveAspectRatio="xMidYMid meet" already does that
  // correctly without needing this workaround.
  let coverViewBox: string | undefined;
  if (fit === 'cover' && boxWidth && boxHeight) {
    const targetAspect = boxWidth / boxHeight;
    const sourceAspect = naturalWidth / naturalHeight;
    let visibleWidth = naturalWidth;
    let visibleHeight = naturalHeight;
    if (sourceAspect > targetAspect) {
      visibleWidth = naturalHeight * targetAspect;
    } else {
      visibleHeight = naturalWidth / targetAspect;
    }
    const offsetX = clamp01(focusX / 100) * (naturalWidth - visibleWidth);
    const offsetY = clamp01(focusY / 100) * (naturalHeight - visibleHeight);
    coverViewBox = `${offsetX} ${offsetY} ${visibleWidth} ${visibleHeight}`;
  }
  // Remotion's own <Img> internally delays the frame capture until the image has actually loaded;
  // a raw SVG <image> here needs the same guarantee manually, or a render could capture a frame
  // before this asset has decoded (blank/missing puppet in the final video).
  const [handle] = useState(() => delayRender(`CutoutPuppet image load: ${src}`));
  useEffect(() => {
    let settled = false;
    const preload = new Image();
    preload.onload = () => {
      settled = true;
      continueRender(handle);
    };
    preload.onerror = () => {
      settled = true;
      cancelRender(new Error(`CutoutPuppet: failed to load ${src}`));
    };
    preload.src = src;
    return () => {
      if (!settled) continueRender(handle);
    };
  }, [src, handle]);
  return (
    // `filter` (the SVG attribute on <image> below) is a native SVG attribute, not a CSS `filter:`
    // on an HTML <img> (which is what Remotion's <Img> renders to) — kept from an earlier
    // debugging pass and left in place since it costs nothing and is the more standard way to
    // apply an SVG filter to raster content. When `coverViewBox` is set, the crop is already baked
    // into the viewBox itself (see above), so `preserveAspectRatio="none"` just stretches that
    // exact window to fill the box 1:1 — no CSS object-fit involved, sidestepping the Chromium
    // quirk this was rewritten to avoid. Otherwise ('contain', or 'cover' without a known box size)
    // this keeps the original CSS object-fit/object-position approach, which does work correctly
    // for 'contain' (matching the SVG's own default preserveAspectRatio="xMidYMid meet" behavior).
    <svg
      viewBox={coverViewBox ?? `0 0 ${naturalWidth} ${naturalHeight}`}
      preserveAspectRatio={coverViewBox ? 'none' : undefined}
      width="100%"
      height="100%"
      style={{position: 'absolute', inset: 0, objectFit: coverViewBox ? undefined : fit, objectPosition: coverViewBox ? undefined : `${focusX}% ${focusY}%`, ...style}}
    >
      {defs}
      <image href={src} x={0} y={0} width={naturalWidth} height={naturalHeight} filter={`url(#${id})`} />
    </svg>
  );
}
