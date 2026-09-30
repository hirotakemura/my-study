import { useEffect, useMemo, useState } from 'react'
import { Async } from '../components/Async'
import { loadAllQuestions, useLoad } from '../lib/content'
import { formatMinutes } from '../lib/date'
import { buildQuiz, getPreferredExam, takePendingStart, type StartKind } from '../lib/quizNav'
import { useQuizTimer } from '../lib/quizTimer'
import { categoryStats, shuffle, wrongQuestionIds } from '../lib/stats'
import { getData, updateData, useData } from '../lib/store'
import type { AnswerRecord, ExamQuestionSet, Question, QuestionIndex, QuizMode } from '../types'

export default function Quiz() {
  const state = useLoad(loadAllQuestions)
  return <Async state={state}>{(v) => <QuizRoot index={v.index} questions={v.questions} />}</Async>
}

interface Session {
  mode: QuizMode
  title: string
  exam: ExamQuestionSet
  items: { q: Question; order: number[] }[]
  /** 回答した「元の選択肢インデックス」 */
  picks: (number | null)[]
  current: number
  deadline?: number
  finished: boolean
}

function makeSession(mode: QuizMode, title: string, exam: ExamQuestionSet, qs: Question[]): Session {
  return {
    mode,
    title,
    exam,
    // 選択肢は毎回シャッフル（order は表示順→元のインデックス）
    items: qs.map((q) => ({ q, order: shuffle(q.options.map((_, i) => i)) })),
    picks: qs.map(() => null),
    current: 0,
    deadline: mode === 'mock' ? Date.now() + exam.mock.minutes * 60_000 : undefined,
    finished: false,
  }
}

let activeSession: Session | null = null

function start(kind: StartKind, exam: ExamQuestionSet, questions: Question[], category?: string): Session | null {
  const built = buildQuiz(kind, exam, questions, getData().answers, category)
  return built ? makeSession(built.mode, built.title, exam, built.qs) : null
}

function QuizRoot({ index, questions }: { index: QuestionIndex; questions: Question[] }) {
  const preferred = getPreferredExam()
  const [examId, setExamId] = useState(
    index.exams.some((e) => e.id === preferred) ? (preferred as string) : index.exams[0]?.id,
  )
  // タブを切り替えても演習中の状態が消えないようモジュール変数に退避する。
  // ホームなどから出題を指定されていれば、ここで開始する（演習中なら続きを優先）
  const [session, setSessionState] = useState<Session | null>(() => {
    const req = takePendingStart()
    if (activeSession || !req) return activeSession
    const ex = index.exams.find((e) => e.id === req.exam)
    activeSession = ex ? start(req.kind, ex, questions.filter((q) => q.exam === ex.id), req.category) : null
    return activeSession
  })
  const setSession = (s: Session | null) => {
    activeSession = s
    setSessionState(s)
  }
  const exam = index.exams.find((e) => e.id === examId)
  if (!exam) return <p>問題データがありません。</p>
  const examQs = questions.filter((q) => q.exam === exam.id)

  if (session) return <SessionView session={session} setSession={setSession} />
  return (
    <Setup
      index={index}
      exam={exam}
      questions={examQs}
      onExamChange={setExamId}
      onStart={(kind, category) => {
        const s = start(kind, exam, examQs, category)
        if (s) setSession(s)
      }}
    />
  )
}

function Setup({
  index,
  exam,
  questions,
  onExamChange,
  onStart,
}: {
  index: QuestionIndex
  exam: ExamQuestionSet
  questions: Question[]
  onExamChange: (id: string) => void
  onStart: (kind: StartKind, category?: string) => void
}) {
  const data = useData()
  const stats = categoryStats(
    data.answers,
    exam.id,
    exam.categories.map((c) => c.name),
  )
  const wrongIds = wrongQuestionIds(data.answers.filter((a) => a.exam === exam.id))
  const wrongQs = questions.filter((q) => wrongIds.has(q.id))
  const mocks = data.mockExams.filter((m) => m.exam === exam.id).slice(-5).reverse()
  // 一度も回答していない問題
  const answeredIds = new Set(data.answers.filter((a) => a.exam === exam.id).map((a) => a.questionId))
  const unansweredQs = questions.filter((q) => !answeredIds.has(q.id))

  return (
    <div className="stack">
      {index.exams.length > 1 && (
        <select className="select" value={exam.id} onChange={(e) => onExamChange(e.target.value)}>
          {index.exams.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
      )}
      <p className="muted small">
        {exam.name}：全{questions.length}問
      </p>

      <div className="mode-grid">
        <button className="mode-btn" onClick={() => onStart('random')}>
          <span className="mode-icon">🎲</span>
          <b>ランダム10問</b>
          <span className="small muted">全分野から</span>
        </button>
        <button
          className="mode-btn"
          onClick={() => onStart('mock')}
        >
          <span className="mode-icon">⏱️</span>
          <b>本番模試</b>
          <span className="small muted">
            {exam.mock.count}問・{exam.mock.minutes}分・合格{Math.round(exam.passRate * 100)}%
          </span>
        </button>
        <button
          className="mode-btn"
          disabled={!wrongQs.length}
          onClick={() => onStart('wrong')}
        >
          <span className="mode-icon">🔁</span>
          <b>間違えた問題</b>
          <span className="small muted">{wrongQs.length}問</span>
        </button>
      </div>

      <UnansweredProgress
        exam={exam}
        questions={questions}
        unanswered={unansweredQs}
        onStart={(category) => onStart('unanswered', category)}
      />

      <section className="card">
        <h2>分野別の正答率と出題</h2>
        <p className="muted small">分野名をタップするとその分野だけを出題します。70%未満の分野は強調表示されます。</p>
        <ul className="cat-list">
          {stats.map((s) => {
            const qs = questions.filter((q) => q.category === s.category)
            const weak = s.rate !== null && s.rate < 0.7
            return (
              <li key={s.category} className={weak ? 'weak' : ''}>
                <button className="cat-btn" disabled={!qs.length} onClick={() => onStart('category', s.category)}>
                  <span className="cat-name">
                    {weak && '⚠️ '}
                    {s.category}
                    <span className="muted small">（{qs.length}問）</span>
                  </span>
                  <span className="cat-rate">
                    {s.rate === null ? '—' : `${Math.round(s.rate * 100)}%`}
                    <span className="muted small"> {s.total ? `${s.correct}/${s.total}` : ''}</span>
                  </span>
                </button>
                <div className="bar" aria-hidden>
                  <div className="bar-fill" style={{ width: `${(s.rate ?? 0) * 100}%` }} />
                  <div className="bar-line" />
                </div>
              </li>
            )
          })}
        </ul>
      </section>

      {mocks.length > 0 && (
        <section className="card">
          <h2>模試の履歴</h2>
          <ul className="menu">
            {mocks.map((m) => (
              <li key={m.at}>
                <span>{new Date(m.at).toLocaleDateString('ja-JP')}</span>
                <span>
                  {m.correct}/{m.total}（{Math.round((m.correct / m.total) * 100)}%）
                  <span className={`pill ${m.passed ? 'ok' : 'ng'}`}>{m.passed ? '合格' : '不合格'}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

function UnansweredProgress({
  exam,
  questions,
  unanswered,
  onStart,
}: {
  exam: ExamQuestionSet
  questions: Question[]
  unanswered: Question[]
  onStart: (category?: string) => void
}) {
  const total = questions.length
  const done = total - unanswered.length
  return (
    <section className="card">
      <h2>未着手の問題</h2>
      <div className="unanswered-head">
        <div>
          <span className="big">{unanswered.length === 0 ? '🎉 0' : `あと${unanswered.length}`}</span>
          <span className="muted small"> 問 ／ 全{total}問</span>
        </div>
        <span className="small muted">着手済み {done}問（{total ? Math.round((done / total) * 100) : 0}%）</span>
      </div>
      <div className="progress" aria-label={`着手済み ${done}/${total}問`}>
        <div className="progress-fill" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
      </div>
      {unanswered.length > 0 ? (
        <button
          className="btn primary block unanswered-start"
          onClick={() => onStart()}
        >
          未着手から10問解く
        </button>
      ) : (
        <p className="small">すべての問題に1回以上回答しました。間違えた問題の復習や本番模試で仕上げましょう。</p>
      )}
      <p className="muted small">分野名をタップすると、その分野の未着手の問題だけを出題します。</p>
      <ul className="cat-list">
        {exam.categories.map((c) => {
          const all = questions.filter((q) => q.category === c.name)
          const rest = unanswered.filter((q) => q.category === c.name)
          return (
            <li key={c.name}>
              <button
                className="cat-btn"
                disabled={!rest.length}
                onClick={() => onStart(c.name)}
              >
                <span className="cat-name">
                  {rest.length === 0 && '✅ '}
                  {c.name}
                </span>
                <span className="cat-rate">
                  {rest.length === 0 ? '完了' : `あと${rest.length}問`}
                  <span className="muted small"> ／{all.length}</span>
                </span>
              </button>
              <div className="bar" aria-hidden>
                <div
                  className="bar-fill done"
                  style={{ width: `${all.length ? ((all.length - rest.length) / all.length) * 100 : 0}%` }}
                />
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function useCountdown(deadline?: number) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    if (!deadline) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [deadline])
  return deadline ? Math.max(0, deadline - now) : null
}

function SessionView({ session, setSession }: { session: Session; setSession: (s: Session | null) => void }) {
  const remaining = useCountdown(session.finished ? undefined : session.deadline)
  // 演習中の時間を学習時間に自動加算する
  const studied = useQuizTimer(!session.finished)
  const { items, current, picks } = session
  const item = items[current]
  const picked = picks[current]

  const finish = () => {
    if (session.mode === 'mock') {
      const correct = items.filter((it, i) => picks[i] === it.q.answer).length
      updateData((d) => ({
        ...d,
        mockExams: [
          ...d.mockExams,
          {
            exam: session.exam.id,
            at: new Date().toISOString(),
            correct,
            total: items.length,
            passed: correct / items.length >= session.exam.passRate,
          },
        ],
      }))
    }
    setSession({ ...session, finished: true })
  }

  useEffect(() => {
    if (remaining === 0 && !session.finished) finish()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining])

  if (session.finished)
    return <ResultView session={session} studiedSec={studied.current} onClose={() => setSession(null)} />

  const choose = (orig: number) => {
    if (picked !== null) return
    const record: AnswerRecord = {
      questionId: item.q.id,
      exam: item.q.exam,
      category: item.q.category,
      correct: orig === item.q.answer,
      at: new Date().toISOString(),
      mode: session.mode,
    }
    updateData((d) => ({ ...d, answers: [...d.answers, record] }))
    setSession({ ...session, picks: picks.map((p, i) => (i === current ? orig : p)) })
  }

  const wrongReasonFor = (orig: number) => {
    const wrongOrder = item.q.options.map((_, i) => i).filter((i) => i !== item.q.answer)
    return item.q.wrongReasons[wrongOrder.indexOf(orig)]
  }

  const isLast = current === items.length - 1
  const answeredCount = picks.filter((p) => p !== null).length

  return (
    <div className="stack">
      <div className="session-head">
        <button className="link" onClick={() => confirm('演習を中断しますか？（回答済みの履歴は保存されます）') && setSession(null)}>
          ← 中断
        </button>
        <span className="muted small">{session.title}</span>
        {remaining !== null && (
          <span className={`timer ${remaining < 10 * 60_000 ? 'urgent' : ''}`}>⏱ {formatMs(remaining)}</span>
        )}
      </div>
      <div className="progress" aria-label={`${current + 1}/${items.length}問目`}>
        <div className="progress-fill" style={{ width: `${((current + 1) / items.length) * 100}%` }} />
      </div>

      <section className="card question">
        <div className="q-meta">
          <span>
            Q{current + 1}/{items.length}
          </span>
          <span className="pill">{item.q.category}</span>
          <span className={`pill diff-${item.q.difficulty}`}>{item.q.difficulty}</span>
        </div>
        <p className="q-text">{item.q.question}</p>
        <ol className="options">
          {item.order.map((orig) => {
            let cls = 'option'
            if (picked !== null) {
              if (orig === item.q.answer) cls += ' correct'
              else if (orig === picked) cls += ' wrong'
              else cls += ' dim'
            }
            return (
              <li key={orig}>
                <button className={cls} onClick={() => choose(orig)} disabled={picked !== null}>
                  {item.q.options[orig]}
                </button>
              </li>
            )
          })}
        </ol>
      </section>

      {picked !== null && (
        <section className={`card feedback ${picked === item.q.answer ? 'ok' : 'ng'}`}>
          <h2>{picked === item.q.answer ? '⭕ 正解' : '❌ 不正解'}</h2>
          <p>
            <b>正解：</b>
            {item.q.options[item.q.answer]}
          </p>
          <p>{item.q.explanation}</p>
          <h3>他の選択肢が違う理由</h3>
          <ul className="reasons">
            {item.order
              .filter((o) => o !== item.q.answer)
              .map((o) => (
                <li key={o} className={o === picked ? 'picked' : ''}>
                  <span className="reason-opt">{item.q.options[o]}</span>
                  <span>→ {wrongReasonFor(o)}</span>
                </li>
              ))}
          </ul>
        </section>
      )}

      <div className="btn-row spread">
        <button
          className="btn"
          disabled={current === 0}
          onClick={() => setSession({ ...session, current: current - 1 })}
        >
          前へ
        </button>
        {isLast ? (
          <button
            className="btn primary"
            onClick={() =>
              (answeredCount === items.length || confirm(`未回答が${items.length - answeredCount}問あります。終了しますか？`)) &&
              finish()
            }
          >
            結果を見る
          </button>
        ) : (
          <button className="btn primary" onClick={() => setSession({ ...session, current: current + 1 })}>
            次へ
          </button>
        )}
      </div>
    </div>
  )
}

function ResultView({ session, studiedSec, onClose }: { session: Session; studiedSec: number; onClose: () => void }) {
  const { items, picks, exam } = session
  const correct = items.filter((it, i) => picks[i] === it.q.answer).length
  const rate = items.length ? correct / items.length : 0
  const byCat = useMemo(() => {
    const m = new Map<string, { c: number; t: number }>()
    items.forEach((it, i) => {
      const v = m.get(it.q.category) ?? { c: 0, t: 0 }
      v.t++
      if (picks[i] === it.q.answer) v.c++
      m.set(it.q.category, v)
    })
    return [...m]
  }, [items, picks])
  const wrongs = items.filter((it, i) => picks[i] !== it.q.answer)

  return (
    <div className="stack">
      <section className="card result">
        <p className="muted">{session.title}</p>
        <div className="big">
          {correct} / {items.length}
        </div>
        <div className="sub">正答率 {Math.round(rate * 100)}%</div>
        <p className="small muted">⏱ 今回の演習時間 {formatMinutes(Math.max(1, Math.round(studiedSec / 60)))}（学習時間に自動で記録しました）</p>
        {session.mode === 'mock' && (
          <p className={`verdict ${rate >= exam.passRate ? 'ok' : 'ng'}`}>
            {rate >= exam.passRate ? '🎉 合格ライン到達' : `合格ライン（${Math.round(exam.passRate * 100)}%）まであと少し`}
          </p>
        )}
      </section>
      <section className="card">
        <h2>分野別</h2>
        <ul className="menu">
          {byCat.map(([cat, v]) => (
            <li key={cat} className={v.c / v.t < 0.7 ? 'weak-row' : ''}>
              <span>{cat}</span>
              <span>
                {v.c}/{v.t}
              </span>
            </li>
          ))}
        </ul>
      </section>
      {wrongs.length > 0 && (
        <section className="card">
          <h2>間違えた・未回答の問題</h2>
          <ul className="wrong-list">
            {wrongs.map((it) => (
              <li key={it.q.id}>
                <p>{it.q.question}</p>
                <p className="small">
                  <b>正解：</b>
                  {it.q.options[it.q.answer]}
                </p>
                <p className="small muted">{it.q.explanation}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
      <button className="btn primary block" onClick={onClose}>
        演習メニューに戻る
      </button>
    </div>
  )
}

function formatMs(ms: number) {
  const s = Math.ceil(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
