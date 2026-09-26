import { useEffect, useState } from 'react'
import { Async } from '../components/Async'
import { loadOsSchedule, loadQuestionIndex, loadToeicRoadmap, useLoad } from '../lib/content'
import { addDays, formatJa, toKey, formatMinutes, todayKey, weekStart } from '../lib/date'
import { categoryStats, minutesBetween, minutesOn, scheduledExams } from '../lib/stats'
import { updateData, useData } from '../lib/store'
import type { OsExamSchedule, QuestionIndex, ToeicRoadmap } from '../types'

export default function Review() {
  const state = useLoad(() => Promise.all([loadToeicRoadmap(), loadOsSchedule(), loadQuestionIndex()]))
  return <Async state={state}>{([r, s, q]) => <ReviewBody roadmap={r} schedule={s} index={q} />}</Async>
}

function ReviewBody({ roadmap, schedule, index }: { roadmap: ToeicRoadmap; schedule: OsExamSchedule; index: QuestionIndex }) {
  const data = useData()
  const thisWeek = weekStart(todayKey())
  const [from, setFrom] = useState(thisWeek)
  const to = addDays(from, 6)
  const nextFrom = addDays(from, 7)
  const nextTo = addDays(from, 13)
  const days = Array.from({ length: 7 }, (_, i) => addDays(from, i))
  const maxDay = Math.max(60, ...days.map((d) => minutesOn(data, d)))
  const prevTotal = minutesBetween(data, addDays(from, -7), addDays(from, -1))
  const total = minutesBetween(data, from, to)

  // 分野別正答率の変化：先週末までの累計 → 今週末までの累計
  const exam = index.exams[0]
  const cats = exam?.categories.map((c) => c.name) ?? []
  const before = exam ? categoryStats(data.answers.filter((a) => toLocalKey(a.at) < from), exam.id, cats) : []
  const after = exam ? categoryStats(data.answers.filter((a) => toLocalKey(a.at) <= to), exam.id, cats) : []
  const weekAnswers = data.answers.filter((a) => {
    const d = toLocalKey(a.at)
    return d >= from && d <= to
  })

  const nextPhases = roadmap.phases.filter((p) => p.start <= nextTo && p.end >= nextFrom)
  const nextExams = scheduledExams(schedule, data).filter((e) => e.date >= nextFrom && e.date <= nextTo && e.status !== 'passed')
  const toeicNext = roadmap.exam.date >= nextFrom && roadmap.exam.date <= nextTo

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
            <div className="label">英語</div>
            <div className="mid">{formatMinutes(minutesBetween(data, from, to, 'english'))}</div>
            <div className="label">OutSystems</div>
            <div className="mid">{formatMinutes(minutesBetween(data, from, to, 'outsystems'))}</div>
          </div>
        </div>
        <ul className="day-bars">
          {days.map((d) => {
            const en = minutesOn(data, d, 'english')
            const os = minutesOn(data, d, 'outsystems')
            return (
              <li key={d}>
                <span className="day">{formatJa(d).replace(/^\d+\//, '')}</span>
                <span className="bars" title={`英語${en}分 / OutSystems${os}分`}>
                  {en > 0 && <span className="seg english" style={{ width: `${(en / maxDay) * 100}%` }} />}
                  {os > 0 && <span className="seg outsystems" style={{ width: `${(os / maxDay) * 100}%` }} />}
                </span>
                <span className="small">
                  {en + os ? formatMinutes(en + os) : data.minimumDone[d] ? '最低ライン✓' : '—'}
                </span>
              </li>
            )
          })}
        </ul>
        <div className="legend small">
          <span>
            <i className="english" /> 英語
          </span>
          <span>
            <i className="outsystems" /> OutSystems
          </span>
        </div>
      </section>

      {exam && (
        <section className="card">
          <h2>分野別正答率の変化</h2>
          <p className="small muted">今週の回答数：{weekAnswers.length}問（先週末までの累計 → 今週末までの累計）</p>
          <ul className="menu">
            {cats.map((c, i) => {
              const b = before[i].rate
              const a = after[i].rate
              const delta = a !== null && b !== null ? Math.round((a - b) * 100) : null
              return (
                <li key={c} className={a !== null && a < 0.7 ? 'weak-row' : ''}>
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
      )}

      <section className="card">
        <h2>来週の予定（{formatJa(nextFrom)}〜）</h2>
        <ul className="plain">
          {nextExams.map((e) => (
            <li key={e.id}>
              🎓 {formatJa(e.date)} OutSystems {e.name} 受験
            </li>
          ))}
          {toeicNext && <li>🎯 {formatJa(roadmap.exam.date)} TOEIC本番</li>}
          {nextPhases.map((p) => (
            <li key={p.id}>
              🎧 TOEIC「{p.title}」：{p.commute.map((c) => `${c.label.replace(/（.*?）/g, '')}${c.minutes}分`).join('、')}
            </li>
          ))}
          {!nextExams.length && !toeicNext && !nextPhases.length && <li className="muted">予定はありません</li>}
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

// 回答日時(ISO/UTC)を端末ローカルの日付キーに変換
const toLocalKey = (iso: string) => toKey(new Date(iso))
