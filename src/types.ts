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
export type Subject = 'outsystems'

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

/** 予約が確定した受験日時（予定日より優先される） */
export interface ExamBooking {
  date: string
  /** 開始時刻 HH:mm */
  time?: string
  /** 会場・受験方法など */
  place?: string
}

export interface ExamResult {
  status: ExamStatus
  retakeDate?: string
  booking?: ExamBooking
  history: { date: string; status: ExamStatus }[]
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
}
