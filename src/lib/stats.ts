import type { AnswerRecord, AppData, OsExamSchedule, Question, RoadmapPhase, Subject, ToeicRoadmap } from '../types'
import { addDays, diffDays, weekStart } from './date'

export function minutesOn(data: AppData, date: string, subject?: Subject): number {
  return data.studyLogs
    .filter((l) => l.date === date && (!subject || l.subject === subject))
    .reduce((s, l) => s + l.minutes, 0)
}

export function minutesBetween(data: AppData, from: string, to: string, subject?: Subject): number {
  return data.studyLogs
    .filter((l) => l.date >= from && l.date <= to && (!subject || l.subject === subject))
    .reduce((s, l) => s + l.minutes, 0)
}

export function studiedOn(data: AppData, date: string): boolean {
  return minutesOn(data, date) > 0 || !!data.minimumDone[date]
}

/** 連続学習日数。今日まだ未学習なら昨日から数える（今日の途中で途切れた扱いにしない） */
export function streak(data: AppData, today: string): number {
  let day = studiedOn(data, today) ? today : addDays(today, -1)
  let count = 0
  while (studiedOn(data, day)) {
    count++
    day = addDays(day, -1)
  }
  return count
}

export function weekRange(today: string): { from: string; to: string } {
  const from = weekStart(today)
  return { from, to: addDays(from, 6) }
}

// ===== TOEIC ロードマップ =====

export type PhaseInfo =
  | { kind: 'before'; next: RoadmapPhase; daysUntil: number }
  | { kind: 'in'; phase: RoadmapPhase }
  | { kind: 'examDay' }
  | { kind: 'after' }

export function currentPhase(roadmap: ToeicRoadmap, today: string): PhaseInfo {
  if (today === roadmap.exam.date) return { kind: 'examDay' }
  if (today > roadmap.exam.date) return { kind: 'after' }
  const phase = roadmap.phases.find((p) => today >= p.start && today <= p.end)
  if (phase) return { kind: 'in', phase }
  const next = roadmap.phases.find((p) => p.start > today)
  if (next) return { kind: 'before', next, daysUntil: diffDays(today, next.start) }
  return { kind: 'after' }
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
