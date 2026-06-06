/** SVG glass-crack overlay for failed widgets. */

export function CrackOverlay() {
  return (
    <svg
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 6,
        overflow: "visible",
      }}
      viewBox="0 0 200 200"
      preserveAspectRatio="none"
    >
      <defs>
        {/* Glow filter for crack lines */}
        <filter id="crack-glow">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Main crack from center-left */}
      <path
        d="M 60 95 L 75 90 L 82 98 L 95 88 L 105 95 L 118 82 L 130 90"
        fill="none"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="1.2"
        strokeLinecap="round"
        filter="url(#crack-glow)"
      />

      {/* Branch up */}
      <path
        d="M 82 98 L 78 78 L 85 65"
        fill="none"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth="0.8"
        strokeLinecap="round"
      />

      {/* Branch down */}
      <path
        d="M 95 88 L 100 108 L 92 125"
        fill="none"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth="0.8"
        strokeLinecap="round"
      />

      {/* Secondary crack, upper right */}
      <path
        d="M 130 90 L 145 85 L 155 92 L 168 80"
        fill="none"
        stroke="rgba(255,255,255,0.10)"
        strokeWidth="0.7"
        strokeLinecap="round"
      />

      {/* Small branch */}
      <path
        d="M 145 85 L 148 72"
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth="0.6"
        strokeLinecap="round"
      />

      {/* Impact point — small radial burst */}
      <circle cx="95" cy="88" r="3" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.8" />
      <circle cx="95" cy="88" r="6" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="0.5" />
    </svg>
  );
}
