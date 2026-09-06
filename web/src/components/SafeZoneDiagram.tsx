type Rect = {x: number; y: number; width: number; height: number};
type Profile = {
  id: string; label: string; canvasWidth: number; canvasHeight: number;
  safeZones: {topUi: Rect; bottomUi: Rect; sideUi: Rect};
  subtitleZone: {centerY: number; maxHeight: number; marginX: number};
  brandingZone: Rect;
  resolvedSubtitleCenterY: number;
  subtitleNudged: boolean;
};

/** Renders the same safe-zone rectangles the compositor positions captions/branding against
 * (src/shared/platform-profiles.ts) — a visual proof, not a redrawn approximation, that placement
 * is collision-aware and clear of platform chrome. */
export default function SafeZoneDiagram({profile}: {profile: Profile}) {
  const w = profile.canvasWidth;
  const h = profile.canvasHeight;
  const scale = 260 / w;
  const subtitleRect: Rect = {
    x: profile.subtitleZone.marginX,
    y: profile.resolvedSubtitleCenterY - profile.subtitleZone.maxHeight / 2,
    width: w - profile.subtitleZone.marginX * 2,
    height: profile.subtitleZone.maxHeight,
  };
  return (
    <div className="stack" style={{alignItems: 'center', gap: 6}}>
      <svg width={w * scale} height={h * scale} viewBox={`0 0 ${w} ${h}`} style={{border: '2px solid var(--ink)', borderRadius: 10, background: '#fdf6e6'}}>
        <rect x={0} y={0} width={w} height={h} fill="#fdf6e6" />
        <Zone r={profile.safeZones.topUi} label="Top UI" color="#8e2f2433" />
        <Zone r={profile.safeZones.bottomUi} label="Bottom UI" color="#8e2f2433" />
        <Zone r={profile.safeZones.sideUi} label="Side UI" color="#8e2f2433" />
        <Zone r={subtitleRect} label="Subtitles" color="#b8872d55" stroke="#b8872d" />
        <Zone r={profile.brandingZone} label="Branding" color="#17151033" stroke="#171510" />
        <line x1={0} y1={h / 2} x2={w} y2={h / 2} stroke="#171510" strokeDasharray="10 10" opacity={0.25} />
      </svg>
      <p className="hint" style={{textAlign: 'center', maxWidth: 280}}>
        {profile.label} — subtitle center Y={profile.resolvedSubtitleCenterY}
        {profile.subtitleNudged ? ' (nudged up to clear bottom UI)' : ' (lower storytelling zone, collision-checked against bottom UI)'}. Dashed line = frame center — subtitles are deliberately not there.
      </p>
    </div>
  );
}

function Zone({r, label, color, stroke}: {r: Rect; label: string; color: string; stroke?: string}) {
  return (
    <g>
      <rect x={r.x} y={r.y} width={r.width} height={r.height} fill={color} stroke={stroke ?? 'none'} strokeWidth={stroke ? 4 : 0} />
      <text x={r.x + 10} y={r.y + 30} fontSize={26} fill="#171510" opacity={0.7}>{label}</text>
    </g>
  );
}
