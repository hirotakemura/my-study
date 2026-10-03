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

/** 以前このアプリにあったTOEIC機能のデータ項目（別アプリに移したため読み込み時に削除する） */
const LEGACY_TOEIC_KEYS = ['minimumDone', 'toeicChecks', 'toeicScores'] as const

/** 古い/一部欠けたデータでも読めるよう、既定値とマージする */
function normalize(raw: unknown): AppData {
  const base = emptyData()
  if (!raw || typeof raw !== 'object') return base
  const r = { ...(raw as Record<string, unknown>) }
  for (const k of LEGACY_TOEIC_KEYS) delete r[k]
  const d = r as Partial<AppData>
  return {
    ...base,
    ...d,
    // 旧TOEICの学習時間（subject: 'english'）も削除する
    studyLogs: (d.studyLogs ?? []).filter((l) => l.subject === 'outsystems'),
    version: 1,
    settings: { ...base.settings, ...(d.settings ?? {}) },
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

// 旧TOEICデータなどを取り除いた内容を、起動時に端末へ書き戻す
try {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored && stored !== JSON.stringify(state)) persist()
} catch {
  // 読み書きできない環境では何もしない
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
    throw new Error('このファイルは Presta for OutSystems のバックアップではありません')
  }
  updateData(() => normalize(data))
}

export function resetData(): void {
  updateData(() => emptyData())
}

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}
