import { Async } from '../components/Async'
import { loadOsSchedule, useLoad } from '../lib/content'
import { diffDays, formatJa, todayKey } from '../lib/date'
import { navigate } from '../lib/router'
import { scheduledExams, suggestRetake } from '../lib/stats'
import { updateData, useData } from '../lib/store'
import type { ExamResult, ExamStatus, OsExamSchedule } from '../types'

const STATUS_LABEL: Record<ExamStatus, string> = { untaken: '未受験', passed: '合格', failed: '不合格' }

export default function Exams() {
  const state = useLoad(loadOsSchedule)
  return <Async state={state}>{(s) => <ExamsBody schedule={s} />}</Async>
}

function ExamsBody({ schedule }: { schedule: OsExamSchedule }) {
  const data = useData()
  const today = todayKey()
  const exams = scheduledExams(schedule, data)
  const passed = exams.filter((e) => e.status === 'passed').length
  const usedSlots = new Map(
    Object.entries(data.examResults)
      .filter(([, r]) => r.retakeDate)
      .map(([id, r]) => [r.retakeDate as string, exams.find((e) => e.id === id)?.name ?? id]),
  )

  const setStatus = (id: string, status: ExamStatus) => {
    updateData((d) => {
      const prev: ExamResult = d.examResults[id] ?? { status: 'untaken', history: [] }
      const exam = exams.find((e) => e.id === id)!
      const next: ExamResult = {
        ...prev,
        status,
        history: status === 'untaken' ? prev.history : [...prev.history, { date: exam.date, status }],
      }
      // 未受験に戻したら再受験日の提案も取り消す
      if (status === 'untaken') delete next.retakeDate
      return { ...d, examResults: { ...d.examResults, [id]: next } }
    })
  }

  const setRetake = (id: string, date: string | undefined) => {
    updateData((d) => {
      const prev = d.examResults[id]
      if (!prev) return d
      const next: ExamResult = { ...prev, retakeDate: date }
      if (date) next.status = 'untaken' // 再受験を予定した時点で「未受験」に戻す
      return { ...d, examResults: { ...d.examResults, [id]: next } }
    })
  }

  return (
    <div className="stack">
      <section className="card goal">
        <div className="label">{schedule.goal.name} まで</div>
        <div className="big">
          {passed} / {exams.length}
        </div>
        <div className="progress">
          <div className="progress-fill" style={{ width: `${(passed / exams.length) * 100}%` }} />
        </div>
        <p className="small muted">
          {passed === exams.length ? `🏆 ${schedule.goal.name} 取得おめでとうございます！` : schedule.goal.description}
        </p>
      </section>

      {exams.map((e) => {
        const result = data.examResults[e.id]
        const days = diffDays(today, e.date)
        // 不合格なら、その受験日（再受験で落ちた場合は再受験日）から次の予備枠を提案
        const suggestion = e.status === 'failed' ? suggestRetake(schedule, data, e.id, e.date) : undefined
        return (
          <section key={e.id} className={`card exam status-${e.status}`}>
            <div className="exam-head">
              <div>
                <div className="exam-name">{e.name}</div>
                <div className="small muted">
                  {formatJa(e.date, true)}
                  {e.date !== e.originalDate && `（再受験・当初 ${formatJa(e.originalDate)}）`}
                  {e.status !== 'passed' && days >= 0 && ` ・ あと${days}日`}
                </div>
              </div>
              <span className={`pill status ${e.status}`}>{STATUS_LABEL[e.status]}</span>
            </div>
            <div className="segmented" role="radiogroup" aria-label={`${e.name}の結果`}>
              {(Object.keys(STATUS_LABEL) as ExamStatus[]).map((s) => (
                <button
                  key={s}
                  role="radio"
                  aria-checked={e.status === s}
                  className={e.status === s ? `on ${s}` : ''}
                  onClick={() => setStatus(e.id, s)}
                >
                  {STATUS_LABEL[s]}
                </button>
              ))}
            </div>
            {e.status === 'failed' && (
              <div className="suggest">
                {suggestion ? (
                  <>
                    <p>
                      💡 再受験日の提案：<b>{formatJa(suggestion)}</b>（予備枠）
                    </p>
                    <button className="btn small primary" onClick={() => setRetake(e.id, suggestion)}>
                      この日で再受験する
                    </button>
                  </>
                ) : (
                  <p>空いている予備枠がありません。日程を見直しましょう。</p>
                )}
              </div>
            )}
            {result?.retakeDate && e.status !== 'failed' && (
              <p className="small">
                🔁 再受験日：{formatJa(result.retakeDate)}{' '}
                <button className="link" onClick={() => setRetake(e.id, undefined)}>
                  取り消す
                </button>
              </p>
            )}
            {result && result.history.length > 0 && (
              <p className="small muted">
                履歴：{result.history.map((h) => `${formatJa(h.date)} ${STATUS_LABEL[h.status]}`).join(' → ')}
              </p>
            )}
            {e.id === 'web-developer-specialist' && e.status !== 'passed' && (
              <button className="link" onClick={() => navigate('quiz')}>
                📝 問題演習へ
              </button>
            )}
          </section>
        )
      })}

      <section className="card">
        <h2>予備枠</h2>
        <ul className="menu">
          {schedule.reserveSlots.map((s) => (
            <li key={s}>
              <span>{formatJa(s, true)}</span>
              <span className={`pill ${usedSlots.has(s) ? 'ng' : ''}`}>{usedSlots.get(s) ?? '空き'}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
