import { useState } from 'react'
import { formatJa } from '../lib/date'
import type { MockScore } from '../types'

interface Props {
  scores: MockScore[]
  target: number
}

const SERIES = [
  { key: 'total', label: '合計', color: 'var(--series-1)' },
  { key: 'listening', label: 'L', color: 'var(--series-2)' },
  { key: 'reading', label: 'R', color: 'var(--series-3)' },
] as const

type Key = (typeof SERIES)[number]['key']

function valueOf(s: MockScore, key: Key) {
  return key === 'total' ? s.listening + s.reading : s[key]
}

/** 模試スコア推移の折れ線グラフ（合計・L・R の3系列、目標線つき） */
export function ScoreChart({ scores, target }: Props) {
  const [hover, setHover] = useState<number | null>(null)
  const W = 340
  const H = 220
  const pad = { l: 36, r: 34, t: 14, b: 26 }
  const iw = W - pad.l - pad.r
  const ih = H - pad.t - pad.b
  const max = Math.max(target + 50, ...scores.map((s) => valueOf(s, 'total'))) // 目標が必ず見える範囲
  const yMax = Math.min(990, Math.ceil(max / 100) * 100)
  const x = (i: number) => pad.l + (scores.length === 1 ? iw / 2 : (iw * i) / (scores.length - 1))
  const y = (v: number) => pad.t + ih - (v / yMax) * ih
  const ticks = Array.from({ length: yMax / 100 + 1 }, (_, i) => i * 100).filter((_, i, a) => a.length <= 6 || i % 2 === 0)
  const last = scores.length - 1
  // 末尾の直接ラベルが重ならないよう、上から順に最低11pxずつ離す
  const labelY = new Map<Key, number>()
  let prevY = -Infinity
  for (const se of [...SERIES].sort((a, b) => y(valueOf(scores[last], a.key)) - y(valueOf(scores[last], b.key)))) {
    const ly = Math.max(y(valueOf(scores[last], se.key)) + 4, prevY + 11)
    labelY.set(se.key, ly)
    prevY = ly
  }

  return (
    <div className="chart">
      <div className="legend">
        {SERIES.map((s) => (
          <span key={s.key}>
            <i style={{ background: s.color }} /> {s.label}
          </span>
        ))}
        <span>
          <i className="dash" /> 目標 {target}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="模試スコアの推移"
        onPointerLeave={() => setHover(null)}
        onPointerMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          const px = ((e.clientX - r.left) / r.width) * W
          let best = 0
          scores.forEach((_, i) => Math.abs(x(i) - px) < Math.abs(x(best) - px) && (best = i))
          setHover(best)
        }}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} className="grid" />
            <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" className="axis">
              {t}
            </text>
          </g>
        ))}
        <line x1={pad.l} x2={W - pad.r} y1={y(target)} y2={y(target)} className="target" />
        {scores.map((s, i) => (
          <text key={s.id} x={x(i)} y={H - 8} textAnchor="middle" className="axis">
            {formatJa(s.date).replace(/（.）/, '')}
          </text>
        ))}
        {hover !== null && <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={pad.t + ih} className="crosshair" />}
        {SERIES.map((se) => (
          <g key={se.key}>
            <polyline
              fill="none"
              stroke={se.color}
              strokeWidth={2}
              strokeLinejoin="round"
              points={scores.map((s, i) => `${x(i)},${y(valueOf(s, se.key))}`).join(' ')}
            />
            {scores.map((s, i) => (
              <circle
                key={s.id}
                cx={x(i)}
                cy={y(valueOf(s, se.key))}
                r={hover === i ? 5 : 4}
                fill={se.color}
                stroke="var(--surface)"
                strokeWidth={2}
              />
            ))}
            <text x={x(last) + 8} y={labelY.get(se.key)} className="direct-label">
              {valueOf(scores[last], se.key)}
            </text>
          </g>
        ))}
      </svg>
      {hover !== null && (
        <div className="tooltip" role="status">
          <b>{formatJa(scores[hover].date, true)}</b>
          {SERIES.map((se) => (
            <span key={se.key}>
              <i style={{ background: se.color }} />
              {se.label} {valueOf(scores[hover], se.key)}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
