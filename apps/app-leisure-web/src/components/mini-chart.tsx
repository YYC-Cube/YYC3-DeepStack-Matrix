/**
 * MiniChart 零依赖 SVG 轻图表(移动端精致化:仪表页「数与势」,不出明细——Owner 理念 2026-11-04)
 * 三型:Donut 环形占比 / Bars 柱状分布 / Spark 趋势线;纯 SVG 无第三方图表库
 */

export function MiniDonut(props: {
  /** 0~100 */
  percent: number
  label: string
  sub?: string
  size?: number
  color?: string
}): React.JSX.Element {
  const size = props.size ?? 96
  const r = (size - 12) / 2
  const c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(100, Math.round(props.percent)))
  const color = props.color ?? '#00d4ff'
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(139,155,180,0.18)" strokeWidth="8" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={String((c * pct) / 100) + ' ' + String(c)}
          transform={'rotate(-90 ' + String(size / 2) + ' ' + String(size / 2) + ')'}
          style={{ transition: 'stroke-dasharray .5s ease' }}
        />
        <text x="50%" y="48%" textAnchor="middle" dominantBaseline="central" fontSize={size * 0.2} fontWeight="700" fill="#e0f0ff">
          {String(pct)}%
        </text>
        <text x="50%" y="68%" textAnchor="middle" fontSize={size * 0.11} fill="#8b9bb4">
          {props.label}
        </text>
      </svg>
      {props.sub !== undefined && <span className="text-[11px] text-fg-muted">{props.sub}</span>}
    </div>
  )
}

export function MiniBars(props: {
  items: Array<{ label: string; value: number }>
  /** 值后缀(如 ¥ / 人) */
  unit?: string
  color?: string
  height?: number
}): React.JSX.Element {
  const max = Math.max(...props.items.map((i) => i.value), 1)
  const color = props.color ?? '#00d4ff'
  return (
    <div className="space-y-1.5" style={{ minHeight: props.height }}>
      {props.items.map((it) => (
        <div key={it.label} className="flex items-center gap-2">
          <span className="w-16 shrink-0 text-[11px] text-fg-muted truncate">{it.label}</span>
          <div className="flex-1 h-3.5 rounded bg-fg-muted/10 overflow-hidden">
            <div
              className="h-full rounded"
              style={{
                width: String(Math.max(2, Math.round((it.value / max) * 100))) + '%',
                background: 'linear-gradient(90deg, ' + color + ', color-mix(in srgb, ' + color + ' 55%, transparent))',
                transition: 'width .5s ease',
              }}
            />
          </div>
          <span className="w-14 shrink-0 text-right text-[11px] text-[#e0f0ff] tabular-nums">
            {String(it.value)}
            {props.unit ?? ''}
          </span>
        </div>
      ))}
    </div>
  )
}

export function MiniSpark(props: {
  /** 时序值(旧→新) */
  points: number[]
  label?: string
  color?: string
  height?: number
}): React.JSX.Element {
  const pts = props.points.length > 0 ? props.points : [0, 0]
  const w = 300
  const h = props.height ?? 64
  const max = Math.max(...pts, 1)
  const min = Math.min(...pts, 0)
  const span = Math.max(max - min, 1)
  const step = pts.length > 1 ? w / (pts.length - 1) : w
  const coords = pts.map((v, i) => [i * step, h - 6 - ((v - min) / span) * (h - 16)] as const)
  const line = coords.map((c, i) => (i === 0 ? 'M' : 'L') + String(Math.round(c[0])) + ',' + String(Math.round(c[1]))).join(' ')
  const area = line + ' L' + String(w) + ',' + String(h) + ' L0,' + String(h) + ' Z'
  const color = props.color ?? '#00d4ff'
  return (
    <div className="space-y-1">
      <svg viewBox={'0 0 ' + String(w) + ' ' + String(h)} className="w-full" preserveAspectRatio="none" style={{ height: h }}>
        <path d={area} fill={color} opacity="0.12" />
        <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {coords.length > 0 && (
          <circle cx={coords[coords.length - 1]![0]} cy={coords[coords.length - 1]![1]} r="3.5" fill={color} />
        )}
      </svg>
      {props.label !== undefined && <div className="text-[11px] text-fg-muted">{props.label}</div>}
    </div>
  )
}
