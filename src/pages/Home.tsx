import { useState } from 'react'
import { Async } from '../components/Async'
import { loadOsSchedule, loadToeicRoadmap, useLoad } from '../lib/content'
import { diffDays, formatJa, formatMinutes, fromKey, isSunday, todayKey } from '../lib/date'
import { navigate } from '../lib/router'
import { currentPhase, minutesBetween, minutesOn, nextOsExam, streak, weekRange } from '../lib/stats'
import { newId, updateData, useData } from '../lib/store'
import type { OsExamSchedule, Subject, ToeicRoadmap } from '../types'

const SUBJECTS: { id: Subject; label: string }[] = [
  { id: 'english', label: '英語' },
  { id: 'outsystems', label: 'OutSystems' },
]

export default function Home() {
  const plan = useLoad(() => Promise.all([loadToeicRoadmap(), loadOsSchedule()]))
  return (
    <Async state={plan}>{([roadmap, schedule]) => <HomeBody roadmap={roadmap} schedule={schedule} />}</Async>
  )
}

function HomeBody({ roadmap, schedule }: { roadmap: ToeicRoadmap; schedule: OsExamSchedule }) {
  const data = useData()
  const today = todayKey()
  const week = weekRange(today)
  const phase = currentPhase(roadmap, today)
  const nextExam = nextOsExam(schedule, data, today)
  const toeicDays = diffDays(today, roadmap.exam.date)
  const weekday = fromKey(today).getDay()
  const isWeekday = weekday >= 1 && weekday <= 5
  const minDone = !!data.minimumDone[today]

  return (
    <div className="stack">
      <p className="date-line">{formatJa(today, true)}</p>

      {isSunday(today) && (
        <button className="banner" onClick={() => navigate('review')}>
          📊 日曜日です。今週の振り返りをしましょう →
        </button>
      )}

      <div className="grid-2">
        <div className="card countdown">
          <div className="label">次のOutSystems試験</div>
          {nextExam ? (
            <>
              <div className="big">{countdownLabel(diffDays(today, nextExam.date))}</div>
              <div className="sub">
                {nextExam.name}
                <br />
                {formatJa(nextExam.date)}
                {nextExam.status === 'failed' && '（再受験）'}
              </div>
            </>
          ) : (
            <div className="sub">予定されている試験はありません</div>
          )}
        </div>
        <div className="card countdown">
          <div className="label">TOEIC本番</div>
          <div className="big">{toeicDays >= 0 ? countdownLabel(toeicDays) : '終了'}</div>
          <div className="sub">
            {formatJa(roadmap.exam.date)}
            <br />
            目標 {roadmap.exam.target}点
          </div>
        </div>
      </div>

      <label className={`card minimum ${minDone ? 'done' : ''}`}>
        <input
          type="checkbox"
          checked={minDone}
          onChange={(e) =>
            updateData((d) => ({ ...d, minimumDone: { ...d.minimumDone, [today]: e.target.checked } }))
          }
        />
        <div>
          <div className="minimum-title">最低ライン：{roadmap.minimumLine.label}</div>
          <div className="muted small">
            {minDone ? '達成！今日もつながりました 🎉' : '疲れた日はこれだけでOK。ストリークが続きます'}
          </div>
        </div>
      </label>

      <div className="grid-2">
        <div className="card stat">
          <div className="label">連続学習</div>
          <div className="big">🔥 {streak(data, today)}日</div>
        </div>
        <div className="card stat">
          <div className="label">今週の合計</div>
          <div className="big">{formatMinutes(minutesBetween(data, week.from, week.to))}</div>
          <div className="sub small">
            英語 {formatMinutes(minutesBetween(data, week.from, week.to, 'english'))} ／ OS{' '}
            {formatMinutes(minutesBetween(data, week.from, week.to, 'outsystems'))}
          </div>
        </div>
      </div>

      <StudyRecorder today={today} />

      <section className="card">
        <h2>TOEIC：今週やること</h2>
        {phase.kind === 'in' && (
          <>
            <p className="phase-tag">
              {phase.phase.title}（{formatJa(phase.phase.start)}〜{formatJa(phase.phase.end)}）
            </p>
            <ul className="checklist">
              {phase.phase.tasks.map((t) => (
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
            {phase.phase.notes?.map((n) => (
              <p key={n} className="note">
                ⚠️ {n}
              </p>
            ))}
          </>
        )}
        {phase.kind === 'before' && (
          <p>
            次の期間「{phase.next.title}」は {formatJa(phase.next.start)} から（あと{phase.daysUntil}日）。
            <br />
            <span className="muted small">{phase.next.tasks.map((t) => t.text).join(' ／ ')}</span>
          </p>
        )}
        {phase.kind === 'examDay' && <p className="big-text">🎯 今日は本番！ベストを尽くしましょう。</p>}
        {phase.kind === 'after' && (
          <p>
            本番お疲れさまでした。次は{roadmap.longTermGoal.label}の{roadmap.longTermGoal.score}点です。
          </p>
        )}
      </section>

      {(phase.kind === 'in' || phase.kind === 'before') && (
        <section className="card">
          <h2>🚃 通勤中のメニュー{isWeekday ? '' : '（平日用）'}</h2>
          <ul className="menu">
            {(phase.kind === 'in' ? phase.phase : phase.next).commute.map((c) => (
              <li key={c.label}>
                <span>{c.label}</span>
                <span className="pill">{c.minutes}分</span>
              </li>
            ))}
          </ul>
          {!isWeekday && <p className="muted small">週末はOutSystemsの学習・受験を優先しましょう。</p>}
        </section>
      )}
    </div>
  )
}

function countdownLabel(days: number) {
  if (days === 0) return '今日！'
  return `あと${days}日`
}

function StudyRecorder({ today }: { today: string }) {
  const data = useData()
  const [custom, setCustom] = useState<Record<Subject, string>>({ english: '', outsystems: '' })
  const todays = data.studyLogs.filter((l) => l.date === today)

  const add = (subject: Subject, minutes: number) => {
    if (!Number.isFinite(minutes) || minutes <= 0) return
    updateData((d) => ({
      ...d,
      studyLogs: [
        ...d.studyLogs,
        { id: newId(), date: today, subject, minutes: Math.round(minutes), createdAt: new Date().toISOString() },
      ],
    }))
  }

  return (
    <section className="card">
      <h2>今日の学習時間を記録</h2>
      {SUBJECTS.map((s) => (
        <div key={s.id} className="recorder">
          <div className="recorder-head">
            <span className={`subject ${s.id}`}>{s.label}</span>
            <span className="total">{formatMinutes(minutesOn(data, today, s.id))}</span>
          </div>
          <div className="btn-row">
            {[15, 30, 60].map((m) => (
              <button key={m} className="btn small" onClick={() => add(s.id, m)}>
                +{m}分
              </button>
            ))}
            <form
              className="custom-min"
              onSubmit={(e) => {
                e.preventDefault()
                add(s.id, Number(custom[s.id]))
                setCustom((c) => ({ ...c, [s.id]: '' }))
              }}
            >
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={600}
                placeholder="分"
                aria-label={`${s.label}の学習時間（分）`}
                value={custom[s.id]}
                onChange={(e) => setCustom((c) => ({ ...c, [s.id]: e.target.value }))}
              />
              <button className="btn small primary" type="submit">
                追加
              </button>
            </form>
          </div>
        </div>
      ))}
      {todays.length > 0 && (
        <details className="log-list">
          <summary>今日の記録（{todays.length}件）</summary>
          <ul>
            {todays.map((l) => (
              <li key={l.id}>
                <span>
                  {new Date(l.createdAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}{' '}
                  {l.subject === 'english' ? '英語' : 'OutSystems'} {l.minutes}分
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
        </details>
      )}
    </section>
  )
}
