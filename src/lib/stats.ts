import type { AnswerRecord, AppData, OsExamSchedule, Question, QuestionIndex } from '../types'
import { addDays, toKey, weekStart } from './date'

// ===== 学習時間 =====
// 学習時間 = 問題演習で自動計測した時間 + 手動で記録した時間（OutSystemsのみ。旧TOEICの記録は含めない）

export function quizMinutesOn(data: AppData, date: string): number {
  return Math.round((data.quizSeconds[date] ?? 0) / 60)
}

export function manualMinutesOn(data: AppData, date: string): number {
  return data.studyLogs
    .filter((l) => l.date === date && l.subject === 'outsystems')
    .reduce((s, l) => s + l.minutes, 0)
}

export function minutesOn(data: AppData, date: string): number {
  return quizMinutesOn(data, date) + manualMinutesOn(data, date)
}

export function daysBetween(from: string, to: string): string[] {
  const days: string[] = []
  for (let d = from; d <= to; d = addDays(d, 1)) days.push(d)
  return days
}

export function minutesBetween(data: AppData, from: string, to: string, kind?: 'quiz' | 'manual'): number {
  return daysBetween(from, to).reduce(
    (s, d) => s + (kind === 'quiz' ? quizMinutesOn(data, d) : kind === 'manual' ? manualMinutesOn(data, d) : minutesOn(data, d)),
    0,
  )
}

/** 回答日時(ISO)を端末ローカルの日付キーに変換 */
export const answerDate = (a: AnswerRecord) => toKey(new Date(a.at))

/** 学習した日：学習時間があるか、1問でも回答した日 */
function studiedDays(data: AppData): Set<string> {
  const days = new Set(data.answers.map(answerDate))
  for (const [d, sec] of Object.entries(data.quizSeconds)) if (sec >= 30) days.add(d)
  for (const l of data.studyLogs) if (l.subject === 'outsystems' && l.minutes > 0) days.add(l.date)
  return days
}

/** 連続学習日数。今日まだ未学習なら昨日から数える（今日の途中で途切れた扱いにしない） */
export function streak(data: AppData, today: string): number {
  const days = studiedDays(data)
  let day = days.has(today) ? today : addDays(today, -1)
  let count = 0
  while (days.has(day)) {
    count++
    day = addDays(day, -1)
  }
  return count
}

export function weekRange(today: string): { from: string; to: string } {
  const from = weekStart(today)
  return { from, to: addDays(from, 6) }
}

// ===== OutSystems 受験スケジュール =====

export interface ScheduledExam {
  id: string
  name: string
  /** 再受験日が決まっていればそちら */
  date: string
  originalDate: string
  status: 'untaken' | 'passed' | 'failed'
}

export function scheduledExams(schedule: OsExamSchedule, data: AppData): ScheduledExam[] {
  return schedule.exams.map((e) => {
    const r = data.examResults[e.id]
    return {
      id: e.id,
      name: e.name,
      originalDate: e.date,
      date: r?.retakeDate ?? e.date,
      status: r?.status ?? 'untaken',
    }
  })
}

export function nextOsExam(schedule: OsExamSchedule, data: AppData, today: string): ScheduledExam | undefined {
  return scheduledExams(schedule, data)
    .filter((e) => e.status !== 'passed' && e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))[0]
}

/** 不合格時の再受験候補：1週間後の予備枠（なければそれ以降で最も近い空き予備枠） */
export function suggestRetake(schedule: OsExamSchedule, data: AppData, examId: string, failedOn: string): string | undefined {
  const taken = new Set(
    Object.entries(data.examResults)
      .filter(([id, r]) => id !== examId && r.retakeDate)
      .map(([, r]) => r.retakeDate as string),
  )
  const oneWeek = addDays(failedOn, 7)
  const slots = [...schedule.reserveSlots].sort()
  if (slots.includes(oneWeek) && !taken.has(oneWeek)) return oneWeek
  return slots.find((s) => s > failedOn && !taken.has(s))
}

// ===== 問題演習の集計 =====

export interface CategoryStat {
  category: string
  total: number
  correct: number
  rate: number | null
}

export function categoryStats(answers: AnswerRecord[], exam: string, categories: string[]): CategoryStat[] {
  return categories.map((category) => {
    const list = answers.filter((a) => a.exam === exam && a.category === category)
    const correct = list.filter((a) => a.correct).length
    return { category, total: list.length, correct, rate: list.length ? correct / list.length : null }
  })
}

/** 各問題の最新の回答が不正解のもの */
export function wrongQuestionIds(answers: AnswerRecord[]): Set<string> {
  const latest = new Map<string, boolean>()
  for (const a of answers) latest.set(a.questionId, a.correct)
  return new Set([...latest].filter(([, ok]) => !ok).map(([id]) => id))
}

export function shuffle<T>(list: T[]): T[] {
  const a = [...list]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** 出題比率に合わせて count 問を選ぶ（最大剰余法） */
export function pickWeighted(questions: Question[], weights: { name: string; weight: number }[], count: number): Question[] {
  const totalW = weights.reduce((s, w) => s + w.weight, 0)
  const quotas = weights.map((w) => {
    const exact = (w.weight / totalW) * count
    return { name: w.name, n: Math.floor(exact), frac: exact - Math.floor(exact) }
  })
  let rest = count - quotas.reduce((s, q) => s + q.n, 0)
  for (const q of [...quotas].sort((a, b) => b.frac - a.frac)) {
    if (rest <= 0) break
    q.n++
    rest--
  }
  const picked = quotas.flatMap((q) => shuffle(questions.filter((x) => x.category === q.name)).slice(0, q.n))
  return shuffle(picked)
}

// ===== 試験ごとの準備状況 =====

export interface Readiness {
  total: number
  answered: number
  rate: number | null
  wrong: number
  weakest?: { category: string; rate: number }
  lastMock?: { correct: number; total: number; passed: boolean }
}

export function readiness(data: AppData, index: QuestionIndex, questions: Question[], examId: string): Readiness | null {
  const exam = index.exams.find((e) => e.id === examId)
  if (!exam) return null
  const qs = questions.filter((q) => q.exam === examId)
  const answers = data.answers.filter((a) => a.exam === examId)
  const answered = new Set(answers.map((a) => a.questionId))
  const correct = answers.filter((a) => a.correct).length
  const stats = categoryStats(answers, examId, exam.categories.map((c) => c.name))
    .filter((s) => s.rate !== null && s.total >= 3 && s.rate < exam.passRate)
    .sort((a, b) => (a.rate ?? 0) - (b.rate ?? 0))
  const mocks = data.mockExams.filter((m) => m.exam === examId)
  const wrongIds = wrongQuestionIds(answers)
  return {
    total: qs.length,
    answered: qs.filter((q) => answered.has(q.id)).length,
    rate: answers.length ? correct / answers.length : null,
    wrong: qs.filter((q) => wrongIds.has(q.id)).length,
    weakest: stats[0] ? { category: stats[0].category, rate: stats[0].rate ?? 0 } : undefined,
    lastMock: mocks[mocks.length - 1],
  }
}
