'use client';

// Komponen pie chart murni SVG (tanpa library tambahan).
// data: [{ label: string, value: number, color: string }]
export default function PieChart({ data, size = 220, donut = 0.55 }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 4;

  function polarToCartesian(centerX, centerY, radius, angleDeg) {
    const angleRad = ((angleDeg - 90) * Math.PI) / 180;
    return {
      x: centerX + radius * Math.cos(angleRad),
      y: centerY + radius * Math.sin(angleRad),
    };
  }

  function arcPath(startAngle, endAngle) {
    const start = polarToCartesian(cx, cy, r, endAngle);
    const end = polarToCartesian(cx, cy, r, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`;
  }

  if (total === 0) {
    return (
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={cx} cy={cy} r={r} fill="#eee" />
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fontSize="12" fill="var(--ink-soft)">
          Tidak ada data
        </text>
      </svg>
    );
  }

  let cursor = 0;
  const slices = data
    .filter((d) => d.value > 0)
    .map((d) => {
      const angle = (d.value / total) * 360;
      const startAngle = cursor;
      const endAngle = cursor + angle;
      cursor = endAngle;
      return { ...d, startAngle, endAngle, pct: (d.value / total) * 100 };
    });

  // Kasus khusus: hanya 1 kategori punya nilai (porsi 100%) — arc math gagal pada 360 derajat penuh
  const onlyOneSlice = slices.length === 1;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {onlyOneSlice ? (
        <circle cx={cx} cy={cy} r={r} fill={slices[0].color} />
      ) : (
        slices.map((s, i) => (
          <path key={i} d={arcPath(s.startAngle, s.endAngle)} fill={s.color} stroke="#fff" strokeWidth="1.5" />
        ))
      )}
      {donut > 0 && <circle cx={cx} cy={cy} r={r * donut} fill="var(--paper, #fff)" />}
    </svg>
  );
}

export function PieLegend({ data }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
          <span style={{ width: 11, height: 11, borderRadius: 3, background: d.color, flexShrink: 0 }} />
          <span style={{ flex: 1, color: 'var(--ink)' }}>{d.label}</span>
          <span style={{ color: 'var(--ink-soft)', fontFamily: 'JetBrains Mono, monospace', fontSize: 11.5 }}>
            {d.value} ({total > 0 ? ((d.value / total) * 100).toFixed(1) : '0.0'}%)
          </span>
        </div>
      ))}
    </div>
  );
}
