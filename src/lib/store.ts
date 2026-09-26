import { useSyncExternalStore } from 'react'
import type { AppData } from '../types'

const STORAGE_KEY = 'my-study:data:v1'

export function emptyData(): AppData {
  return {
    version: 1,
    studyLogs: [],
    minimumDone: {},
    answers: [],
    mockExams: [],
    examResults: {},
    toeicChecks: {},
    toeicScores: [],
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

export function resetData(): void {
  updateData(() => emptyData())
}

export function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}
