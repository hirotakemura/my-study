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

// ===== ユーザーデータ（localStorage） =====
/** english は旧TOEIC機能の記録（移行用に保持するだけで集計には使わない） */
export type Subject = 'english' | 'outsystems'

/** 手動で記録した学習時間（問題演習以外の学習） */
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

export type QuizMode = 'category' | 'random' | 'mock' | 'wrong' | 'unanswered' | 'weak'

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
  /** 問題演習で自動計測した学習時間（日付ごとの秒数） */
  quizSeconds: Record<string, number>
  answers: AnswerRecord[]
  mockExams: MockExamRecord[]
  examResults: Record<string, ExamResult>
  reviewMemos: Record<string, string>
  lastReviewShown?: string
  settings: { theme: ThemeSetting }
  // ---- 旧TOEIC機能のデータ（別アプリへの移行用に残す） ----
  minimumDone?: Record<string, boolean>
  toeicChecks?: Record<string, boolean>
  toeicScores?: MockScore[]
}
