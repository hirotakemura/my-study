import { useEffect, useState } from 'react'
import type { ExamQuestionSet, OsExamSchedule, Question, QuestionIndex, ToeicRoadmap } from '../types'

// 問題データ・計画データはアプリ本体と分離して public/data 配下の JSON から読み込む
const BASE = `${import.meta.env.BASE_URL}data/`

const cache = new Map<string, Promise<unknown>>()

function fetchJson<T>(path: string): Promise<T> {
  let p = cache.get(path)
  if (!p) {
    p = fetch(BASE + path).then((res) => {
      if (!res.ok) throw new Error(`${path} の読み込みに失敗しました (${res.status})`)
      return res.json()
    })
    p.catch(() => cache.delete(path))
    cache.set(path, p)
  }
  return p as Promise<T>
}

export const loadQuestionIndex = () => fetchJson<QuestionIndex>('questions/index.json')
export const loadOsSchedule = () => fetchJson<OsExamSchedule>('plan/outsystems-exams.json')
export const loadToeicRoadmap = () => fetchJson<ToeicRoadmap>('plan/toeic-roadmap.json')

export async function loadQuestions(exam: ExamQuestionSet): Promise<Question[]> {
  const lists = await Promise.all(exam.categories.map((c) => fetchJson<Question[]>(`questions/${c.file}`)))
  return lists.flat().filter((q) => q.exam === exam.id)
}

export async function loadAllQuestions(): Promise<{ index: QuestionIndex; questions: Question[] }> {
  const index = await loadQuestionIndex()
  const lists = await Promise.all(index.exams.map(loadQuestions))
  return { index, questions: lists.flat() }
}

export type Loadable<T> = { status: 'loading' } | { status: 'error'; error: string } | { status: 'ok'; value: T }

export function useLoad<T>(loader: () => Promise<T>): Loadable<T> {
  const [state, setState] = useState<Loadable<T>>({ status: 'loading' })
  useEffect(() => {
    let alive = true
    loader().then(
      (value) => alive && setState({ status: 'ok', value }),
      (e: unknown) => alive && setState({ status: 'error', error: e instanceof Error ? e.message : String(e) }),
    )
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return state
}
