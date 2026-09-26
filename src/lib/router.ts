import { useSyncExternalStore } from 'react'

// ハッシュベースの簡易ルーター（GitHub Pages でもリロードで404にならない）
export type Route = 'home' | 'quiz' | 'exams' | 'toeic' | 'review' | 'settings'
const ROUTES: Route[] = ['home', 'quiz', 'exams', 'toeic', 'review', 'settings']

function read(): Route {
  const r = window.location.hash.replace(/^#\/?/, '') as Route
  return ROUTES.includes(r) ? r : 'home'
}

function subscribe(cb: () => void) {
  window.addEventListener('hashchange', cb)
  return () => window.removeEventListener('hashchange', cb)
}

export function useRoute(): Route {
  return useSyncExternalStore(subscribe, read)
}

export function navigate(route: Route) {
  window.location.hash = `/${route === 'home' ? '' : route}`
  window.scrollTo(0, 0)
}
