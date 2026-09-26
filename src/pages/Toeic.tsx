import { useState } from 'react'
import { Async } from '../components/Async'
import { ScoreChart } from '../components/ScoreChart'
import { loadToeicRoadmap, useLoad } from '../lib/content'
import { diffDays, formatJa, todayKey } from '../lib/date'
import { currentPhase } from '../lib/stats'
import { newId, updateData, useData } from '../lib/store'
import type { ToeicRoadmap } from '../types'

export default function Toeic() {
  const state = useLoad(loadToeicRoadmap)
  return <Async state={state}>{(r) => <ToeicBody roadmap={r} />}</Async>
}

function ToeicBody({ roadmap }: { roadmap: ToeicRoadmap }) {
  const data = useData()
  const today = todayKey()
  const info = currentPhase(roadmap, today)
  const currentId = info.kind === 'in' ? info.phase.id : null
  const days = diffDays(today, roadmap.exam.date)
  const b = roadmap.baseline

  return (
    <div className="stack">
      <section className="card">
        <div className="score-summary">
          <div>
            <div className="label">{b.label}</div>
            <div className="big">{b.total}</div>
            <div className="small muted">
              L{b.listening} / R{b.reading}
            </div>
          </div>
          <div className="arrow">→</div>
          <div>
            <div className="label">目標（{formatJa(roadmap.exam.date)}）</div>
            <div className="big accent">{roadmap.exam.target}</div>
            <div className="small muted">
              {days > 0 ? `あと${days}日` : days === 0 ? '今日が本番' : '終了'}
            </div>
          </div>
        </div>
        <p className="small">
          📌 {roadmap.focus}
          <br />
          🌱 {roadmap.longTermGoal.label}：{roadmap.longTermGoal.score}点
        </p>
      </section>

      {roadmap.phases.map((p) => {
        const done = p.tasks.filter((t) => data.toeicChecks[t.id]).length
        const isCurrent = p.id === currentId
        const isPast = p.end < today
        return (
          <details key={p.id} className={`card phase ${isCurrent ? 'current' : ''} ${isPast ? 'past' : ''}`} open={isCurrent || undefined}>
            <summary>
              <span>
                {isCurrent && <span className="pill now">今ここ</span>} <b>{p.title}</b>
                <span className="small muted">
                  {' '}
                  {formatJa(p.start)}〜{formatJa(p.end)}
                </span>
              </span>
              <span className="small muted">
                {done}/{p.tasks.length}
              </span>
            </summary>
            <p className="small muted">{p.summary}</p>
            <ul className="checklist">
              {p.tasks.map((t) => (
                <li key={t.id}>
                  <label>
                    <input
                      type="checkbox"
                      checked={!!data.toeicChecks[t.id]}
                      onChange={(e) =>
                        updateData((d) => ({ ...d, toeicChecks: { ...d.toeicChecks, [t.id]: e.target.checked } }))
                      }
                    />
                    <span>{t.text}</span>
                  </label>
                </li>
              ))}
            </ul>
            {p.notes?.map((n) => (
              <p key={n} className="note">
                ⚠️ {n}
              </p>
            ))}
          </details>
        )
      })}
      <section className={`card phase ${info.kind === 'examDay' ? 'current' : ''}`}>
        <b>🎯 本番</b> <span className="small muted">{formatJa(roadmap.exam.date, true)}</span>
      </section>

      <ScoreSection target={roadmap.exam.target} />
    </div>
  )
}

function ScoreSection({ target }: { target: number }) {
  const data = useData()
  const [form, setForm] = useState({ date: todayKey(), listening: '', reading: '', note: '' })
  const scores = [...data.toeicScores].sort((a, b) => a.date.localeCompare(b.date))
  const valid = (v: string) => v !== '' && Number(v) >= 5 && Number(v) <= 495

  return (
    <section className="card">
      <h2>模試スコアの記録</h2>
      <form
        className="score-form"
        onSubmit={(e) => {
          e.preventDefault()
          if (!valid(form.listening) || !valid(form.reading)) return alert('L・Rはそれぞれ5〜495で入力してください')
          updateData((d) => ({
            ...d,
            toeicScores: [
              ...d.toeicScores,
              {
                id: newId(),
                date: form.date,
                listening: Number(form.listening),
                reading: Number(form.reading),
                note: form.note || undefined,
              },
            ],
          }))
          setForm({ ...form, listening: '', reading: '', note: '' })
        }}
      >
        <label>
          日付
          <input type="date" value={form.date} required onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </label>
        <label>
          L
          <input type="number" inputMode="numeric" min={5} max={495} step={5} value={form.listening} onChange={(e) => setForm({ ...form, listening: e.target.value })} />
        </label>
        <label>
          R
          <input type="number" inputMode="numeric" min={5} max={495} step={5} value={form.reading} onChange={(e) => setForm({ ...form, reading: e.target.value })} />
        </label>
        <label className="wide">
          メモ
          <input type="text" placeholder="例：公式問題集10 TEST1" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
        </label>
        <button className="btn primary wide" type="submit">
          記録する
        </button>
      </form>

      {scores.length > 0 ? (
        <>
          <ScoreChart scores={scores} target={target} />
          <table className="table">
            <thead>
              <tr>
                <th>日付</th>
                <th>L</th>
                <th>R</th>
                <th>合計</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {scores.map((s) => (
                <tr key={s.id}>
                  <td>
                    {formatJa(s.date)}
                    {s.note && <div className="small muted">{s.note}</div>}
                  </td>
                  <td>{s.listening}</td>
                  <td>{s.reading}</td>
                  <td>
                    <b>{s.listening + s.reading}</b>
                  </td>
                  <td>
                    <button
                      className="link danger"
                      onClick={() =>
                        confirm('この記録を削除しますか？') &&
                        updateData((d) => ({ ...d, toeicScores: d.toeicScores.filter((x) => x.id !== s.id) }))
                      }
                    >
                      削除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : (
        <p className="muted small">記録するとL/R別の推移グラフが表示されます。</p>
      )}
    </section>
  )
}
