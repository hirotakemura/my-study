import { useEffect, useState } from 'react'
import { Async } from '../components/Async'
import { loadOsSchedule, loadQuestionIndex, useLoad } from '../lib/content'
import { addDays, formatJa, formatMinutes, todayKey, toKey, weekStart } from '../lib/date'
import {
  answerDate,
  categoryStats,
  daysBetween,
  manualMinutesOn,
  minutesBetween,
  quizMinutesOn,
  scheduledExams,
} from '../lib/stats'
import { updateData, useData } from '../lib/store'
import type { OsExamSchedule, QuestionIndex } from '../types'

export default function Review() {
  const state = useLoad(() => Promise.all([loadOsSchedule(), loadQuestionIndex()]))
  return <Async state={state}>{([s, q]) => <ReviewBody schedule={s} index={q} />}</Async>
}

function ReviewBody({ schedule, index }: { schedule: OsExamSchedule; index: QuestionIndex }) {
  const data = useData()
  const thisWeek = weekStart(todayKey())
  const [from, setFrom] = useState(thisWeek)
  const to = addDays(from, 6)
  const nextFrom = addDays(from, 7)
  const nextTo = addDays(from, 13)
  const days = daysBetween(from, to)
  const maxDay = Math.max(60, ...days.map((d) => quizMinutesOn(data, d) + manualMinutesOn(data, d)))
  const prevTotal = minutesBetween(data, addDays(from, -7), addDays(from, -1))
  const total = minutesBetween(data, from, to)

  const weekAnswers = data.answers.filter((a) => {
    const d = answerDate(a)
    return d >= from && d <= to
  })
  const weekCorrect = weekAnswers.filter((a) => a.correct).length
  const weekMocks = data.mockExams.filter((m) => {
    const d = toKey(new Date(m.at))
    return d >= from && d <= to
  })

  // 分野別正答率の変化：先週末までの累計 → 今週末までの累計（問題データがある試験ごと）
  const examsWithData = index.exams.filter((e) => data.answers.some((a) => a.exam === e.id))
  const nextExams = scheduledExams(schedule, data).filter((e) => e.date >= nextFrom && e.date <= nextTo && e.status !== 'passed')

  return (
    <div className="stack">
      <div className="week-nav">
        <button className="btn small" onClick={() => setFrom(addDays(from, -7))}>
          ← 前週
        </button>
        <b>
          {formatJa(from)}〜{formatJa(to)}
        </b>
        <button className="btn small" disabled={from >= thisWeek} onClick={() => setFrom(addDays(from, 7))}>
          次週 →
        </button>
      </div>

      <section className="card">
        <h2>学習時間</h2>
        <div className="score-summary">
          <div>
            <div className="label">合計</div>
            <div className="big">{formatMinutes(total)}</div>
            <div className="small muted">
              先週比 {total - prevTotal >= 0 ? '+' : '−'}
              {formatMinutes(Math.abs(total - prevTotal))}
            </div>
          </div>
          <div>
            <div className="label">問題演習（自動）</div>
            <div className="mid">{formatMinutes(minutesBetween(data, from, to, 'quiz'))}</div>
            <div className="label">その他（手動）</div>
            <div className="mid">{formatMinutes(minutesBetween(data, from, to, 'manual'))}</div>
          </div>
        </div>
        <ul className="day-bars">
          {days.map((d) => {
            const q = quizMinutesOn(data, d)
            const m = manualMinutesOn(data, d)
            return (
              <li key={d}>
                <span className="day">{formatJa(d).replace(/^\d+\//, '')}</span>
                <span className="bars" title={`問題演習${q}分 / その他${m}分`}>
                  {q > 0 && <span className="seg quiz" style={{ width: `${(q / maxDay) * 100}%` }} />}
                  {m > 0 && <span className="seg manual" style={{ width: `${(m / maxDay) * 100}%` }} />}
                </span>
                <span className="small">{q + m ? formatMinutes(q + m) : '—'}</span>
              </li>
            )
          })}
        </ul>
        <div className="legend small">
          <span>
            <i className="quiz" /> 問題演習
          </span>
          <span>
            <i className="manual" /> その他
          </span>
        </div>
      </section>

      <section className="card">
        <h2>問題演習</h2>
        <div className="grid-3">
          <div>
            <div className="label">回答数</div>
            <div className="mid">{weekAnswers.length}問</div>
          </div>
          <div>
            <div className="label">正答率</div>
            <div className="mid">{weekAnswers.length ? `${Math.round((weekCorrect / weekAnswers.length) * 100)}%` : '—'}</div>
          </div>
          <div>
            <div className="label">模試</div>
            <div className="mid">{weekMocks.length}回</div>
          </div>
        </div>
        {weekMocks.length > 0 && (
          <ul className="menu">
            {weekMocks.map((m) => (
              <li key={m.at}>
                <span className="small">{formatJa(toKey(new Date(m.at)))} 模試</span>
                <span className="small">
                  {m.correct}/{m.total}（{Math.round((m.correct / m.total) * 100)}%）
                  <span className={`pill ${m.passed ? 'ok' : 'ng'}`}>{m.passed ? '合格' : '不合格'}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {examsWithData.map((exam) => {
        const cats = exam.categories.map((c) => c.name)
        const before = categoryStats(data.answers.filter((a) => answerDate(a) < from), exam.id, cats)
        const after = categoryStats(data.answers.filter((a) => answerDate(a) <= to), exam.id, cats)
        return (
          <section key={exam.id} className="card">
            <h2>分野別正答率の変化</h2>
            <p className="small muted">{exam.name}（先週末までの累計 → 今週末までの累計）</p>
            <ul className="menu">
              {cats.map((c, i) => {
                const b = before[i].rate
                const a = after[i].rate
                const delta = a !== null && b !== null ? Math.round((a - b) * 100) : null
                return (
                  <li key={c} className={a !== null && a < exam.passRate ? 'weak-row' : ''}>
                    <span className="small">{c}</span>
                    <span className="small">
                      {pct(b)} → <b>{pct(a)}</b>{' '}
                      {delta !== null && delta !== 0 && (
                        <span className={delta > 0 ? 'up' : 'down'}>
                          {delta > 0 ? '▲' : '▼'}
                          {Math.abs(delta)}
                        </span>
                      )}
                    </span>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}

      <section className="card">
        <h2>来週の予定（{formatJa(nextFrom)}〜）</h2>
        <ul className="plain">
          {nextExams.map((e) => (
            <li key={e.id}>
              🎓 {formatJa(e.date)} {e.name} 受験
            </li>
          ))}
          {!nextExams.length && <li className="muted">来週の受験予定はありません</li>}
        </ul>
      </section>

      <MemoEditor week={from} />
    </div>
  )
}

function MemoEditor({ week }: { week: string }) {
  const data = useData()
  const saved = data.reviewMemos[week] ?? ''
  const [text, setText] = useState(saved)
  const [status, setStatus] = useState('')
  useEffect(() => {
    setText(saved)
    setStatus('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [week])

  const pastMemos = Object.entries(data.reviewMemos)
    .filter(([w, m]) => w !== week && m.trim())
    .sort(([a], [b]) => b.localeCompare(a))

  return (
    <section className="card">
      <h2>振り返りメモ</h2>
      <textarea
        className="memo"
        rows={5}
        placeholder="よかったこと／うまくいかなかったこと／来週の工夫"
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          setStatus('未保存')
        }}
      />
      <div className="btn-row spread">
        <span className="small muted">{status}</span>
        <button
          className="btn primary"
          onClick={() => {
            updateData((d) => ({ ...d, reviewMemos: { ...d.reviewMemos, [week]: text } }))
            setStatus('保存しました')
          }}
        >
          保存
        </button>
      </div>
      {pastMemos.length > 0 && (
        <details className="log-list">
          <summary>過去のメモ（{pastMemos.length}件）</summary>
          <ul className="plain">
            {pastMemos.map(([w, m]) => (
              <li key={w}>
                <b className="small">{formatJa(w)}の週</b>
                <p className="pre small">{m}</p>
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  )
}

function pct(r: number | null) {
  return r === null ? '—' : `${Math.round(r * 100)}%`
}

