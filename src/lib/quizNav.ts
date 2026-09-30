import type { AnswerRecord, ExamQuestionSet, Question, QuizMode } from '../types'
import { navigate } from './router'
import { categoryStats, pickWeighted, shuffle, wrongQuestionIds } from './stats'

// ホームなど他の画面から、演習を直接開始するための受け渡し
export type StartKind = 'random' | 'mock' | 'wrong' | 'unanswered' | 'weak' | 'category'

export interface StartRequest {
  exam: string
  kind: StartKind
  category?: string
}

let pending: StartRequest | null = null
let preferredExam: string | null = null

export function requestQuizStart(req: StartRequest) {
  pending = req
  preferredExam = req.exam
  navigate('quiz')
}

export function openQuizFor(exam: string) {
  preferredExam = exam
  navigate('quiz')
}

export function takePendingStart(): StartRequest | null {
  const p = pending
  pending = null
  return p
}

export function getPreferredExam(): string | null {
  return preferredExam
}

/** 出題モードに応じて問題を選ぶ。出題できる問題がなければ null */
export function buildQuiz(
  kind: StartKind,
  exam: ExamQuestionSet,
  questions: Question[],
  answers: AnswerRecord[],
  category?: string,
): { mode: QuizMode; title: string; qs: Question[] } | null {
  const examAnswers = answers.filter((a) => a.exam === exam.id)
  let result: { mode: QuizMode; title: string; qs: Question[] }
  switch (kind) {
    case 'random':
      result = { mode: 'random', title: '全分野ランダム10問', qs: shuffle(questions).slice(0, 10) }
      break
    case 'mock':
      result = {
        mode: 'mock',
        title: '本番模試',
        qs: pickWeighted(
          questions,
          exam.categories.map((c) => ({ name: c.name, weight: c.weight })),
          exam.mock.count,
        ),
      }
      break
    case 'wrong': {
      const ids = wrongQuestionIds(examAnswers)
      result = { mode: 'wrong', title: '間違えた問題の復習', qs: shuffle(questions.filter((q) => ids.has(q.id))) }
      break
    }
    case 'unanswered': {
      const answered = new Set(examAnswers.map((a) => a.questionId))
      const rest = questions.filter((q) => !answered.has(q.id) && (!category || q.category === category))
      result = {
        mode: 'unanswered',
        title: category ? `未着手：${category}` : '未着手の問題',
        qs: category ? shuffle(rest) : shuffle(rest).slice(0, 10),
      }
      break
    }
    case 'weak': {
      // 正答率が合格ライン未満の分野のうち、最も低い分野から10問
      const weak = categoryStats(examAnswers, exam.id, exam.categories.map((c) => c.name))
        .filter((s) => s.rate !== null && s.total >= 3 && s.rate < exam.passRate)
        .sort((a, b) => (a.rate ?? 0) - (b.rate ?? 0))[0]
      const cat = category ?? weak?.category
      if (!cat) return null
      result = { mode: 'weak', title: `苦手分野：${cat}`, qs: shuffle(questions.filter((q) => q.category === cat)).slice(0, 10) }
      break
    }
    case 'category':
      result = { mode: 'category', title: category ?? '', qs: shuffle(questions.filter((q) => q.category === category)) }
      break
  }
  return result.qs.length ? result : null
}
