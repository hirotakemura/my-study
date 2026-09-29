// ===== 問題データ（public/data/questions 配下のJSON） =====
export type Difficulty = '基礎' | '標準' | '応用'

export interface Question {
  id: string
  exam: string
  category: string
  difficulty: Difficulty
  question: string
  options: string[]
  answer: number
  explanation: string
  /** 正解以外の選択肢について、options の並び順どおりの理由 */
  wrongReasons: string[]
}

export interface QuestionCategoryMeta {
  name: string
  /** 本番の出題比率（模試での配分に使う） */
  weight: number
  file: string
}

export interface ExamQuestionSet {
  id: string
  name: string
  passRate: number
  mock: { count: number; minutes: number }
  categories: QuestionCategoryMeta[]
}

export interface QuestionIndex {
  exams: ExamQuestionSet[]
}

// ===== 計画データ（public/data/plan 配下のJSON） =====
export interface OsExamPlan {
  id: string
  name: string
  date: string
}

export interface OsExamSchedule {
  exams: OsExamPlan[]
  reserveSlots: string[]
  goal: { name: string; description: string }
}

export interface RoadmapTask {
  id: string
  text: string
}

export interface CommuteItem {
  label: string
  minutes: number
}

export interface RoadmapPhase {
  id: string
  title: string
  start: string
  end: string
  summary: string
  commute: CommuteItem[]
  tasks: RoadmapTask[]
  notes?: string[]
}

export interface ToeicRoadmap {
  baseline: { total: number; listening: number; reading: number; label: string }
  exam: { date: string; target: number; name: string }
  longTermGoal: { score: number; label: string }
  minimumLine: { label: string; minutes: number }
  focus: string
  phases: RoadmapPhase[]
}

// ===== ユーザーデータ（localStorage） =====
export type Subject = 'english' | 'outsystems'

export interface StudyLog {
  id: string
  date: string // YYYY-MM-DD
  subject: Subject
  minutes: number
  createdAt: string
}

export interface AnswerRecord {
  questionId: string
  exam: string
  category: string
  correct: boolean
  at: string // ISO
  mode: QuizMode
}

export type QuizMode = 'category' | 'random' | 'mock' | 'wrong' | 'unanswered'

export type ExamStatus = 'untaken' | 'passed' | 'failed'

export interface ExamResult {
  status: ExamStatus
  retakeDate?: string
  history: { date: string; status: ExamStatus }[]
}

export interface MockScore {
  id: string
  date: string
  listening: number
  reading: number
  note?: string
}

export interface MockExamRecord {
  exam: string
  at: string
  correct: number
  total: number
  passed: boolean
}

export type ThemeSetting = 'system' | 'light' | 'dark'

export interface AppData {
  version: 1
  studyLogs: StudyLog[]
  minimumDone: Record<string, boolean>
  answers: AnswerRecord[]
  mockExams: MockExamRecord[]
  examResults: Record<string, ExamResult>
  toeicChecks: Record<string, boolean>
  toeicScores: MockScore[]
  reviewMemos: Record<string, string>
  lastReviewShown?: string
  settings: { theme: ThemeSetting }
}
