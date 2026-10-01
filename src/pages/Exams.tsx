import { useState } from 'react'
import { Async } from '../components/Async'
import { Modal } from '../components/Modal'
import { loadOsSchedule, loadQuestionIndex, useLoad } from '../lib/content'
import { diffDays, formatJa, todayKey } from '../lib/date'
import { openQuizFor } from '../lib/quizNav'
import { formatExamWhen, scheduledExams, suggestRetake, type ScheduledExam } from '../lib/stats'
import { updateData, useData } from '../lib/store'
import type { ExamBooking, ExamResult, ExamStatus, OsExamSchedule } from '../types'

const STATUS_LABEL: Record<ExamStatus, string> = { untaken: '未受験', passed: '合格', failed: '不合格' }

export default function Exams() {
  const state = useLoad(() => Promise.all([loadOsSchedule(), loadQuestionIndex()]))
  return (
    <Async state={state}>
      {([s, index]) => <ExamsBody schedule={s} examsWithQuestions={new Set(index.exams.map((e) => e.id))} />}
    </Async>
  )
}

function ExamsBody({ schedule, examsWithQuestions }: { schedule: OsExamSchedule; examsWithQuestions: Set<string> }) {
  const data = useData()
  const today = todayKey()
  const exams = scheduledExams(schedule, data)
  const [editing, setEditing] = useState<ScheduledExam | null>(null)
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
      // 再受験は新しい予約になるため、前回の確定日時は消す
      delete next.booking
      if (date) next.status = 'untaken' // 再受験を予定した時点で「未受験」に戻す
      return { ...d, examResults: { ...d.examResults, [id]: next } }
    })
  }

  const setBooking = (id: string, booking: ExamBooking | undefined) => {
    updateData((d) => {
      const prev: ExamResult = d.examResults[id] ?? { status: 'untaken', history: [] }
      const next: ExamResult = { ...prev, booking }
      if (!booking) delete next.booking
      return { ...d, examResults: { ...d.examResults, [id]: next } }
    })
  }

  return (
    <div className="stack">
      {editing && (
        <BookingEditor
          exam={editing}
          onSave={(b) => {
            setBooking(editing.id, b)
            setEditing(null)
          }}
          onClose={() => setEditing(null)}
        />
      )}
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
                <div className="exam-when small">
                  <span className={`pill ${e.confirmed ? 'confirmed' : 'planned'}`}>{e.confirmed ? '予約確定' : '予定'}</span>
                  <span>
                    {formatExamWhen(e, true)}
                    {e.status !== 'passed' && days >= 0 && ` ・ あと${days}日`}
                  </span>
                </div>
                {e.place && <div className="small muted">📍 {e.place}</div>}
                {(e.isRetake || e.date !== e.plannedDate) && (
                  <div className="small muted">
                    {e.isRetake && `再受験・当初 ${formatJa(e.originalDate)}`}
                    {e.isRetake && e.date !== e.plannedDate && '／'}
                    {e.date !== e.plannedDate && `予定日 ${formatJa(e.plannedDate)}から変更`}
                  </div>
                )}
                <button className="link exam-edit" onClick={() => setEditing(e)}>
                  ✏️ {e.confirmed ? '日時を編集' : '確定した日時を入力'}
                </button>
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
            {examsWithQuestions.has(e.id) && e.status !== 'passed' && (
              <button className="link" onClick={() => openQuizFor(e.id)}>
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

function BookingEditor({
  exam,
  onSave,
  onClose,
}: {
  exam: ScheduledExam
  onSave: (b: ExamBooking | undefined) => void
  onClose: () => void
}) {
  const [date, setDate] = useState(exam.date)
  const [time, setTime] = useState(exam.time ?? '')
  const [place, setPlace] = useState(exam.place ?? '')

  return (
    <Modal title="受験日時の確定" onClose={onClose}>
      <form
        onSubmit={(ev) => {
          ev.preventDefault()
          if (!date) return
          onSave({ date, time: time || undefined, place: place.trim() || undefined })
        }}
      >
        <p className="small">
          <b>{exam.name}</b>
          <br />
          <span className="muted">予定日：{formatJa(exam.plannedDate, true)}</span>
        </p>
        <div className="field-row">
          <label className="field">
            <span>受験日</span>
            <input type="date" required value={date} onChange={(ev) => setDate(ev.target.value)} />
          </label>
          <label className="field">
            <span>開始時刻（任意）</span>
            <input type="time" value={time} onChange={(ev) => setTime(ev.target.value)} />
          </label>
        </div>
        <label className="field">
          <span>会場・受験方法（任意）</span>
          <input
            type="text"
            value={place}
            placeholder="例：オンライン（自宅）、テストセンター渋谷"
            onChange={(ev) => setPlace(ev.target.value)}
          />
        </label>
        <div className="modal-actions">
          {exam.confirmed && (
            <button type="button" className="btn small danger" onClick={() => onSave(undefined)}>
              予定日に戻す
            </button>
          )}
          <span className="spacer" />
          <button type="button" className="btn small" onClick={onClose}>
            キャンセル
          </button>
          <button type="submit" className="btn small primary" disabled={!date}>
            確定して保存
          </button>
        </div>
      </form>
    </Modal>
  )
}
