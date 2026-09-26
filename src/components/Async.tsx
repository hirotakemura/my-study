import type { ReactNode } from 'react'
import type { Loadable } from '../lib/content'

export function Async<T>({ state, children }: { state: Loadable<T>; children: (v: T) => ReactNode }) {
  if (state.status === 'loading') return <p className="muted">読み込み中…</p>
  if (state.status === 'error') return <p className="error">データの読み込みに失敗しました：{state.error}</p>
  return <>{children(state.value)}</>
}
