import { useState } from 'react'
import { Async } from '../components/Async'
import { ModeIcon, type ModeIconName } from '../icons'
import { loadAllQuestions, loadOsSchedule, useLoad } from '../lib/content'
import { diffDays, formatJa, formatMinutes, isSunday, todayKey } from '../lib/date'
import { requestQuizStart, type StartKind } from '../lib/quizNav'
import { navigate } from '../lib/router'
import {
  formatExamWhen,
  manualMinutesOn,
  minutesBetween,
  minutesOn,
  nextOsExam,
  quizMinutesOn,
  readiness,
  scheduledExams,
  streak,
  weekRange,
  type Readiness,
} from '../lib/stats'
import { newId, updateData, useData } from '../lib/store'
import type { OsExamSchedule, Question, QuestionIndex } from '../types'

export default function Home() {
  const state = useLoad(() => Promise.all([loadOsSchedule(), loadAllQuestions()]))
  return (
    <Async state={state}>
      {([schedule, { index, questions }]) => <HomeBody schedule={schedule} index={index} questions={questions} />}
    </Async>
  )
}

function HomeBody({
  schedule,
  index,
  questions,
}: {
  schedule: OsExamSchedule
  index: QuestionIndex
  questions: Question[]
}) {
  const data = useData()
  const today = todayKey()
  const week = weekRange(today)
  const next = nextOsExam(schedule, data, today)
  const ready = next ? readiness(data, index, questions, next.id) : null
  const upcoming = scheduledExams(schedule, data)
    .filter((e) => e.status !== 'passed' && e.date >= today && e.id !== next?.id)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3)
  const passed = scheduledExams(schedule, data).filter((e) => e.status === 'passed').length

  return (
    <div className="stack">
      <p className="date-line">{formatJa(today, true)}</p>

      {isSunday(today) && (
        <button className="banner" onClick={() => navigate('review')}>
          📊 日曜日です。今週の振り返りをしましょう →
        </button>
      )}

      {next ? (
        <section className="card hero">
          <div className="label">次の試験</div>
          <div className="hero-row">
            <div>
              <div className="exam-name">{next.name}</div>
              <div className="exam-when small muted">
                <span className={`pill ${next.confirmed ? 'confirmed' : 'planned'}`}>
                  {next.confirmed ? '予約確定' : '予定'}
                </span>
                <span>
                  {formatExamWhen(next, true)}
                  {next.isRetake ? '（再受験）' : ''}
                </span>
              </div>
              {next.place && <div className="small muted">📍 {next.place}</div>}
            </div>
            <div className="hero-count">{countdownLabel(diffDays(today, next.date))}</div>
          </div>
          {ready ? <ReadinessView r={ready} passRate={index.exams.find((e) => e.id === next.id)!.passRate} /> : (
            <p className="small muted">この試験の問題データはまだありません。</p>
          )}
        </section>
      ) : (
        <section className="card">
          <p>予定されている試験はありません。{passed === schedule.exams.length && `🏆 ${schedule.goal.name} 達成！`}</p>
        </section>
      )}

      {next && ready && <Recommendations examId={next.id} r={ready} daysLeft={diffDays(today, next.date)} />}

      <section className="card">
        <h2>今日の学習時間</h2>
        <div className="today-time">
          <div>
            <div className="big">{formatMinutes(minutesOn(data, today))}</div>
            <div className="small muted">
              問題演習 {formatMinutes(quizMinutesOn(data, today))}（自動）＋ その他 {formatMinutes(manualMinutesOn(data, today))}
            </div>
          </div>
        </div>
        <div className="grid-2 stats-row">
          <div>
            <div className="label">連続学習</div>
            <div className="mid">🔥 {streak(data, today)}日</div>
          </div>
          <div>
            <div className="label">今週の合計</div>
            <div className="mid">{formatMinutes(minutesBetween(data, week.from, week.to))}</div>
          </div>
        </div>
        <ManualRecorder today={today} />
      </section>

      {upcoming.length > 0 && (
        <section className="card">
          <h2>この後の受験予定</h2>
          <ul className="menu">
            {upcoming.map((e) => (
              <li key={e.id}>
                <span>{e.name}</span>
                <span className="small muted">
                  {formatExamWhen(e)}
                  {e.confirmed ? '' : '（予定）'}・あと{diffDays(today, e.date)}日
                </span>
              </li>
            ))}
          </ul>
          <button className="link" onClick={() => navigate('exams')}>
            受験スケジュールを見る →
          </button>
        </section>
      )}
    </div>
  )
}

function countdownLabel(days: number) {
  return days === 0 ? '今日！' : `あと${days}日`
}

function ReadinessView({ r, passRate }: { r: Readiness; passRate: number }) {
  const pct = (v: number) => `${Math.round(v * 100)}%`
  return (
    <div className="readiness">
      <div>
        <div className="label">着手</div>
        <div className="mid">
          {r.answered}
          <span className="small muted">/{r.total}問</span>
        </div>
        <div className="bar" aria-hidden>
          <div className="bar-fill done" style={{ width: `${r.total ? (r.answered / r.total) * 100 : 0}%` }} />
        </div>
      </div>
      <div>
        <div className="label">正答率</div>
        <div className={`mid ${r.rate !== null && r.rate < passRate ? 'down' : ''}`}>{r.rate === null ? '—' : pct(r.rate)}</div>
        <div className="small muted">合格ライン {pct(passRate)}</div>
      </div>
      <div>
        <div className="label">直近の模試</div>
        <div className={`mid ${r.lastMock && !r.lastMock.passed ? 'down' : ''}`}>
          {r.lastMock ? pct(r.lastMock.correct / r.lastMock.total) : '—'}
        </div>
        <div className="small muted">{r.lastMock ? (r.lastMock.passed ? '合格ライン到達' : '未到達') : '未受験'}</div>
      </div>
    </div>
  )
}

/** 状況に応じて、次にやるとよい演習をワンタップで始められるようにする */
function Recommendations({ examId, r, daysLeft }: { examId: string; r: Readiness; daysLeft: number }) {
  const items: { kind: StartKind; icon: ModeIconName; title: string; sub: string; category?: string }[] = []
  if (r.weakest)
    items.push({
      kind: 'weak',
      icon: 'weak',
      title: `苦手分野：${r.weakest.category}`,
      sub: `正答率 ${Math.round(r.weakest.rate * 100)}% → 10問`,
      category: r.weakest.category,
    })
  if (r.answered < r.total)
    items.push({ kind: 'unanswered', icon: 'unanswered', title: '未着手から10問', sub: `あと${r.total - r.answered}問` })
  if (r.wrong > 0) items.push({ kind: 'wrong', icon: 'wrong', title: '間違えた問題の復習', sub: `${r.wrong}問` })
  if (daysLeft <= 7 || r.answered >= r.total * 0.5)
    items.push({ kind: 'mock', icon: 'mock', title: '本番模試', sub: '30問・90分' })
  if (!items.length) items.push({ kind: 'random', icon: 'random', title: 'ランダム10問', sub: '全分野から' })

  return (
    <section className="card">
      <h2>今日のおすすめ</h2>
      <div className="reco-list">
        {items.slice(0, 3).map((it) => (
          <button
            key={it.kind}
            className="reco"
            onClick={() => requestQuizStart({ exam: examId, kind: it.kind, category: it.category })}
          >
            <ModeIcon className="reco-icon" name={it.icon} />
            <span className="reco-text">
              <b>{it.title}</b>
              <span className="small muted">{it.sub}</span>
            </span>
            <span aria-hidden>›</span>
          </button>
        ))}
      </div>
    </section>
  )
}

/** 問題演習以外（ドキュメントや動画での学習など）の時間を手動で記録する */
function ManualRecorder({ today }: { today: string }) {
  const data = useData()
  const [custom, setCustom] = useState('')
  const todays = data.studyLogs.filter((l) => l.date === today && l.subject === 'outsystems')

  const add = (minutes: number) => {
    if (!Number.isFinite(minutes) || minutes <= 0) return
    updateData((d) => ({
      ...d,
      studyLogs: [
        ...d.studyLogs,
        { id: newId(), date: today, subject: 'outsystems', minutes: Math.round(minutes), createdAt: new Date().toISOString() },
      ],
    }))
  }

  return (
    <details className="manual-rec">
      <summary>問題演習以外の学習を記録（ドキュメント・動画など）</summary>
      <div className="btn-row">
        {[15, 30, 60].map((m) => (
          <button key={m} className="btn small" onClick={() => add(m)}>
            +{m}分
          </button>
        ))}
        <form
          className="custom-min"
          onSubmit={(e) => {
            e.preventDefault()
            add(Number(custom))
            setCustom('')
          }}
        >
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={600}
            placeholder="分"
            aria-label="学習時間（分）"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
          />
          <button className="btn small primary" type="submit">
            追加
          </button>
        </form>
      </div>
      {todays.length > 0 && (
        <ul className="log-items">
          {todays.map((l) => (
            <li key={l.id}>
              <span>
                {new Date(l.createdAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })} {l.minutes}分
              </span>
              <button
                className="link danger"
                onClick={() => updateData((d) => ({ ...d, studyLogs: d.studyLogs.filter((x) => x.id !== l.id) }))}
              >
                取消
              </button>
            </li>
          ))}
        </ul>
      )}
    </details>
  )
}
