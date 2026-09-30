import { useSyncExternalStore } from 'react'
import type { AppData } from '../types'

const STORAGE_KEY = 'my-study:data:v1'

export function emptyData(): AppData {
  return {
    version: 1,
    studyLogs: [],
    quizSeconds: {},
    answers: [],
    mockExams: [],
    examResults: {},
    reviewMemos: {},
    settings: { theme: 'system' },
  }
}

/** 古い/一部欠けたデータでも読めるよう、既定値とマージする */
function normalize(raw: unknown): AppData {
  const base = emptyData()
  if (!raw || typeof raw !== 'object') return base
  const r = raw as Partial<AppData>
  return {
    ...base,
    ...r,
    version: 1,
    settings: { ...base.settings, ...(r.settings ?? {}) },
  }
}

function load(): AppData {
  try {
    const text = localStorage.getItem(STORAGE_KEY)
    return text ? normalize(JSON.parse(text)) : emptyData()
  } catch {
    return emptyData()
  }
}

let state: AppData = load()
const listeners = new Set<() => void>()

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (e) {
    console.error('保存に失敗しました', e)
  }
}

export function getData(): AppData {
  return state
}

export function updateData(fn: (draft: AppData) => AppData): void {
  state = fn(state)
  persist()
  listeners.forEach((l) => l())
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

export function useData(): AppData {
  return useSyncExternalStore(subscribe, getData)
}

// ===== バックアップ =====

export function exportJson(): string {
  return JSON.stringify({ app: 'my-study', exportedAt: new Date().toISOString(), data: state }, null, 2)
}

export function importJson(text: string): void {
  const parsed = JSON.parse(text)
  const data = parsed && typeof parsed === 'object' && 'data' in parsed ? parsed.data : parsed
  if (!data || typeof data !== 'object' || !Array.isArray(data.studyLogs)) {
    throw new Error('このファイルは学習管理アプリのバックアップではありません')
  }
  updateData(() => normalize(data))
}

// ===== 旧TOEIC機能のデータ（別アプリへの移行用） =====

export function hasToeicData(d: AppData): boolean {
  return (
    d.studyLogs.some((l) => l.subject === 'english') ||
    Object.keys(d.minimumDone ?? {}).length > 0 ||
    Object.keys(d.toeicChecks ?? {}).length > 0 ||
    (d.toeicScores ?? []).length > 0
  )
}

/** TOEICアプリ（docs/TOEIC_APP_PROMPT.md）が読み込む形式で書き出す */
export function exportToeicJson(): string {
  const d = state
  return JSON.stringify(
    {
      app: 'my-study-toeic-export',
      version: 1,
      exportedAt: new Date().toISOString(),
      studyLogs: d.studyLogs
        .filter((l) => l.subject === 'english')
        .map(({ id, date, minutes, createdAt }) => ({ id, date, minutes, createdAt })),
      minimumDone: d.minimumDone ?? {},
      toeicChecks: d.toeicChecks ?? {},
      toeicScores: d.toeicScores ?? [],
      reviewMemos: d.reviewMemos,
    },
    null,
    2,
  )
}

export function deleteToeicData(): void {
  updateData((d) => {
    const next: AppData = { ...d, studyLogs: d.studyLogs.filter((l) => l.subject !== 'english') }
    delete next.minimumDone
    delete next.toeicChecks
    delete next.toeicScores
    return next
  })
}

export function resetData(): void {
  updateData(() => emptyData())
}

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}
