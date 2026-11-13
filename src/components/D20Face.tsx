export function D20Face({ value, isRolling, accentHex }: {
  value: number | 'D20';
  isRolling: boolean;
  accentHex: string;
}) {
  const isCrit20 = !isRolling && value === 20;
  const isFumble1 = !isRolling && value === 1;
  return (
  <div className="relative flex items-center justify-center w-24 h-24 shrink-0">
    <svg
      viewBox="0 0 100 100"
      className={`w-24 h-24 transition-transform duration-150 ${
        isRolling ? 'scale-110 rotate-45' : typeof value === 'number' ? 'scale-105' : ''
      }`}
      style={{
        filter: `drop-shadow(0 0 14px ${
          isCrit20
            ? 'rgba(251, 191, 36, 0.85)'
            : isFumble1
            ? 'rgba(239, 68, 68, 0.85)'
            : accentHex
        })`,
      }}
    >
      {/* Outer Hexagon of Icosahedron */}
      <polygon
        points="50,5 93,28 93,72 50,95 7,72 7,28"
        fill="#111022"
        stroke={
          isCrit20 ? '#FBBF24' : isFumble1 ? '#EF4444' : accentHex
        }
        strokeWidth="3"
      />
      {/* Inner Triangle Facets */}
      <polygon
        points="50,18 80,68 20,68"
        fill="#191730"
        stroke={
          isCrit20 ? '#FDE68A' : isFumble1 ? '#FCA5A5' : accentHex
        }
        strokeWidth="1.75"
        strokeOpacity="0.8"
      />
      <line x1="50" y1="5" x2="50" y2="18" stroke={accentHex} strokeWidth="1.5" strokeOpacity="0.55" />
      <line x1="93" y1="28" x2="50" y2="18" stroke={accentHex} strokeWidth="1.5" strokeOpacity="0.55" />
      <line x1="7" y1="28" x2="50" y2="18" stroke={accentHex} strokeWidth="1.5" strokeOpacity="0.55" />
      <line x1="93" y1="28" x2="80" y2="68" stroke={accentHex} strokeWidth="1.5" strokeOpacity="0.55" />
      <line x1="7" y1="28" x2="20" y2="68" stroke={accentHex} strokeWidth="1.5" strokeOpacity="0.55" />
      <line x1="93" y1="72" x2="80" y2="68" stroke={accentHex} strokeWidth="1.5" strokeOpacity="0.55" />
      <line x1="7" y1="72" x2="20" y2="68" stroke={accentHex} strokeWidth="1.5" strokeOpacity="0.55" />
      <line x1="50" y1="95" x2="80" y2="68" stroke={accentHex} strokeWidth="1.5" strokeOpacity="0.55" />
      <line x1="50" y1="95" x2="20" y2="68" stroke={accentHex} strokeWidth="1.5" strokeOpacity="0.55" />
    </svg>
    <span
      className={`absolute font-mono text-2xl font-bold tracking-tighter translate-y-1.5 ${
        isCrit20
          ? 'text-amber-300 scale-110'
          : isFumble1
          ? 'text-red-400'
          : 'text-white'
      }`}
    >
      {value}
    </span>
  </div>
  );
}
